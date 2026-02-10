import { Op, UniqueConstraintError } from 'sequelize';
import { sequelize, SyncJob, AppSetting, GithubOrganization, JiraProject } from '../../db/models/index.js';
import { addSyncJob, syncQueue } from '../../jobs/queue.js';
import { config } from '../../config.js';

const SYNC_INTERVAL_KEY = 'sync_interval_hours';

/**
 * Get sync status: latest completed job per type + any currently running jobs.
 */
export async function getSyncStatus() {
  // Latest completed per type
  const [lastJira, lastGithub] = await Promise.all([
    SyncJob.findOne({
      where: { type: 'jira', status: 'completed' },
      order: [['completedAt', 'DESC']],
    }),
    SyncJob.findOne({
      where: { type: 'github', status: 'completed' },
      order: [['completedAt', 'DESC']],
    }),
  ]);

  // Currently running jobs
  const running = await SyncJob.findAll({
    where: { status: { [Op.in]: ['pending', 'running'] } },
    order: [['createdAt', 'DESC']],
  });

  // Recent completed/failed/cancelled jobs for history
  const recentHistory = await SyncJob.findAll({
    where: { status: { [Op.in]: ['completed', 'failed', 'cancelled'] } },
    order: [['completedAt', 'DESC']],
    limit: 5,
  });

  return {
    lastCompleted: {
      jira: lastJira || null,
      github: lastGithub || null,
    },
    running,
    recentHistory,
  };
}

/**
 * Trigger a new sync job.
 * Prevents duplicate syncs — only one pending/running job per type+credential at a time.
 */
export async function triggerSync(type, credentialId, triggeredBy = 'manual', filters = null) {
  const credField = type === 'jira' ? 'jiraCredentialId' : 'githubCredentialId';

  // Use a transaction to prevent TOCTOU race condition
  const transaction = await sequelize.transaction();
  try {
    // Lock active jobs for this credential to prevent concurrent creation
    const activeJob = await SyncJob.findOne({
      where: {
        type,
        [credField]: credentialId,
        status: { [Op.in]: ['pending', 'running'] },
      },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    if (activeJob) {
      await transaction.rollback();
      const err = new Error(`A ${type} sync is already ${activeJob.status} for this credential`);
      err.statusCode = 409;
      throw err;
    }

    const jobData = {
      type,
      status: 'pending',
      triggeredBy,
    };

    if (type === 'jira') {
      jobData.jiraCredentialId = credentialId;
    } else if (type === 'github') {
      jobData.githubCredentialId = credentialId;
    }

    const syncJob = await SyncJob.create(jobData, { transaction });
    await transaction.commit();

    // Add to BullMQ queue (outside transaction)
    const queueJobData = { syncJobId: syncJob.id, type, credentialId };
    if (filters) queueJobData.filters = filters;
    const queueJob = await addSyncJob(queueJobData);

    // Store the BullMQ job ID for potential cancellation of pending jobs
    await syncJob.update({ queueJobId: queueJob.id });

    return syncJob;
  } catch (err) {
    if (!err.statusCode) {
      await transaction.rollback().catch(() => {});
    }
    throw err;
  }
}

/**
 * Cancel a running or pending sync job.
 */
export async function cancelSync(syncJobId) {
  const syncJob = await SyncJob.findByPk(syncJobId);
  if (!syncJob) {
    const err = new Error('Sync job not found');
    err.statusCode = 404;
    throw err;
  }

  if (!['pending', 'running'].includes(syncJob.status)) {
    const err = new Error(`Cannot cancel a job with status "${syncJob.status}"`);
    err.statusCode = 400;
    throw err;
  }

  // If pending (not yet picked up by worker), try to remove from BullMQ queue
  if (syncJob.status === 'pending' && syncJob.queueJobId) {
    try {
      const queueJob = await syncQueue.getJob(syncJob.queueJobId);
      if (queueJob) await queueJob.remove();
    } catch (removeErr) {
      console.warn('[sync-service] Could not remove pending job from queue:', removeErr.message);
    }
  }

  await syncJob.update({
    status: 'cancelled',
    completedAt: new Date(),
    currentPhase: null,
  });

  // Release any sync locks held by this credential so the next sync can proceed
  const credentialId = syncJob.githubCredentialId || syncJob.jiraCredentialId;
  if (credentialId) {
    if (syncJob.type === 'github') {
      await GithubOrganization.update(
        { syncLockedBy: null, syncLockedAt: null },
        { where: { syncLockedBy: credentialId } },
      );
    } else if (syncJob.type === 'jira') {
      await JiraProject.update(
        { syncLockedBy: null, syncLockedAt: null },
        { where: { syncLockedBy: credentialId } },
      );
    }
  }

  return syncJob;
}

/**
 * Get recent sync jobs (most recent first).
 */
export async function getRecentJobs(limit = 50) {
  return SyncJob.findAll({
    order: [['createdAt', 'DESC']],
    limit,
  });
}

/**
 * Get current sync interval from AppSetting (or return default).
 */
export async function getSyncInterval() {
  const setting = await AppSetting.findByPk(SYNC_INTERVAL_KEY);
  if (setting && setting.value) {
    return parseInt(setting.value, 10);
  }
  return config.sync.defaultIntervalHours;
}

/**
 * Update the sync interval in AppSetting (upsert).
 */
export async function updateSyncInterval(hours) {
  await AppSetting.upsert({
    key: SYNC_INTERVAL_KEY,
    value: String(hours),
  });
  return hours;
}
