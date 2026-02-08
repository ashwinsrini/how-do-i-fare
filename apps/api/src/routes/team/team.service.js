import { Op } from 'sequelize';
import {
  sequelize,
  TeamMember,
  JiraIssue,
  GithubOrgMember,
  GithubPullRequest,
  GithubReview,
  GithubRepository,
  GithubOrganization,
} from '../../db/models/index.js';

// --- CRUD ---

export async function listMembers() {
  return TeamMember.findAll({ order: [['displayName', 'ASC']] });
}

export async function createMember(data) {
  return TeamMember.create(data);
}

export async function updateMember(id, data) {
  const member = await TeamMember.findByPk(id);
  if (!member) return null;
  await member.update(data);
  return member;
}

export async function deleteMember(id) {
  const member = await TeamMember.findByPk(id);
  if (!member) return false;
  await member.destroy();
  return true;
}

// --- Discovery ---

export async function discoverJiraUsers() {
  const [users] = await sequelize.query(`
    SELECT DISTINCT
      ji."assigneeAccountId",
      ji."assigneeName",
      ji."assigneeAvatar"
    FROM jira_issues ji
    WHERE ji."assigneeAccountId" IS NOT NULL
    ORDER BY ji."assigneeName" ASC
  `);

  const mapped = await TeamMember.findAll({
    where: { jiraAccountId: { [Op.not]: null } },
    attributes: ['jiraAccountId'],
    raw: true,
  });
  const mappedSet = new Set(mapped.map((m) => m.jiraAccountId));

  return users.map((u) => ({
    ...u,
    isMapped: mappedSet.has(u.assigneeAccountId),
  }));
}

export async function discoverGithubUsers() {
  const [users] = await sequelize.query(`
    SELECT login, "githubUserId", "avatarUrl" FROM (
      SELECT DISTINCT m.login, m."githubUserId", m."avatarUrl"
      FROM github_org_members m
      UNION
      SELECT DISTINCT pr."authorLogin" AS login, pr."authorId" AS "githubUserId", pr."authorAvatar" AS "avatarUrl"
      FROM github_pull_requests pr
      WHERE pr."authorLogin" IS NOT NULL
      UNION
      SELECT DISTINCT rv."reviewerLogin" AS login, rv."reviewerId" AS "githubUserId", rv."reviewerAvatar" AS "avatarUrl"
      FROM github_reviews rv
      WHERE rv."reviewerLogin" IS NOT NULL
    ) sub
    ORDER BY login ASC
  `);

  const mapped = await TeamMember.findAll({
    where: { githubLogin: { [Op.not]: null } },
    attributes: ['githubLogin'],
    raw: true,
  });
  const mappedSet = new Set(mapped.map((m) => m.githubLogin));

  return users.map((u) => ({
    ...u,
    isMapped: mappedSet.has(u.login),
  }));
}

// --- Auto-Suggest (Bigram Dice Coefficient) ---

function bigrams(str) {
  const s = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.slice(i, i + 2));
  }
  return set;
}

function diceCoefficient(a, b) {
  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);
  if (bigramsA.size === 0 && bigramsB.size === 0) return 0;
  let intersection = 0;
  for (const bg of bigramsA) {
    if (bigramsB.has(bg)) intersection++;
  }
  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

function tokenOverlap(jiraName, githubLogin) {
  const jiraTokens = jiraName.toLowerCase().split(/[\s._-]+/);
  const ghTokens = githubLogin.toLowerCase().split(/[\s._-]+/);
  let matches = 0;
  for (const jt of jiraTokens) {
    for (const gt of ghTokens) {
      if (jt === gt || gt.includes(jt) || jt.includes(gt)) {
        matches++;
        break;
      }
    }
  }
  return jiraTokens.length > 0 ? matches / jiraTokens.length : 0;
}

