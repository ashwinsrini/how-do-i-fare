import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config.js';

const connection = new IORedis(config.redis.url, { maxRetriesPerRequest: null });

export const syncQueue = new Queue('sync', { connection });

// --- Queue-level event logging (runs in the API process) ---
const queueEvents = new QueueEvents('sync', { connection: new IORedis(config.redis.url, { maxRetriesPerRequest: null }) });

queueEvents.on('waiting', ({ jobId }) => {
  console.log(`[queue] Job ${jobId} is waiting (published to queue)`);
});

queueEvents.on('active', ({ jobId, prev }) => {
  console.log(`[queue] Job ${jobId} is now active (was ${prev})`);
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`[queue] Job ${jobId} completed`, returnvalue ? `result: ${returnvalue}` : '');
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`[queue] Job ${jobId} failed: ${failedReason}`);
});

queueEvents.on('stalled', ({ jobId }) => {
  console.warn(`[queue] Job ${jobId} has stalled`);
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log(`[queue] Job ${jobId} progress:`, data);
});

/**
 * Add a sync job to the queue.
 * @param {Object} data - { type: 'jira'|'github', credentialId: string, syncJobId: number }
 * @returns {Promise<import('bullmq').Job>}
 */
export async function addSyncJob(data) {
  const job = await syncQueue.add(`${data.type}-sync`, data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    timeout: 30 * 60 * 1000, // 30 min timeout
  });
  console.log(`[queue] Published ${data.type}-sync job ${job.id} (credentialId: ${data.credentialId})`);
  return job;
}
