import * as teamService from './team.service.js';

function parseIntOrNull(val) {
  if (val === undefined || val === null || val === '') return null;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
}

export default async function teamRoutes(app) {
  // ─── CRUD ──────────────────────────────────────────────────────────────

  app.get('/members', async () => {
    return teamService.listMembers();
  });

  app.post('/members', {
    schema: {
      body: {
        type: 'object',
        required: ['displayName'],
        properties: {
          displayName: { type: 'string' },
          avatarUrl: { type: 'string' },
          jiraAccountId: { type: 'string' },
          jiraDisplayName: { type: 'string' },
          githubLogin: { type: 'string' },
          githubUserId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const member = await teamService.createMember(request.body);
      reply.code(201);
      return member;
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        reply.code(409);
        return { error: 'A member with this Jira account or GitHub login already exists' };
      }
      throw err;
    }
  });

  app.put('/members/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          displayName: { type: 'string' },
          avatarUrl: { type: 'string' },
          jiraAccountId: { type: 'string' },
          jiraDisplayName: { type: 'string' },
          githubLogin: { type: 'string' },
          githubUserId: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const member = await teamService.updateMember(request.params.id, request.body);
    if (!member) {
      reply.code(404);
      return { error: 'Member not found' };
    }
    return member;
  });

  app.delete('/members/:id', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
    },
  }, async (request, reply) => {
    const deleted = await teamService.deleteMember(request.params.id);
    if (!deleted) {
      reply.code(404);
      return { error: 'Member not found' };
    }
    return { success: true };
  });

  // ─── Discovery & Suggestions ───────────────────────────────────────────

  app.get('/discover/jira-users', async () => {
    return teamService.discoverJiraUsers();
  });

  app.get('/discover/github-users', async () => {
    return teamService.discoverGithubUsers();
  });

  app.get('/suggest', async () => {
    return teamService.suggestMappings();
  });

  // ─── Profile & Comparison ──────────────────────────────────────────────

  app.get('/members/:id/profile', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: { id: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const profile = await teamService.getMemberProfile(request.params.id, {
      startDate: request.query.startDate || null,
      endDate: request.query.endDate || null,
    });
    if (!profile) {
      reply.code(404);
      return { error: 'Member not found' };
    }
    return profile;
  });

  app.get('/compare', {
    schema: {
      querystring: {
        type: 'object',
        required: ['ids'],
        properties: {
          ids: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const ids = request.query.ids.split(',').map((s) => parseIntOrNull(s.trim())).filter(Boolean);
    if (ids.length < 2 || ids.length > 5) {
      reply.code(400);
      return { error: 'Provide 2 to 5 member IDs' };
    }
    return teamService.compareMembers(ids, {
      startDate: request.query.startDate || null,
      endDate: request.query.endDate || null,
    });
  });

  // ─── Metrics ───────────────────────────────────────────────────────────

  app.get('/metrics/cycle-time', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          credentialId: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    return teamService.getCycleTimeMetrics({
      credentialId: request.query.credentialId || null,
      startDate: request.query.startDate || null,
      endDate: request.query.endDate || null,
    });
  });

  app.get('/metrics/review-matrix', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          credentialId: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    return teamService.getReviewMatrix({
      credentialId: request.query.credentialId || null,
      startDate: request.query.startDate || null,
      endDate: request.query.endDate || null,
    });
  });

  app.get('/metrics/trends', {
    schema: {
      querystring: {
        type: 'object',
        required: ['metric'],
        properties: {
          metric: { type: 'string' },
          interval: { type: 'string' },
          credentialId: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
    },
  }, async (request) => {
    return teamService.getTrends({
      metric: request.query.metric,
      interval: request.query.interval || 'week',
      credentialId: request.query.credentialId || null,
      startDate: request.query.startDate || null,
      endDate: request.query.endDate || null,
    });
  });
}