export async function suggestMappings() {
  const jiraUsers = await discoverJiraUsers();
  const githubUsers = await discoverGithubUsers();

  const unmappedJira = jiraUsers.filter((u) => !u.isMapped);
  const unmappedGithub = githubUsers.filter((u) => !u.isMapped);

  const suggestions = [];

  for (const jUser of unmappedJira) {
    let bestMatch = null;
    let bestScore = 0;

    for (const gUser of unmappedGithub) {
      const dice = diceCoefficient(jUser.assigneeName || '', gUser.login || '');
      const tokens = tokenOverlap(jUser.assigneeName || '', gUser.login || '');
      const combined = dice * 0.6 + tokens * 0.4;

      if (combined > bestScore) {
        bestScore = combined;
        bestMatch = gUser;
      }
    }

    if (bestMatch && bestScore >= 0.4) {
      suggestions.push({
        jiraAccountId: jUser.assigneeAccountId,
        jiraDisplayName: jUser.assigneeName,
        jiraAvatar: jUser.assigneeAvatar,
        githubLogin: bestMatch.login,
        githubUserId: bestMatch.githubUserId,
        githubAvatar: bestMatch.avatarUrl,
        confidence: Math.round(bestScore * 100) / 100,
      });
    }
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);
  return suggestions;
}

// --- Unified Profile ---

export async function getMemberProfile(id, { startDate, endDate } = {}) {
  const member = await TeamMember.findByPk(id);
  if (!member) return null;

  const result = { member: member.toJSON(), jira: null, github: null };

  // Jira metrics
  if (member.jiraAccountId) {
    const dateFilter = [];
    const replacements = { accountId: member.jiraAccountId };

    if (startDate) {
      dateFilter.push('"createdDate" >= :startDate');
      replacements.startDate = startDate;
    }
    if (endDate) {
      dateFilter.push('"createdDate" <= :endDate');
      replacements.endDate = endDate;
    }

    const dateClause = dateFilter.length > 0 ? `AND ${dateFilter.join(' AND ')}` : '';

    const [jiraStats] = await sequelize.query(`
      SELECT
        COALESCE(SUM("storyPoints"), 0)::integer AS "totalStoryPoints",
        COUNT(*)::integer AS "totalTickets",
        COUNT(*) FILTER (WHERE "statusCategory" = 'done')::integer AS "ticketsDone",
        COUNT(*) FILTER (WHERE "statusCategory" = 'indeterminate')::integer AS "ticketsInProgress",
        COUNT(*) FILTER (WHERE "statusCategory" = 'new')::integer AS "ticketsToDo"
      FROM jira_issues
      WHERE "assigneeAccountId" = :accountId ${dateClause}
    `, { replacements });

    result.jira = jiraStats[0] || null;
  }

  // GitHub metrics
  if (member.githubLogin) {
    const dateFilter = [];
    const replacements = { login: member.githubLogin };

    if (startDate) {
      dateFilter.push('pr."createdAtGh" >= :startDate');
      replacements.startDate = startDate;
    }
    if (endDate) {
      dateFilter.push('pr."createdAtGh" <= :endDate');
      replacements.endDate = endDate;
    }

    const dateClause = dateFilter.length > 0 ? `AND ${dateFilter.join(' AND ')}` : '';

    const [ghStats] = await sequelize.query(`
      SELECT
        COUNT(*)::integer AS "prsRaised",
        COUNT(*) FILTER (WHERE pr.merged = true)::integer AS "prsMerged",
        CASE WHEN COUNT(*) > 0
          THEN ROUND((COUNT(*) FILTER (WHERE pr.merged = true)::numeric / COUNT(*)) * 100, 1)
          ELSE 0
        END AS "mergeRate",
        COALESCE(SUM(pr."linesAdded"), 0)::integer AS "linesAdded",
        COALESCE(SUM(pr."linesDeleted"), 0)::integer AS "linesDeleted"
      FROM github_pull_requests pr
      WHERE pr."authorLogin" = :login ${dateClause}
    `, { replacements });

    // Reviews given
    const reviewDateFilter = [];
    const reviewReplacements = { login: member.githubLogin };
    if (startDate) {
      reviewDateFilter.push('rv."submittedAt" >= :startDate');
      reviewReplacements.startDate = startDate;
    }
    if (endDate) {
      reviewDateFilter.push('rv."submittedAt" <= :endDate');
      reviewReplacements.endDate = endDate;
    }
    const reviewDateClause = reviewDateFilter.length > 0 ? `AND ${reviewDateFilter.join(' AND ')}` : '';

    const [reviewStats] = await sequelize.query(`
      SELECT COUNT(*)::integer AS "reviewsGiven"
      FROM github_reviews rv
      WHERE rv."reviewerLogin" = :login ${reviewDateClause}
    `, { replacements: reviewReplacements });

    // Cycle time for this user
    const cycleReplacements = { login: member.githubLogin };
    const cycleDateFilter = [];
    if (startDate) {
      cycleDateFilter.push('pr."createdAtGh" >= :startDate');
      cycleReplacements.startDate = startDate;
    }
    if (endDate) {
      cycleDateFilter.push('pr."createdAtGh" <= :endDate');
      cycleReplacements.endDate = endDate;
    }
    const cycleDateClause = cycleDateFilter.length > 0 ? `AND ${cycleDateFilter.join(' AND ')}` : '';

    const [cycleStats] = await sequelize.query(`
      WITH first_reviews AS (
        SELECT rv."pullRequestId", MIN(rv."submittedAt") AS "firstReviewAt"
        FROM github_reviews rv
        WHERE rv."submittedAt" IS NOT NULL
        GROUP BY rv."pullRequestId"
      )
      SELECT
        ROUND(AVG(EXTRACT(EPOCH FROM (fr."firstReviewAt" - pr."createdAtGh")) / 3600.0)::numeric, 2) AS "avgHoursToFirstReview",
        ROUND(AVG(EXTRACT(EPOCH FROM (pr."mergedAt" - fr."firstReviewAt")) / 3600.0)::numeric, 2) AS "avgHoursFirstReviewToMerge",
        ROUND(AVG(EXTRACT(EPOCH FROM (pr."mergedAt" - pr."createdAtGh")) / 3600.0)::numeric, 2) AS "avgHoursTotalCycleTime"
      FROM github_pull_requests pr
      INNER JOIN first_reviews fr ON fr."pullRequestId" = pr.id
      WHERE pr."authorLogin" = :login
        AND pr.merged = true
        AND pr."mergedAt" IS NOT NULL
        AND pr."createdAtGh" IS NOT NULL
        ${cycleDateClause}
    `, { replacements: cycleReplacements });

    result.github = {
      ...(ghStats[0] || {}),
      reviewsGiven: reviewStats[0]?.reviewsGiven || 0,
      ...(cycleStats[0] || {}),
    };
  }

  return result;
}

