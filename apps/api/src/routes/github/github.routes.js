import * as githubService from './github.service.js';

const credentialIdQuery = {
  type: 'object',
  required: ['credentialId'],
  properties: {
    credentialId: { type: 'string' },
  },
};

const leaderboardQuery = {
  type: 'object',
  required: ['credentialId'],
  properties: {
    credentialId: { type: 'string' },
    orgId: { type: 'string' },
    repoId: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
  },
};

const idParam = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
  },
};

function parseIntOrNull(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

export default async function githubRoutes(app) {
  /**
   * GET /organizations?credentialId=
   */
  app.get('/organizations', {
    schema: { querystring: credentialIdQuery },
  }, async (request) => {
    const { credentialId } = request.query;
    return githubService.getOrganizations(credentialId);
  });

  /**
   * GET /organizations/:id/repos
   */
  app.get('/organizations/:id/repos', {
    schema: { params: idParam },
  }, async (request) => {
    const orgId = parseIntOrNull(request.params.id);
    if (orgId === null) {
      throw { statusCode: 400, message: 'Invalid organization ID' };
    }
    return githubService.getRepos(orgId);
  });

  /**
   * GET /leaderboard/prs-raised
   */
  app.get('/leaderboard/prs-raised', {
    schema: { querystring: leaderboardQuery },
  }, async (request) => {
    const { credentialId, orgId, repoId, startDate, endDate } = request.query;
    return githubService.getPRsRaisedLeaderboard({
      credentialId,
      orgId: parseIntOrNull(orgId),
      repoId: parseIntOrNull(repoId),
      startDate: startDate || null,
      endDate: endDate || null,
    });
  });

  /**
   * GET /leaderboard/prs-merged
   */
  app.get('/leaderboard/prs-merged', {
    schema: { querystring: leaderboardQuery },
  }, async (request) => {
    const { credentialId, orgId, repoId, startDate, endDate } = request.query;
    return githubService.getPRsMergedLeaderboard({
      credentialId,
      orgId: parseIntOrNull(orgId),
      repoId: parseIntOrNull(repoId),
      startDate: startDate || null,
      endDate: endDate || null,
    });
  });

  /**
   * GET /leaderboard/prs-reviewed
   */
  app.get('/leaderboard/prs-reviewed', {
    schema: { querystring: leaderboardQuery },
  }, async (request) => {
    const { credentialId, orgId, repoId, startDate, endDate } = request.query;
    return githubService.getPRsReviewedLeaderboard({
      credentialId,
      orgId: parseIntOrNull(orgId),
      repoId: parseIntOrNull(repoId),
      startDate: startDate || null,
      endDate: endDate || null,
    });
  });

  /**
   * GET /leaderboard/lines-changed
   */
  app.get('/leaderboard/lines-changed', {
    schema: { querystring: leaderboardQuery },
  }, async (request) => {
    const { credentialId, orgId, repoId, startDate, endDate } = request.query;
    return githubService.getLinesChangedLeaderboard({
      credentialId,
      orgId: parseIntOrNull(orgId),
      repoId: parseIntOrNull(repoId),
      startDate: startDate || null,
      endDate: endDate || null,
    });
  });

  /**
   * GET /leaderboard/review-turnaround
   */
  app.get('/leaderboard/review-turnaround', {
    schema: { querystring: leaderboardQuery },
  }, async (request) => {
    const { credentialId, orgId, repoId, startDate, endDate } = request.query;
    return githubService.getReviewTurnaroundLeaderboard({
      credentialId,
      orgId: parseIntOrNull(orgId),
      repoId: parseIntOrNull(repoId),
      startDate: startDate || null,
      endDate: endDate || null,
    });
  });
}
