import { Op } from 'sequelize';
import { sequelize, JiraProject, JiraSprint, JiraIssue, CredentialJiraProject } from '../../db/models/index.js';

/**
 * List all projects linked to a credential (via junction table).
 */
export async function getProjects(credentialId) {
  return sequelize.query(
    `SELECT p.* FROM jira_projects p
     INNER JOIN credential_jira_projects cjp ON cjp."projectId" = p.id
     WHERE cjp."credentialId" = :credentialId
     ORDER BY p.name ASC`,
    { replacements: { credentialId }, model: JiraProject, mapToModel: true },
  );
}

/**
 * List all sprints for a given project.
 */
export async function getSprints(projectId) {
  return JiraSprint.findAll({
    where: { projectId },
    order: [['startDate', 'DESC']],
  });
}

/**
 * Get distinct statuses from jira_issues, optionally filtered by project.
 */
export async function getStatuses(credentialId, projectId) {
  const where = {};

  if (projectId) {
    where.projectId = projectId;
  } else {
    // Filter by credential: get all projects linked to this credential via junction
    const projectIds = await getLinkedProjectIds(credentialId);
    where.projectId = { [Op.in]: projectIds };
  }

  const results = await JiraIssue.findAll({
    where,
    attributes: [[sequelize.fn('DISTINCT', sequelize.col('status')), 'status']],
    raw: true,
  });

  return results.map((r) => r.status).filter(Boolean);
}

/**
 * Get project IDs linked to a credential via junction table.
 */
async function getLinkedProjectIds(credentialId) {
  const links = await CredentialJiraProject.findAll({
    where: { credentialId },
    attributes: ['projectId'],
    raw: true,
  });
  return links.map((l) => l.projectId);
}

/**
 * Build a common WHERE clause from leaderboard filters.
 */
function buildIssueWhere(filters) {
  const where = {};

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters.sprintId) {
    where.sprintId = filters.sprintId;
  }

  if (filters.startDate || filters.endDate) {
    where.createdDate = {};
    if (filters.startDate) {
      where.createdDate[Op.gte] = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdDate[Op.lte] = new Date(filters.endDate);
    }
  }

  return where;
}

/**
 * Ensure the WHERE clause is scoped to a credential (via junction table project IDs).
 */
async function scopeToCredential(where, credentialId) {
  const linkedProjectIds = await getLinkedProjectIds(credentialId);
  if (!where.projectId) {
    where.projectId = { [Op.in]: linkedProjectIds };
  } else {
    // Validate the provided projectId belongs to this credential
    const requestedId = typeof where.projectId === 'object' ? null : where.projectId;
    if (requestedId && !linkedProjectIds.includes(Number(requestedId))) {
      throw Object.assign(new Error('Project not accessible with this credential'), { statusCode: 403 });
    }
  }
  return where;
}

/**
 * Story Points leaderboard.
 */
export async function getStoryPointsLeaderboard(filters) {
  const where = buildIssueWhere(filters);
  await scopeToCredential(where, filters.credentialId);

  // Status filter
  if (filters.statuses && filters.statuses !== 'all' && filters.statuses.length > 0) {
    const statusList = Array.isArray(filters.statuses)
      ? filters.statuses
      : filters.statuses.split(',').map((s) => s.trim());
    if (statusList.length > 0 && statusList[0] !== 'all') {
      where.status = { [Op.in]: statusList };
    }
  }

  // Only include issues with story points
  where.storyPoints = { [Op.not]: null };
  where.assigneeName = { [Op.not]: null };

  const results = await JiraIssue.findAll({
    where,
    attributes: [
      'assigneeName',
      'assigneeAccountId',
      'assigneeAvatar',
      [sequelize.fn('SUM', sequelize.col('storyPoints')), 'totalStoryPoints'],
    ],
    group: ['assigneeName', 'assigneeAccountId', 'assigneeAvatar'],
    order: [[sequelize.literal('"totalStoryPoints"'), 'DESC']],
    raw: true,
  });

  return results;
}

/**
 * Tickets by Type leaderboard.
 */
export async function getTicketsByType(filters) {
  const where = buildIssueWhere(filters);
  await scopeToCredential(where, filters.credentialId);

  where.assigneeName = { [Op.not]: null };

  const results = await JiraIssue.findAll({
    where,
    attributes: [
      'assigneeName',
      'assigneeAccountId',
      'assigneeAvatar',
      'issueType',
      [sequelize.fn('COUNT', sequelize.col('JiraIssue.id')), 'ticketCount'],
    ],
    group: ['assigneeName', 'assigneeAccountId', 'assigneeAvatar', 'issueType'],
    order: [
      ['assigneeName', 'ASC'],
      [sequelize.literal('"ticketCount"'), 'DESC'],
    ],
    raw: true,
  });

  return results;
}

/**
 * Tickets by Status leaderboard.
 */
export async function getTicketsByStatus(filters) {
  const where = buildIssueWhere(filters);
  await scopeToCredential(where, filters.credentialId);

  where.assigneeName = { [Op.not]: null };

  const results = await JiraIssue.findAll({
    where,
    attributes: [
      'assigneeName',
      'assigneeAccountId',
      'assigneeAvatar',
      'statusCategory',
      [sequelize.fn('COUNT', sequelize.col('JiraIssue.id')), 'ticketCount'],
    ],
    group: ['assigneeName', 'assigneeAccountId', 'assigneeAvatar', 'statusCategory'],
    order: [
      ['assigneeName', 'ASC'],
      [sequelize.literal('"ticketCount"'), 'DESC'],
    ],
    raw: true,
  });

  return results;
}