// --- Comparison ---

export async function compareMembers(ids, { startDate, endDate } = {}) {
  const profiles = [];
  for (const id of ids.slice(0, 5)) {
    const profile = await getMemberProfile(id, { startDate, endDate });
    if (profile) profiles.push(profile);
  }
  return profiles;
}

// --- PR Cycle Time Leaderboard ---

export async function getCycleTimeMetrics({ credentialId, startDate, endDate } = {}) {
  const conditions = [];
  const replacements = {};

  if (credentialId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM credential_github_orgs cgo
      WHERE cgo."organizationId" = o.id AND cgo."credentialId" = :credentialId
    )`);
    replacements.credentialId = credentialId;
  }
  if (startDate) {
    conditions.push('pr."createdAtGh" >= :startDate');
    replacements.startDate = startDate;
  }
  if (endDate) {
    conditions.push('pr."createdAtGh" <= :endDate');
    replacements.endDate = endDate;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    WITH scoped_prs AS (
      SELECT pr.*
      FROM github_pull_requests pr
      INNER JOIN github_repositories r ON pr."repositoryId" = r.id
      INNER JOIN github_organizations o ON r."organizationId" = o.id
      ${whereClause}
    ),
    first_reviews AS (
      SELECT rv."pullRequestId", MIN(rv."submittedAt") AS "firstReviewAt"
      FROM github_reviews rv
      WHERE rv."submittedAt" IS NOT NULL
      GROUP BY rv."pullRequestId"
    ),
    pr_cycles AS (
      SELECT
        sp."authorLogin",
        sp."authorAvatar",
        EXTRACT(EPOCH FROM (fr."firstReviewAt" - sp."createdAtGh")) / 3600.0 AS hours_to_first_review,
        EXTRACT(EPOCH FROM (sp."mergedAt" - fr."firstReviewAt")) / 3600.0 AS hours_first_review_to_merge,
        EXTRACT(EPOCH FROM (sp."mergedAt" - sp."createdAtGh")) / 3600.0 AS hours_total
      FROM scoped_prs sp
      INNER JOIN first_reviews fr ON fr."pullRequestId" = sp.id
      WHERE sp.merged = true
        AND sp."mergedAt" IS NOT NULL
        AND sp."createdAtGh" IS NOT NULL
        AND sp."authorLogin" IS NOT NULL
        AND fr."firstReviewAt" > sp."createdAtGh"
    )
    SELECT
      "authorLogin",
      "authorAvatar",
      ROUND(AVG(hours_to_first_review)::numeric, 2) AS "avgHoursToFirstReview",
      ROUND(AVG(hours_first_review_to_merge)::numeric, 2) AS "avgHoursFirstReviewToMerge",
      ROUND(AVG(hours_total)::numeric, 2) AS "avgHoursTotalCycleTime",
      COUNT(*)::integer AS "totalPRs"
    FROM pr_cycles
    GROUP BY "authorLogin", "authorAvatar"
    ORDER BY "avgHoursTotalCycleTime" ASC;
  `;

  const [results] = await sequelize.query(query, { replacements });
  return results;
}

