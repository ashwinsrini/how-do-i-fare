import { Op, UniqueConstraintError } from 'sequelize';
import { sequelize, SyncJob, AppSetting } from '../../db/models/index.js';
import { addSyncJob } from '../../jobs/queue.js';
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

  return {
    lastCompleted: {
      jira: lastJira || null,
      github: lastGithub || null,
    },
    running,
  };
}

/**
 * Trigger a new sync job.
 * Prevents duplicate syncs — only one pending/running job per type+credential at a time.
 */
export async function triggerSync(type, credentialId, triggeredBy = 'manual') {
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
    await addSyncJob({
      syncJobId: syncJob.id,
      type,
      credentialId,
    });

    return syncJob;
  } catch (err) {
    if (!err.statusCode) {
      await transaction.rollback().catch(() => {});
    }
    throw err;
  }
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
