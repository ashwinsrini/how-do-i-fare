/**
 * Cleanup script: truncates all synced data tables and clears the BullMQ queue.
 *
 * Usage: node src/scripts/cleanup-all-data.js
 */
import { sequelize } from '../db/models/index.js';
import { syncQueue } from '../jobs/queue.js';

async function cleanup() {
  console.log('[cleanup] Starting full data cleanup...\n');

  // Order matters — child tables first (foreign key constraints)
  // Credentials are preserved so users don't have to re-enter them.
  const tables = [
    'github_reviews',
    'github_pull_requests',
    'github_repositories',
    'github_org_members',
    'github_organizations',
    'jira_issues',
    'jira_sprints',
    'jira_projects',
    'sync_jobs',
    'team_members',
  ];

  for (const table of tables) {
    try {
      const [, meta] = await sequelize.query(`DELETE FROM "${table}"`);
      console.log(`  [cleanup] ${table}: ${meta.rowCount ?? 0} rows deleted`);
    } catch (err) {
      console.warn(`  [cleanup] ${table}: ${err.message}`);
    }
  }

  // Clear BullMQ queue (waiting, delayed, repeatable jobs)
  console.log('\n[cleanup] Clearing BullMQ sync queue...');
  try {
    const repeatableJobs = await syncQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      await syncQueue.removeRepeatableByKey(job.key);
    }
    console.log(`  [cleanup] Removed ${repeatableJobs.length} repeatable jobs`);

    await syncQueue.obliterate({ force: true });
    console.log('  [cleanup] Queue obliterated (all jobs removed)');
  } catch (err) {
    console.warn(`  [cleanup] Queue cleanup error: ${err.message}`);
  }

  console.log('\n[cleanup] Done. All data cleared.');
  await sequelize.close();
  process.exit(0);
}

cleanup().catch((err) => {
  console.error('[cleanup] Fatal error:', err);
  process.exit(1);
});