// --- Review Reciprocity Matrix ---

export async function getReviewMatrix({ credentialId, startDate, endDate } = {}) {
  const conditions = [];
  const replacements = {};

  if (credentialId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM credential_github_orgs cgo
      WHERE cgo."organizationId" = o.id AND cgo."credentialId" = :credentialId
    )`);
    replacements.credentialId = credentialId;
  }
  if (startDate) {
    conditions.push('rv."submittedAt" >= :startDate');
    replacements.startDate = startDate;
  }
  if (endDate) {
    conditions.push('rv."submittedAt" <= :endDate');
    replacements.endDate = endDate;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      rv."reviewerLogin",
      pr."authorLogin",
      COUNT(*)::integer AS "count"
    FROM github_reviews rv
    INNER JOIN github_pull_requests pr ON rv."pullRequestId" = pr.id
    INNER JOIN github_repositories r ON pr."repositoryId" = r.id
    INNER JOIN github_organizations o ON r."organizationId" = o.id
    ${whereClause}
    ${conditions.length > 0 ? 'AND' : 'WHERE'} rv."reviewerLogin" IS NOT NULL
      AND pr."authorLogin" IS NOT NULL
      AND rv."reviewerLogin" != pr."authorLogin"
    GROUP BY rv."reviewerLogin", pr."authorLogin"
    ORDER BY "count" DESC;
  `;

  const [rows] = await sequelize.query(query, { replacements });

  const reviewers = [...new Set(rows.map((r) => r.reviewerLogin))];
  const authors = [...new Set(rows.map((r) => r.authorLogin))];
  const matrix = {};

  for (const row of rows) {
    if (!matrix[row.reviewerLogin]) matrix[row.reviewerLogin] = {};
    matrix[row.reviewerLogin][row.authorLogin] = row.count;
  }

  return { reviewers, authors, matrix };
}

// --- Time-Series Trends ---

