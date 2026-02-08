import { Op } from 'sequelize';
import {
  sequelize,
  GithubOrganization,
  GithubRepository,
  GithubPullRequest,
  GithubReview,
  CredentialGithubOrg,
} from '../../db/models/index.js';

/**
 * List organizations linked to a credential (via junction table).
 */
export async function getOrganizations(credentialId) {
  return GithubOrganization.findAll({
    include: [
      {
        model: CredentialGithubOrg,
        as: undefined, // use default through
        where: { credentialId },
        attributes: [],
        // Use the belongsToMany through table
      },
    ],
    order: [['login', 'ASC']],
  }).catch((err) => {
    // Fallback: query through junction directly if association alias fails
    console.warn('[github.service] getOrganizations ORM fallback:', err.message);
    return sequelize.query(
      `SELECT o.* FROM github_organizations o
       INNER JOIN credential_github_orgs cgo ON cgo."organizationId" = o.id
       WHERE cgo."credentialId" = :credentialId
       ORDER BY o.login ASC`,
      { replacements: { credentialId }, model: GithubOrganization, mapToModel: true },
    );
  });
}

/**
 * List repositories for an organization.
 */
export async function getRepos(orgId) {
  return GithubRepository.findAll({
    where: { organizationId: orgId },
    order: [['name', 'ASC']],
  });
}

/**
 * Build include chain for PR queries: PullRequest -> Repository -> Organization.
 * Scopes via junction table CredentialGithubOrg.
 */
function buildPRInclude(filters) {
  const repoWhere = {};
  if (filters.repoId) {
    repoWhere.id = filters.repoId;
  }

  const orgWhere = {};
  if (filters.orgId) {
    orgWhere.id = filters.orgId;
  }

  // Scope to credential via junction
  const orgInclude = {
    model: GithubOrganization,
    as: 'organization',
    attributes: [],
    required: true,
    where: Object.keys(orgWhere).length > 0 ? orgWhere : undefined,
    include: filters.credentialId ? [
      {
        model: CredentialGithubOrg,
        as: undefined,
        attributes: [],
        where: { credentialId: filters.credentialId },
        required: true,
      },
    ] : [],
  };

  return [
    {
      model: GithubRepository,
      as: 'repository',
      attributes: [],
      required: true,
      where: Object.keys(repoWhere).length > 0 ? repoWhere : undefined,
      include: [orgInclude],
    },
  ];
}

/**
 * Build include chain for Review queries: Review -> PullRequest -> Repository -> Organization.
 */
function buildReviewInclude(filters) {
  const repoWhere = {};
  if (filters.repoId) {
    repoWhere.id = filters.repoId;
  }

  const orgWhere = {};
  if (filters.orgId) {
    orgWhere.id = filters.orgId;
  }

  const orgInclude = {
    model: GithubOrganization,
    as: 'organization',
    attributes: [],
    required: true,
    where: Object.keys(orgWhere).length > 0 ? orgWhere : undefined,
    include: filters.credentialId ? [
      {
        model: CredentialGithubOrg,
        as: undefined,
        attributes: [],
        where: { credentialId: filters.credentialId },
        required: true,
      },
    ] : [],
  };

  return [
    {
      model: GithubPullRequest,
      as: 'pullRequest',
      attributes: [],
      required: true,
      include: [
        {
          model: GithubRepository,
          as: 'repository',
          attributes: [],
          required: true,
          where: Object.keys(repoWhere).length > 0 ? repoWhere : undefined,
          include: [orgInclude],
        },
      ],
    },
  ];
}

/**
 * PRs Raised leaderboard.
 */
export async function getPRsRaisedLeaderboard(filters) {
  const where = {};
  if (filters.startDate || filters.endDate) {
    where.createdAtGh = {};
    if (filters.startDate) where.createdAtGh[Op.gte] = new Date(filters.startDate);
    if (filters.endDate) where.createdAtGh[Op.lte] = new Date(filters.endDate);
  }
  where.authorLogin = { [Op.not]: null };

  return GithubPullRequest.findAll({
    where,
    include: buildPRInclude(filters),
    attributes: [
      'authorLogin',
      'authorId',
      'authorAvatar',
      [sequelize.fn('COUNT', sequelize.col('GithubPullRequest.id')), 'totalPRs'],
    ],
    group: ['authorLogin', 'authorId', 'authorAvatar'],
    order: [[sequelize.literal('"totalPRs"'), 'DESC']],
    raw: true,
  });
}

/**
 * PRs Merged leaderboard.
 */
