import { config } from '../../config.js';
import { decrypt } from '../../lib/crypto.js';
import {
  fetchFields,
  findStoryPointsFields,
  findSprintField,
  fetchProjects,
  fetchBoards,
  fetchBoardSprints,
  searchIssues,
} from '../../routes/jira/jira.client.js';
import {
  sequelize,
  JiraCredential,
  JiraInstance,
  JiraProject,
  JiraSprint,
  JiraIssue,
  CredentialJiraProject,
  SyncJob,
} from '../../db/models/index.js';

const LOCK_TIMEOUT_MINUTES = 30;

/**
 * Map a Jira status category key to our enum value.
 */
function mapStatusCategory(categoryKey) {
  const map = {
    new: 'new',
    undefined: 'new',
    indeterminate: 'indeterminate',
    done: 'done',
  };
  return map[categoryKey] || 'indeterminate';
}

/**
 * Try to acquire sync lock on a project. Returns true if lock acquired.
 */
async function acquireProjectLock(projectId, credentialId) {
  const cutoff = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000);
  const [, rowCount] = await sequelize.query(
    `UPDATE jira_projects
     SET "syncLockedBy" = :credentialId, "syncLockedAt" = NOW()
     WHERE id = :projectId
       AND ("syncLockedBy" IS NULL OR "syncLockedAt" < :cutoff)`,
    {
      replacements: { credentialId, projectId, cutoff },
      type: sequelize.QueryTypes.UPDATE,
    },
  );
  return rowCount > 0;
}

/**
 * Release sync lock on a project.
 */
async function releaseProjectLock(projectId, credentialId) {
  await sequelize.query(
    `UPDATE jira_projects
     SET "syncLockedBy" = NULL, "syncLockedAt" = NULL
     WHERE id = :projectId AND "syncLockedBy" = :credentialId`,
    {
      replacements: { projectId, credentialId },
      type: sequelize.QueryTypes.UPDATE,
    },
  );
}

/**
 * Process a single Jira sync job.
 */