export async function getTrends({ metric, interval = 'week', credentialId, startDate, endDate } = {}) {
  const allowedBuckets = ['week', 'month'];
  const bucket = allowedBuckets.includes(interval) ? interval : 'week';
  const conditions = [];
  const replacements = {};

  if (credentialId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM credential_github_orgs cgo
      WHERE cgo."organizationId" = o.id AND cgo."credentialId" = :credentialId
    )`);
    replacements.credentialId = credentialId;
  }
  if (startDate) {
    replacements.startDate = startDate;
  }
  if (endDate) {
    replacements.endDate = endDate;
  }

  const credFilter = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

  let query;

  if (metric === 'prs-raised') {
    const dateFilters = [];
    if (startDate) dateFilters.push('pr."createdAtGh" >= :startDate');
    if (endDate) dateFilters.push('pr."createdAtGh" <= :endDate');
    const dateCond = dateFilters.length > 0 ? `AND ${dateFilters.join(' AND ')}` : '';

    query = `
      SELECT
        date_trunc('${bucket}', pr."createdAtGh") AS period,
        pr."authorLogin" AS person,
        COUNT(*)::integer AS value
      FROM github_pull_requests pr
      INNER JOIN github_repositories r ON pr."repositoryId" = r.id
      INNER JOIN github_organizations o ON r."organizationId" = o.id
      WHERE ${credFilter}
        AND pr."authorLogin" IS NOT NULL
        AND pr."createdAtGh" IS NOT NULL
        ${dateCond}
      GROUP BY period, pr."authorLogin"
      ORDER BY period ASC;
    `;
  } else if (metric === 'prs-merged') {
    const dateFilters = [];
    if (startDate) dateFilters.push('pr."mergedAt" >= :startDate');
    if (endDate) dateFilters.push('pr."mergedAt" <= :endDate');
    const dateCond = dateFilters.length > 0 ? `AND ${dateFilters.join(' AND ')}` : '';

    query = `
      SELECT
        date_trunc('${bucket}', pr."mergedAt") AS period,
        pr."authorLogin" AS person,
        COUNT(*)::integer AS value
      FROM github_pull_requests pr
      INNER JOIN github_repositories r ON pr."repositoryId" = r.id
      INNER JOIN github_organizations o ON r."organizationId" = o.id
      WHERE ${credFilter}
        AND pr.merged = true
        AND pr."authorLogin" IS NOT NULL
        AND pr."mergedAt" IS NOT NULL
        ${dateCond}
      GROUP BY period, pr."authorLogin"
      ORDER BY period ASC;
    `;
  } else if (metric === 'reviews') {
    const dateFilters = [];
    if (startDate) dateFilters.push('rv."submittedAt" >= :startDate');
    if (endDate) dateFilters.push('rv."submittedAt" <= :endDate');
    const dateCond = dateFilters.length > 0 ? `AND ${dateFilters.join(' AND ')}` : '';

    query = `
      SELECT
        date_trunc('${bucket}', rv."submittedAt") AS period,
        rv."reviewerLogin" AS person,
        COUNT(*)::integer AS value
      FROM github_reviews rv
      INNER JOIN github_pull_requests pr ON rv."pullRequestId" = pr.id
      INNER JOIN github_repositories r ON pr."repositoryId" = r.id
      INNER JOIN github_organizations o ON r."organizationId" = o.id
      WHERE ${credFilter}
        AND rv."reviewerLogin" IS NOT NULL
        AND rv."submittedAt" IS NOT NULL
        ${dateCond}
      GROUP BY period, rv."reviewerLogin"
      ORDER BY period ASC;
    `;
  } else if (metric === 'story-points') {
    // Story points come from Jira — no credential filter via GitHub orgs
    const dateFilters = [];
    if (startDate) dateFilters.push('ji."createdDate" >= :startDate');
    if (endDate) dateFilters.push('ji."createdDate" <= :endDate');
    const dateCond = dateFilters.length > 0 ? `WHERE ${dateFilters.join(' AND ')}` : '';

    query = `
      SELECT
        date_trunc('${bucket}', ji."createdDate") AS period,
        ji."assigneeName" AS person,
        COALESCE(SUM(ji."storyPoints"), 0)::integer AS value
      FROM jira_issues ji
      ${dateCond}
      ${dateCond ? 'AND' : 'WHERE'} ji."assigneeName" IS NOT NULL
      GROUP BY period, ji."assigneeName"
      ORDER BY period ASC;
    `;
  } else {
    return [];
  }

  const [results] = await sequelize.query(query, { replacements });
  return results;
}
