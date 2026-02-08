import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config.js';
import { sequelize } from './db/models/index.js';
import { processJiraSync } from './jobs/workers/jira-sync.worker.js';
import { processGithubSync } from './jobs/workers/github-sync.worker.js';

const connection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
});

const concurrency = config.worker.concurrency;

const worker = new Worker('sync', async (job) => {
  console.log(`[sync-worker] Picked up job ${job.id} (${job.name}) — data:`, JSON.stringify(job.data));
  const start = Date.now();

  if (job.name === 'jira-sync') {
    const result = await processJiraSync(job);
    console.log(`[sync-worker] Job ${job.id} (${job.name}) finished in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    return result;
  }
  if (job.name === 'github-sync') {
    const result = await processGithubSync(job);
    console.log(`[sync-worker] Job ${job.id} (${job.name}) finished in ${((Date.now() - start) / 1000).toFixed(1)}s`);
    return result;
  }
  console.warn(`[sync-worker] Unknown job name: ${job.name}`);
}, {
  connection,
  concurrency,
});

worker.on('completed', (job) => {
  console.log(`[sync-worker] Job ${job.id} (${job.name}) completed — attempt ${job.attemptsMade}`);
});

worker.on('failed', (job, err) => {
  console.error(`[sync-worker] Job ${job?.id} (${job?.name}) failed — attempt ${job?.attemptsMade}/${job?.opts?.attempts}: ${err.message}`);
});

worker.on('error', (err) => {
  console.error('[sync-worker] Worker error:', err.message);
});

worker.on('stalled', (jobId) => {
  console.warn(`[sync-worker] Job ${jobId} stalled — will be retried`);
});

console.log(`[sync-worker] Worker process started (PID: ${process.pid}, concurrency: ${concurrency})`);

// Graceful shutdown
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[sync-worker] Received ${signal}, shutting down...`);

  // Force exit after 5s if graceful close hangs
  setTimeout(() => {
    console.error('[sync-worker] Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 5000).unref();

  try { await worker.close(); } catch {}
  try { await connection.quit(); } catch {}
  try { await sequelize.close(); } catch {}
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