export async function getPRsMergedLeaderboard(filters) {
  const where = { merged: true };
  if (filters.startDate || filters.endDate) {
    where.mergedAt = {};
    if (filters.startDate) where.mergedAt[Op.gte] = new Date(filters.startDate);
    if (filters.endDate) where.mergedAt[Op.lte] = new Date(filters.endDate);
  }
  where.authorLogin = { [Op.not]: null };

  return GithubPullRequest.findAll({
    where,
    include: buildPRInclude(filters),
    attributes: [
      'authorLogin',
      'authorId',
      'authorAvatar',
      [sequelize.fn('COUNT', sequelize.col('GithubPullRequest.id')), 'totalMerged'],
    ],
    group: ['authorLogin', 'authorId', 'authorAvatar'],
    order: [[sequelize.literal('"totalMerged"'), 'DESC']],
    raw: true,
  });
}

/**
 * PRs Reviewed leaderboard.
 */
export async function getPRsReviewedLeaderboard(filters) {
  const where = {};
  if (filters.startDate || filters.endDate) {
    where.submittedAt = {};
    if (filters.startDate) where.submittedAt[Op.gte] = new Date(filters.startDate);
    if (filters.endDate) where.submittedAt[Op.lte] = new Date(filters.endDate);
  }
  where.reviewerLogin = { [Op.not]: null };

  return GithubReview.findAll({
    where,
    include: buildReviewInclude(filters),
    attributes: [
      'reviewerLogin',
      'reviewerId',
      'reviewerAvatar',
      [sequelize.fn('COUNT', sequelize.col('GithubReview.id')), 'totalReviews'],
    ],
    group: ['reviewerLogin', 'reviewerId', 'reviewerAvatar'],
    order: [[sequelize.literal('"totalReviews"'), 'DESC']],
    raw: true,
  });
}

/**
 * Lines Changed leaderboard.
 */
export async function getLinesChangedLeaderboard(filters) {
  const where = {};
  if (filters.startDate || filters.endDate) {
    where.createdAtGh = {};
    if (filters.startDate) where.createdAtGh[Op.gte] = new Date(filters.startDate);
    if (filters.endDate) where.createdAtGh[Op.lte] = new Date(filters.endDate);
  }
  where.authorLogin = { [Op.not]: null };

  return GithubPullRequest.findAll({
    where,
    include: buildPRInclude(filters),
    attributes: [
      'authorLogin',
      'authorId',
      'authorAvatar',
      [sequelize.fn('SUM', sequelize.col('linesAdded')), 'totalLinesAdded'],
      [sequelize.fn('SUM', sequelize.col('linesDeleted')), 'totalLinesDeleted'],
      [sequelize.fn('SUM', sequelize.col('changedFiles')), 'totalChangedFiles'],
    ],
    group: ['authorLogin', 'authorId', 'authorAvatar'],
    order: [[sequelize.literal('"totalLinesAdded"'), 'DESC']],
    raw: true,
  });
}

/**
 * Review Turnaround leaderboard.
 * Uses raw SQL CTE — scopes via junction table.
 */
export async function getReviewTurnaroundLeaderboard(filters) {
  const replacements = {};
  const conditions = [];

  if (filters.credentialId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM credential_github_orgs cgo
      WHERE cgo."organizationId" = o.id AND cgo."credentialId" = :credentialId
    )`);
    replacements.credentialId = filters.credentialId;
  }

  if (filters.orgId) {
    conditions.push('"o"."id" = :orgId');
    replacements.orgId = filters.orgId;
  }

  if (filters.repoId) {
    conditions.push('"r"."id" = :repoId');
    replacements.repoId = filters.repoId;
  }

  if (filters.startDate) {
    conditions.push('"rv"."submittedAt" >= :startDate');
    replacements.startDate = filters.startDate;
  }

  if (filters.endDate) {
    conditions.push('"rv"."submittedAt" <= :endDate');
    replacements.endDate = filters.endDate;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    WITH review_times AS (
      SELECT
        rv."reviewerLogin",
        rv."reviewerId",
        rv."reviewerAvatar",
        EXTRACT(EPOCH FROM (rv."submittedAt" - pr."createdAtGh")) / 3600.0 AS turnaround_hours
      FROM github_reviews rv
      INNER JOIN github_pull_requests pr ON rv."pullRequestId" = pr.id
      INNER JOIN github_repositories r ON pr."repositoryId" = r.id
      INNER JOIN github_organizations o ON r."organizationId" = o.id
      ${whereClause}
      AND rv."reviewerLogin" IS NOT NULL
      AND rv."submittedAt" IS NOT NULL
      AND pr."createdAtGh" IS NOT NULL
      AND rv."submittedAt" > pr."createdAtGh"
    )
    SELECT
      "reviewerLogin",
      "reviewerId",
      "reviewerAvatar",
      ROUND(AVG(turnaround_hours)::numeric, 2) AS "avgTurnaroundHours",
      COUNT(*)::integer AS "totalReviews"
    FROM review_times
    GROUP BY "reviewerLogin", "reviewerId", "reviewerAvatar"
    ORDER BY "avgTurnaroundHours" ASC;
  `;

  const [results] = await sequelize.query(query, { replacements });
  return results;
}
