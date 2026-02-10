import { Op } from 'sequelize';
import { config } from '../../config.js';
import { decrypt } from '../../lib/crypto.js';
import {
  fetchUser,
  fetchOrgs,
  fetchOrgMembers,
  fetchOrgRepos,
  fetchUserRepos,
  fetchUserOrgRepos,
  fetchPullRequests,
  fetchPRDetail,
  fetchPRReviews,
  fetchUserProfile,
  setOnRateLimit,
} from '../../routes/github/github.client.js';
import {
  sequelize,
  GithubCredential,
  GithubOrganization,
  GithubOrgMember,
  GithubRepository,
  GithubPullRequest,
  GithubReview,
  CredentialGithubOrg,
  SyncJob,
} from '../../db/models/index.js';
import { SyncProgressReporter } from '../utils/sync-progress.js';

const LOCK_TIMEOUT_MINUTES = 30;

/**
 * Try to acquire sync lock on an org. Returns true if lock acquired.
 */
async function acquireOrgLock(githubOrgId, credentialId) {
  const cutoff = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000);
  const [, rowCount] = await sequelize.query(
    `UPDATE github_organizations
     SET "syncLockedBy" = :credentialId, "syncLockedAt" = NOW()
     WHERE "githubOrgId" = :githubOrgId
       AND ("syncLockedBy" IS NULL OR "syncLockedAt" < :cutoff)`,
    {
      replacements: { credentialId, githubOrgId, cutoff },
      type: sequelize.QueryTypes.UPDATE,
    },
  );
  return rowCount > 0;
}

/**
 * Release sync lock on an org.
 */
async function releaseOrgLock(githubOrgId, credentialId) {
  await sequelize.query(
    `UPDATE github_organizations
     SET "syncLockedBy" = NULL, "syncLockedAt" = NULL
     WHERE "githubOrgId" = :githubOrgId AND "syncLockedBy" = :credentialId`,
    {
      replacements: { githubOrgId, credentialId },
      type: sequelize.QueryTypes.UPDATE,
    },
  );
}

/**
 * Process a single GitHub sync job.
 */
