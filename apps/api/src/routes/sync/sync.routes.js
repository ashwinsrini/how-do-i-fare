import * as syncService from './sync.service.js';
import { JiraCredential, GithubCredential } from '../../db/models/index.js';

const triggerBody = {
  type: 'object',
  required: ['type', 'credentialId'],
  properties: {
    type: { type: 'string', enum: ['jira', 'github'] },
    credentialId: { type: 'string', minLength: 1 },
    filters: {
      type: 'object',
      properties: {
        orgIds: { type: 'array', items: { type: 'integer' } },
        repoIds: { type: 'array', items: { type: 'integer' } },
        projectKeys: { type: 'array', items: { type: 'string' } },
      },
      additionalProperties: false,
    },
  },
};

const settingsBody = {
  type: 'object',
  required: ['syncIntervalHours'],
  properties: {
    syncIntervalHours: { type: 'integer', minimum: 1, maximum: 168 },
  },
};

export default async function syncRoutes(app) {
  /**
   * GET /status — Last completed sync per type + currently running jobs
   */
  app.get('/status', async () => {
    return syncService.getSyncStatus();
  });

  /**
   * POST /trigger — Create a sync job and enqueue it
   */
  app.post('/trigger', {
    schema: { body: triggerBody },
  }, async (request, reply) => {
    const { type, credentialId, filters } = request.body;

    // Verify the user owns this credential
    const Model = type === 'jira' ? JiraCredential : GithubCredential;
    const credential = await Model.findOne({ where: { id: credentialId, userId: request.user.userId } });
    if (!credential) {
      return reply.status(404).send({ error: 'Credential not found' });
    }

    try {
      const syncJob = await syncService.triggerSync(type, credentialId, 'manual', filters || null);
      return reply.status(201).send(syncJob);
    } catch (err) {
      const status = err.statusCode || 500;
      return reply.status(status).send({
        error: err.message || 'Failed to trigger sync',
      });
    }
  });

  /**
   * POST /cancel/:id — Cancel a running or pending sync job
   */
  app.post('/cancel/:id', async (request, reply) => {
    try {
      const syncJob = await syncService.cancelSync(request.params.id);
      return syncJob;
    } catch (err) {
      const status = err.statusCode || 500;
      return reply.status(status).send({ error: err.message });
    }
  });

  /**
   * GET /jobs — List recent sync jobs (last 50)
   */
  app.get('/jobs', async () => {
    return syncService.getRecentJobs(50);
  });

  /**
   * GET /settings — Get current sync interval
   */
  app.get('/settings', async () => {
    const syncIntervalHours = await syncService.getSyncInterval();
    return { syncIntervalHours };
  });

  /**
   * PUT /settings — Update sync interval and reinitialize scheduler
   */
  app.put('/settings', {
    schema: { body: settingsBody },
  }, async (request, reply) => {
    const { syncIntervalHours } = request.body;

    await syncService.updateSyncInterval(syncIntervalHours);

    // Reinitialize the scheduler with the new interval
    try {
      const { initScheduler } = await import('../../jobs/schedulers/sync-scheduler.js');
      await initScheduler(request.log);
    } catch (err) {
      request.log.warn({ err }, 'Failed to reinitialize scheduler after settings update');
    }

    return { syncIntervalHours };
  });
}
