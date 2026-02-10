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
  // Only accounts (users, otp_codes) and their credentials
  // (jira_credentials, github_credentials) are preserved.
  const tables = [
    // GitHub synced data (deepest children first)
    'github_reviews',
    'github_pull_requests',
    'github_repositories',
    'github_org_members',
    // Credential-to-org junction (references github_organizations)
    'credential_github_orgs',
    'github_organizations',
    // Jira synced data (deepest children first)
    'jira_issues',
    'jira_sprints',
    // Credential-to-project junction (references jira_projects)
    'credential_jira_projects',
    'jira_projects',
    'jira_instances',
    // Job tracking & cross-platform data
    'sync_jobs',
    'team_members',
    'app_settings',
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