async function processGithubSync(job) {
  const { credentialId, syncJobId } = job.data;

  // 1. Get or create SyncJob record
  let syncJob;
  if (syncJobId) {
    syncJob = await SyncJob.findByPk(syncJobId);
  }
  if (!syncJob) {
    syncJob = await SyncJob.create({
      type: 'github',
      status: 'running',
      triggeredBy: syncJobId ? 'manual' : 'scheduled',
      githubCredentialId: credentialId,
      startedAt: new Date(),
    });
  } else {
    await syncJob.update({ status: 'running', startedAt: new Date() });
  }

  // 2. Get credential and decrypt PAT
  const credential = await GithubCredential.findByPk(credentialId);
  if (!credential || !credential.isActive) {
    await syncJob.update({
      status: 'failed',
      error: 'Credential not found or inactive',
      completedAt: new Date(),
    });
    throw new Error('GitHub credential not found or inactive');
  }

  const decryptedPat = decrypt(credential.pat);
  const reporter = new SyncProgressReporter(syncJob);
  const filters = job.data.filters || null;

  // Register rate-limit callback so the phase text shows when we're waiting
  setOnRateLimit(({ waitMs }) => {
    reporter.setPhase(`Rate limited — waiting ${Math.ceil(waitMs / 1000)}s for reset`);
  });

  // Cache for resolving GitHub logins to display names (login -> name|null)
  const nameCache = new Map();

  async function resolveUserName(login) {
    if (!login) return null;
    if (nameCache.has(login)) return nameCache.get(login);

    // Check if we already have a resolved name in the DB for this login
    const existing = await GithubPullRequest.findOne({
      where: { authorLogin: login, authorName: { [Op.not]: null } },
      attributes: ['authorName'],
      raw: true,
    });
    if (existing) {
      let cachedName = existing.authorName;
      // Strip SAML/EMU namespace prefix from cached values too
      if (cachedName && cachedName.includes('\\')) {
        const stripped = cachedName.split('\\').pop().trim();
        cachedName = stripped || null;
      }
      nameCache.set(login, cachedName);
      return cachedName;
    }

    // Fetch from GitHub API
    try {
      const profile = await fetchUserProfile(decryptedPat, login);
      let name = profile.name || null;
      // Strip SAML/EMU namespace prefix (e.g. "GitHubArchive\John Doe" → "John Doe")
      if (name && name.includes('\\')) {
        const stripped = name.split('\\').pop().trim();
        name = stripped || null; // null if only the namespace prefix with no actual name
      }
      nameCache.set(login, name);
      return name;
    } catch (err) {
      console.warn(`[github-worker] Could not fetch profile for ${login}:`, err.message);
      nameCache.set(login, null);
      return null;
    }
  }

  try {
    // 3. Fetch user info and save username
    reporter.setPhase('Fetching organizations');
    const user = await fetchUser(decryptedPat);
    if (user.login && user.login !== credential.username) {
      await credential.update({ username: user.login });
    }

    // 4. Fetch orgs
    const orgs = await fetchOrgs(decryptedPat);

    // Create a "personal" org entry for the user's own repos
    const allOrgs = [
      {
        id: user.id,
        login: user.login,
        avatar_url: user.avatar_url,
        isPersonal: true,
      },
      ...orgs.map((o) => ({
        id: o.id,
        login: o.login,
        avatar_url: o.avatar_url,
        isPersonal: false,
      })),
    ];

    // Determine last sync cutoff
    const lastSync = credential.updatedAt || null;

    for (const org of allOrgs) {
      // Check for cancellation before each org
      if (await reporter.isCancelled()) {
        console.log('[github-worker] Sync cancelled by user, stopping');
        await reporter.flush();
        await syncJob.update({ completedAt: new Date(), processedItems: reporter._processedItems, currentPhase: null });
        setOnRateLimit(null);
        return;
      }

      // 5a. Upsert GithubOrganization globally (by githubOrgId)
      const [ghOrg] = await GithubOrganization.findOrCreate({
        where: { githubOrgId: org.id },
        defaults: {
          githubOrgId: org.id,
          login: org.login,
          avatarUrl: org.avatar_url || null,
          isPersonal: org.isPersonal,
        },
      });
      await ghOrg.update({
        login: org.login,
        avatarUrl: org.avatar_url || null,
        isPersonal: org.isPersonal,
      });

      // 5b. Create junction entry (credential <-> org)
      await CredentialGithubOrg.findOrCreate({
        where: { credentialId, organizationId: ghOrg.id },
        defaults: { credentialId, organizationId: ghOrg.id },
      });

      // Skip org if not in filters
      if (filters?.orgIds && !filters.orgIds.includes(ghOrg.id)) {
        console.log(`[github-worker] Org ${org.login} (id=${ghOrg.id}) not in filter, skipping`);
        continue;
      }

      // 5c. Try to acquire sync lock — if another credential is syncing this org, skip
      const lockAcquired = await acquireOrgLock(org.id, credentialId);
      if (!lockAcquired) {
        console.log(`[github-worker] Org ${org.login} is being synced by another credential, skipping`);
        continue;
      }

      try {
        // 5d. Fetch members for real orgs (not personal)
        if (!org.isPersonal) {
          reporter.setPhase(`Syncing ${org.login}: fetching members`);
          try {
            const members = await fetchOrgMembers(decryptedPat, org.login);
            for (const member of members) {
              const [memberRecord] = await GithubOrgMember.findOrCreate({
                where: { organizationId: ghOrg.id, githubUserId: member.id },
                defaults: {
                  organizationId: ghOrg.id,
                  githubUserId: member.id,
                  login: member.login,
                  avatarUrl: member.avatar_url || null,
                },
              });
              await memberRecord.update({
                login: member.login,
                avatarUrl: member.avatar_url || null,
              });
            }
          } catch (memberErr) {
            console.warn(
              `[github-worker] Could not fetch members for ${org.login}:`,
              memberErr.message,
            );
          }
        }

        // 5e. Fetch repos
        reporter.setPhase(`Syncing ${org.login}: fetching repos`);
        let repos;
        if (org.isPersonal) {
          repos = await fetchUserRepos(decryptedPat);
        } else {
          const orgRepos = await fetchOrgRepos(decryptedPat, org.login);
          let userOrgRepos = [];
          try {
            const allUserOrgRepos = await fetchUserOrgRepos(decryptedPat);
            userOrgRepos = allUserOrgRepos.filter(
              (r) => r.owner && r.owner.login === org.login,
            );
          } catch (userRepoErr) {
            console.warn(
              `[github-worker] Could not fetch user org repos for ${org.login}:`,
              userRepoErr.message,
            );
          }
          // Deduplicate by repo id
          const repoMap = new Map();
          for (const r of orgRepos) repoMap.set(r.id, r);
          for (const r of userOrgRepos) {
            if (!repoMap.has(r.id)) repoMap.set(r.id, r);
          }
          repos = Array.from(repoMap.values());
          console.log(
            `[github-worker] ${org.login}: orgRepos=${orgRepos.length}, userOrgRepos=${userOrgRepos.length}, merged=${repos.length}`,
          );
        }

        for (const repo of repos) {
          // Check for cancellation before each repo
          if (await reporter.isCancelled()) {
            console.log('[github-worker] Sync cancelled by user, stopping');
            await reporter.flush();
            await syncJob.update({ completedAt: new Date(), processedItems: reporter._processedItems, currentPhase: null });
            await releaseOrgLock(org.id, credentialId);
            setOnRateLimit(null);
            return;
          }

          // 5f. Upsert GithubRepository globally (by githubRepoId)
          const [ghRepo] = await GithubRepository.findOrCreate({
            where: { githubRepoId: repo.id },
            defaults: {
              organizationId: ghOrg.id,
              githubRepoId: repo.id,
              name: repo.name,
              fullName: repo.full_name,
              isPrivate: repo.private || false,
              defaultBranch: repo.default_branch || 'main',
            },
          });
          await ghRepo.update({
            name: repo.name,
            fullName: repo.full_name,
            isPrivate: repo.private || false,
            defaultBranch: repo.default_branch || 'main',
          });

          // Skip repo if not in filters
          if (filters?.repoIds && !filters.repoIds.includes(ghRepo.id)) {
            console.log(`[github-worker] Repo ${repo.full_name} (id=${ghRepo.id}) not in filter, skipping`);
            continue;
          }

          // 5g. Fetch PRs (all states, paginated)
          // On subsequent syncs, sort by 'updated' so newest-updated come first,
          // enabling early exit when we hit pages of already-synced PRs.
          const prSort = lastSync ? 'updated' : 'created';
          let page = 1;
          let hasMore = true;

          while (hasMore) {
            reporter.setPhase(`Syncing ${org.login}: ${repo.name} — PRs page ${page}`);
            const [owner, repoName] = repo.full_name.split('/');
            const prResult = await fetchPullRequests(
              decryptedPat,
              owner,
              repoName,
              'all',
              page,
              100,
              prSort,
            );
            const prs = prResult.data || [];

            if (!prs || prs.length === 0) {
              hasMore = false;
              break;
            }

            let pageNewOrUpdatedCount = 0;

            for (const pr of prs) {
              const authorLogin = pr.user?.login || null;
              const prData = {
                repositoryId: ghRepo.id,
                githubPrId: pr.id,
                number: pr.number,
                title: pr.title || null,
                state: pr.state || null,
                merged: pr.merged_at != null,
                draft: pr.draft || false,
                authorLogin,
                authorName: await resolveUserName(authorLogin),
                authorId: pr.user?.id || null,
                authorAvatar: pr.user?.avatar_url || null,
                createdAtGh: pr.created_at || null,
                updatedAtGh: pr.updated_at || null,
                mergedAt: pr.merged_at || null,
                closedAt: pr.closed_at || null,
              };

              // Global findOrCreate by githubPrId
              const [prRecord, prCreated] = await GithubPullRequest.findOrCreate({
                where: { githubPrId: pr.id },
                defaults: prData,
              });

              const isNewOrUpdated =
                prCreated ||
                !lastSync ||
                new Date(pr.updated_at) > new Date(lastSync);

              if (isNewOrUpdated) {
                pageNewOrUpdatedCount++;
                try {
                  const detail = await fetchPRDetail(
                    decryptedPat,
                    owner,
                    repoName,
                    pr.number,
                  );
                  prData.linesAdded = detail.additions || 0;
                  prData.linesDeleted = detail.deletions || 0;
                  prData.changedFiles = detail.changed_files || 0;
                  prData.merged = detail.merged || false;
                } catch (detailErr) {
                  console.warn(
                    `[github-worker] Could not fetch PR detail for ${repo.full_name}#${pr.number}:`,
                    detailErr.message,
                  );
                }
              }

              if (!prCreated) {
                await prRecord.update(prData);
              } else if (prData.linesAdded !== undefined) {
                await prRecord.update({
                  linesAdded: prData.linesAdded,
                  linesDeleted: prData.linesDeleted,
                  changedFiles: prData.changedFiles,
                  merged: prData.merged,
                });
              }

              // Fetch reviews only for new or updated PRs
              if (isNewOrUpdated) {
                reporter.setPhase(`Syncing ${org.login}: ${repo.name} — reviews for #${pr.number}`);
                try {
                  const reviews = await fetchPRReviews(
                    decryptedPat,
                    owner,
                    repoName,
                    pr.number,
                  );

                  for (const review of reviews) {
                    const reviewerLogin = review.user?.login || null;
                    const reviewData = {
                      pullRequestId: prRecord.id,
                      githubReviewId: review.id,
                      reviewerLogin,
                      reviewerName: await resolveUserName(reviewerLogin),
                      reviewerId: review.user?.id || null,
                      reviewerAvatar: review.user?.avatar_url || null,
                      state: review.state || null,
                      submittedAt: review.submitted_at || null,
                    };

                    // Global findOrCreate by githubReviewId
                    const [, reviewCreated] = await GithubReview.findOrCreate({
                      where: { githubReviewId: review.id },
                      defaults: reviewData,
                    });
                    if (!reviewCreated) {
                      await GithubReview.update(reviewData, {
                        where: { githubReviewId: review.id },
                      });
                    }
                  }
                } catch (reviewErr) {
                  console.warn(
                    `[github-worker] Could not fetch reviews for ${repo.full_name}#${pr.number}:`,
                    reviewErr.message,
                  );
                }
              }

              reporter.increment();
            }

            // Early exit: if sorted by 'updated' and no PRs on this page were
            // new or updated, all remaining pages are even older — stop paginating.
            if (lastSync && pageNewOrUpdatedCount === 0) {
              console.log(
                `[github-worker] ${repo.full_name}: page ${page} had 0 new/updated PRs, stopping pagination early`,
              );
              hasMore = false;
            } else if (prs.length < 100) {
              hasMore = false;
            } else {
              page++;
            }
          }
        }
      } finally {
        // Always release the lock
        await releaseOrgLock(org.id, credentialId);
      }
    }

    // 6. Backfill missing author/reviewer display names
    if (!(await reporter.isCancelled())) {
      reporter.setPhase('Resolving display names');

      // Find distinct author logins without a name
      const [missingAuthors] = await sequelize.query(
        `SELECT DISTINCT "authorLogin" FROM github_pull_requests WHERE "authorLogin" IS NOT NULL AND "authorName" IS NULL`,
      );
      for (const { authorLogin } of missingAuthors) {
        if (await reporter.isCancelled()) break;
        const name = await resolveUserName(authorLogin);
        if (name) {
          await GithubPullRequest.update({ authorName: name }, { where: { authorLogin, authorName: null } });
        }
      }

      // Find distinct reviewer logins without a name
      const [missingReviewers] = await sequelize.query(
        `SELECT DISTINCT "reviewerLogin" FROM github_reviews WHERE "reviewerLogin" IS NOT NULL AND "reviewerName" IS NULL`,
      );
      for (const { reviewerLogin } of missingReviewers) {
        if (await reporter.isCancelled()) break;
        const name = await resolveUserName(reviewerLogin);
        if (name) {
          await GithubReview.update({ reviewerName: name }, { where: { reviewerLogin, reviewerName: null } });
        }
      }
    }

    // 7. Mark complete (don't overwrite if already cancelled)
    setOnRateLimit(null);
    await reporter.flush();
    await syncJob.reload();
    if (syncJob.status !== 'cancelled') {
      await syncJob.update({
        status: 'completed',
        completedAt: new Date(),
        processedItems: reporter._processedItems,
        currentPhase: null,
      });
    }
  } catch (err) {
    // 8. Sanitize error — never include tokens
    setOnRateLimit(null);
    const sanitized = (err.message || String(err))
      .replace(decryptedPat, '[REDACTED]')
      .replace(credential.pat, '[REDACTED]');

    await reporter.flush();
    await syncJob.reload();
    if (syncJob.status !== 'cancelled') {
      await syncJob.update({
        status: 'failed',
        completedAt: new Date(),
        error: sanitized.slice(0, 2000),
        processedItems: reporter._processedItems,
        currentPhase: null,
      });
    }

    throw err;
  }
}

export { processGithubSync };