async function processJiraSync(job) {
  const { credentialId, syncJobId } = job.data;

  // 1. Get or create SyncJob record
  let syncJob;
  if (syncJobId) {
    syncJob = await SyncJob.findByPk(syncJobId);
  }
  if (!syncJob) {
    syncJob = await SyncJob.create({
      type: 'jira',
      status: 'running',
      triggeredBy: syncJobId ? 'manual' : 'scheduled',
      jiraCredentialId: credentialId,
      startedAt: new Date(),
    });
  } else {
    await syncJob.update({ status: 'running', startedAt: new Date() });
  }

  // 2. Get credential and decrypt token
  const credential = await JiraCredential.findByPk(credentialId);
  if (!credential || !credential.isActive) {
    await syncJob.update({
      status: 'failed',
      error: 'Credential not found or inactive',
      completedAt: new Date(),
    });
    throw new Error('Jira credential not found or inactive');
  }

  const decryptedToken = decrypt(credential.apiToken);
  const { domain, email } = credential;

  let processedItems = 0;

  try {
    // 3. findOrCreate JiraInstance by domain
    const [jiraInstance] = await JiraInstance.findOrCreate({
      where: { domain },
      defaults: { domain },
    });

    // 4. Discover custom fields
    const allFields = await fetchFields(domain, email, decryptedToken);
    const storyPointsFieldIds = findStoryPointsFields(allFields).map((f) => f.id);

    let sprintFieldId = credential.sprintFieldId;
    if (!sprintFieldId) {
      const spField = findSprintField(allFields);
      if (spField) sprintFieldId = spField.id;
      await credential.update({ sprintFieldId });
    }

    // 5. Fetch all projects
    const projects = await fetchProjects(domain, email, decryptedToken);

    for (const proj of projects) {
      // 5a. Upsert JiraProject globally (by instanceId + jiraProjectId)
      const [jiraProject] = await JiraProject.findOrCreate({
        where: { instanceId: jiraInstance.id, jiraProjectId: String(proj.id) },
        defaults: {
          instanceId: jiraInstance.id,
          jiraProjectId: String(proj.id),
          key: proj.key,
          name: proj.name,
          avatarUrl: proj.avatarUrls?.['48x48'] || null,
        },
      });
      await jiraProject.update({
        key: proj.key,
        name: proj.name,
        avatarUrl: proj.avatarUrls?.['48x48'] || null,
      });

      // 5b. Create junction entry (credential <-> project)
      await CredentialJiraProject.findOrCreate({
        where: { credentialId, projectId: jiraProject.id },
        defaults: { credentialId, projectId: jiraProject.id },
      });

      // 5c. Try to acquire sync lock — if another credential is syncing this project, skip
      const lockAcquired = await acquireProjectLock(jiraProject.id, credentialId);
      if (!lockAcquired) {
        console.log(`[jira-worker] Project ${proj.key} is being synced by another credential, skipping`);
        continue;
      }

      try {
        // 5d. Fetch all sprints via Agile API (boards -> sprints)
        try {
          const boards = await fetchBoards(domain, email, decryptedToken, proj.key);
          const scrumBoards = boards.filter((b) => b.type === 'scrum');
          for (const board of scrumBoards) {
            try {
              const sprints = await fetchBoardSprints(domain, email, decryptedToken, board.id);
              for (const sprint of sprints) {
                const [sprintRecord] = await JiraSprint.findOrCreate({
                  where: {
                    projectId: jiraProject.id,
                    jiraSprintId: sprint.id,
                  },
                  defaults: {
                    projectId: jiraProject.id,
                    jiraSprintId: sprint.id,
                    name: sprint.name || `Sprint ${sprint.id}`,
                    state: sprint.state || null,
                    startDate: sprint.startDate || null,
                    endDate: sprint.endDate || null,
                  },
                });
                await sprintRecord.update({
                  name: sprint.name || sprintRecord.name,
                  state: sprint.state || sprintRecord.state,
                  startDate: sprint.startDate || sprintRecord.startDate,
                  endDate: sprint.endDate || sprintRecord.endDate,
                });
              }
            } catch (sprintErr) {
              console.warn(
                `[jira-worker] Could not fetch sprints for board ${board.id} (${proj.key}):`,
                sprintErr.message,
              );
            }
          }
        } catch (boardErr) {
          console.warn(
            `[jira-worker] Could not fetch boards for ${proj.key}:`,
            boardErr.message,
          );
        }

        // 5e. Build JQL — only apply date filter if we've synced before
        let jql = `project = "${proj.key}"`;
        if (credential.lastSyncedAt) {
          const lastSync = credential.lastSyncedAt.toISOString().split('T')[0];
          jql += ` AND updated >= "${lastSync}"`;
        }

        // 5f. Build field list for the search
        const fieldList = [
          'summary',
          'issuetype',
          'status',
          'priority',
          'assignee',
          'reporter',
          'created',
          'updated',
          'resolutiondate',
          ...storyPointsFieldIds,
        ];
        if (sprintFieldId) {
          fieldList.push(sprintFieldId);
        }

        // 5g. Paginated issue search
        let startAt = 0;
        const maxResults = 100;
        let total = 0;

        do {
          const result = await searchIssues(
            domain,
            email,
            decryptedToken,
            jql,
            startAt,
            maxResults,
            fieldList,
          );
          total = result.total;

          for (const issue of result.issues) {
            const fields = issue.fields || {};

            // Upsert sprint if present
            let sprintDbId = null;
            const sprintRaw = sprintFieldId ? fields[sprintFieldId] : null;
            const sprintData = Array.isArray(sprintRaw) ? sprintRaw[sprintRaw.length - 1] : sprintRaw;
            if (sprintData && sprintData.id) {
              const [sprintRecord] = await JiraSprint.findOrCreate({
                where: {
                  projectId: jiraProject.id,
                  jiraSprintId: sprintData.id,
                },
                defaults: {
                  projectId: jiraProject.id,
                  jiraSprintId: sprintData.id,
                  name: sprintData.name || `Sprint ${sprintData.id}`,
                  state: sprintData.state || null,
                  startDate: sprintData.startDate || null,
                  endDate: sprintData.endDate || null,
                },
              });
              await sprintRecord.update({
                name: sprintData.name || sprintRecord.name,
                state: sprintData.state || sprintRecord.state,
                startDate: sprintData.startDate || sprintRecord.startDate,
                endDate: sprintData.endDate || sprintRecord.endDate,
              });
              sprintDbId = sprintRecord.id;
            }

            // Upsert JiraIssue
            const statusCat = fields.status?.statusCategory?.key;
            let storyPoints = null;
            for (const spFieldId of storyPointsFieldIds) {
              if (fields[spFieldId] != null) {
                storyPoints = fields[spFieldId];
                break;
              }
            }

            const issueData = {
              projectId: jiraProject.id,
              sprintId: sprintDbId,
              jiraIssueId: issue.id,
              key: issue.key,
              summary: fields.summary || null,
              issueType: fields.issuetype?.name || null,
              status: fields.status?.name || null,
              statusCategory: statusCat ? mapStatusCategory(statusCat) : null,
              priority: fields.priority?.name || null,
              storyPoints: storyPoints != null ? Number(storyPoints) : null,
              assigneeName: fields.assignee?.displayName || null,
              assigneeAccountId: fields.assignee?.accountId || null,
              assigneeAvatar: fields.assignee?.avatarUrls?.['48x48'] || null,
              reporterName: fields.reporter?.displayName || null,
              createdDate: fields.created || null,
              updatedDate: fields.updated || null,
              resolvedDate: fields.resolutiondate || null,
            };

            const [issueRecord, created] = await JiraIssue.findOrCreate({
              where: {
                projectId: jiraProject.id,
                jiraIssueId: issue.id,
              },
              defaults: issueData,
            });
            if (!created) {
              await issueRecord.update(issueData);
            }

            processedItems++;
          }

          startAt += maxResults;
        } while (startAt < total);
      } finally {
        // Always release the lock
        await releaseProjectLock(jiraProject.id, credentialId);
      }
    }

    // 6. Mark complete and record last sync time
    await syncJob.update({
      status: 'completed',
      completedAt: new Date(),
      processedItems,
    });
    await credential.update({ lastSyncedAt: new Date() });
  } catch (err) {
    // 7. Sanitize error — never include tokens
    const sanitized = (err.message || String(err))
      .replace(decryptedToken, '[REDACTED]')
      .replace(credential.apiToken, '[REDACTED]');

    await syncJob.update({
      status: 'failed',
      completedAt: new Date(),
      error: sanitized.slice(0, 2000),
      processedItems,
    });

    throw err;
  }
}

export { processJiraSync };
