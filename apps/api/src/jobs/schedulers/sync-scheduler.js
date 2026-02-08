import { syncQueue } from '../queue.js';
import {
  AppSetting,
  JiraCredential,
  GithubCredential,
} from '../../db/models/index.js';
import { config } from '../../config.js';

const DEFAULT_SYNC_INTERVAL_HOURS = config.sync.defaultIntervalHours;

/**
 * Get the configured sync interval in milliseconds.
 */
async function getSyncIntervalMs() {
  try {
    const setting = await AppSetting.findByPk('sync_interval_hours');
    const hours = setting ? parseInt(setting.value, 10) : DEFAULT_SYNC_INTERVAL_HOURS;
    return (hours > 0 ? hours : DEFAULT_SYNC_INTERVAL_HOURS) * 60 * 60 * 1000;
  } catch {
    return DEFAULT_SYNC_INTERVAL_HOURS * 60 * 60 * 1000;
  }
}

/**
 * Schedule a repeatable sync job for a credential.
 */
async function scheduleForCredential(type, credentialId, intervalMs) {
  const jobName = `${type}-sync`;

  const job = await syncQueue.add(
    jobName,
    { type, credentialId },
    {
      repeat: { every: intervalMs },
      jobId: `scheduled:${type}:${credentialId}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      timeout: 30 * 60 * 1000,
      removeOnComplete: true,
      removeOnFail: 5,
    },
  );
  console.log(`[sync-scheduler] Scheduled repeatable ${jobName} (credentialId: ${credentialId}, every: ${intervalMs / 60000}min, jobId: ${job.id})`);
  return job;
}

/**
 * Remove all existing repeatable jobs from the sync queue.
 */
async function removeAllRepeatableJobs() {
  const repeatableJobs = await syncQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await syncQueue.removeRepeatableByKey(job.key);
  }
}

/**
 * Initialize the sync scheduler.
 * Only schedules jobs — does NOT start a worker. The worker runs as a separate process.
 */
export async function initScheduler(logger) {
  const log = logger || console;

  // Get sync interval
  const intervalMs = await getSyncIntervalMs();
  const intervalHours = intervalMs / (60 * 60 * 1000);
  log.info(`[sync-scheduler] Sync interval: ${intervalHours}h`);

  // Get all active credentials
  const jiraCredentials = await JiraCredential.findAll({ where: { isActive: true } });
  const githubCredentials = await GithubCredential.findAll({ where: { isActive: true } });

  // Remove stale repeatable jobs and re-schedule
  await removeAllRepeatableJobs();

  let scheduled = 0;
  for (const cred of jiraCredentials) {
    await scheduleForCredential('jira', cred.id, intervalMs);
    scheduled++;
  }
  for (const cred of githubCredentials) {
    await scheduleForCredential('github', cred.id, intervalMs);
    scheduled++;
  }

  log.info(
    `[sync-scheduler] Scheduled ${scheduled} repeatable sync jobs (${jiraCredentials.length} Jira, ${githubCredentials.length} GitHub)`,
  );
}

/**
 * Reschedule all sync jobs (e.g. after interval settings change).
 */
export async function reschedule(logger) {
  const log = logger || console;
  log.info('[sync-scheduler] Rescheduling all sync jobs...');
  await removeAllRepeatableJobs();
  await initScheduler(logger);
}
