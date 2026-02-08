import * as jiraService from './jira.service.js';

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
    projectId: { type: 'string' },
    sprintId: { type: 'string' },
    startDate: { type: 'string' },
    endDate: { type: 'string' },
    statuses: { type: 'string' },
  },
};

const leaderboardQueryNoStatuses = {
  type: 'object',
  required: ['credentialId'],
  properties: {
    credentialId: { type: 'string' },
    projectId: { type: 'string' },
    sprintId: { type: 'string' },
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

const statusesQuery = {
  type: 'object',
  required: ['credentialId'],
  properties: {
    credentialId: { type: 'string' },
    projectId: { type: 'string' },
  },
};

function parseIntOrNull(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

export default async function jiraRoutes(app) {
  /**
   * GET /projects?credentialId=
   */
  app.get('/projects', {
    schema: { querystring: credentialIdQuery },
  }, async (request) => {
    const { credentialId } = request.query;
    return jiraService.getProjects(credentialId);
  });

  /**
   * GET /projects/:id/sprints
   */
  app.get('/projects/:id/sprints', {
    schema: { params: idParam },
  }, async (request) => {
    const projectId = parseIntOrNull(request.params.id);
    if (projectId === null) {
      throw { statusCode: 400, message: 'Invalid project ID' };
    }
    return jiraService.getSprints(projectId);
  });

  /**
   * GET /statuses?credentialId=&projectId=
   */
  app.get('/statuses', {
    schema: { querystring: statusesQuery },
  }, async (request) => {
    const { credentialId, projectId } = request.query;
    return jiraService.getStatuses(credentialId, parseIntOrNull(projectId));
  });

  /**
   * GET /leaderboard/story-points
   */
  app.get('/leaderboard/story-points', {
    schema: { querystring: leaderboardQuery },
  }, async (request) => {
    const { credentialId, projectId, sprintId, startDate, endDate, statuses } = request.query;
    return jiraService.getStoryPointsLeaderboard({
      credentialId,
      projectId: parseIntOrNull(projectId),
      sprintId: parseIntOrNull(sprintId),
      startDate: startDate || null,
      endDate: endDate || null,
      statuses: statuses || null,
    });
  });

  /**
   * GET /leaderboard/tickets-by-type
   */
  app.get('/leaderboard/tickets-by-type', {
    schema: { querystring: leaderboardQueryNoStatuses },
  }, async (request) => {
    const { credentialId, projectId, sprintId, startDate, endDate } = request.query;
    return jiraService.getTicketsByType({
      credentialId,
      projectId: parseIntOrNull(projectId),
      sprintId: parseIntOrNull(sprintId),
      startDate: startDate || null,
      endDate: endDate || null,
    });
  });

  /**
   * GET /leaderboard/tickets-by-status
   */
  app.get('/leaderboard/tickets-by-status', {
    schema: { querystring: leaderboardQueryNoStatuses },
  }, async (request) => {
    const { credentialId, projectId, sprintId, startDate, endDate } = request.query;
    return jiraService.getTicketsByStatus({
      credentialId,
      projectId: parseIntOrNull(projectId),
      sprintId: parseIntOrNull(sprintId),
      startDate: startDate || null,
      endDate: endDate || null,
    });
  });
}
