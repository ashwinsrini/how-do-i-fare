/**
 * One-time migration script: Migrate from per-credential scoping to global entities.
 *
 * Run: node apps/api/src/scripts/migrate-to-global-schema.js
 *
 * This script:
 * 1. Creates JiraInstance records from unique domains in jira_credentials
 * 2. Migrates JiraProject: replaces credentialId with instanceId, creates junction entries
 * 3. Migrates GithubOrganization: deduplicates by githubOrgId, creates junction entries
 * 4. Re-points repos from duplicate orgs to the kept org
 * 5. Cleans up duplicate records
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

import { sequelize } from '../db/models/index.js';

async function migrate() {
  console.log('[migrate] Starting global schema migration...');

  const transaction = await sequelize.transaction();

  try {
    // ─── Step 1: GitHub Organizations ─────────────────────────────────────

    // Find all unique githubOrgIds with multiple records (per-credential duplicates)
    const [orgGroups] = await sequelize.query(`
      SELECT "githubOrgId", array_agg(id ORDER BY id) AS ids, array_agg("credentialId" ORDER BY id) AS credential_ids
      FROM github_organizations
      WHERE "credentialId" IS NOT NULL
      GROUP BY "githubOrgId"
      HAVING COUNT(*) > 0
    `, { transaction });

    console.log(`[migrate] Found ${orgGroups.length} unique GitHub org groups to migrate`);

    for (const group of orgGroups) {
      const keepId = group.ids[0]; // Keep the first record
      const duplicateIds = group.ids.slice(1);

      // Create junction entries for ALL credentials that had this org
      for (let i = 0; i < group.credential_ids.length; i++) {
        const credId = group.credential_ids[i];
        if (credId) {
          await sequelize.query(`
            INSERT INTO credential_github_orgs ("credentialId", "organizationId", "createdAt", "updatedAt")
            VALUES (:credentialId, :organizationId, NOW(), NOW())
            ON CONFLICT ("credentialId", "organizationId") DO NOTHING
          `, {
            replacements: { credentialId: credId, organizationId: keepId },
            transaction,
          });
        }
      }

      // Re-point repos from duplicate orgs to the kept one
      if (duplicateIds.length > 0) {
        for (const dupId of duplicateIds) {
          // Check for repo conflicts before re-pointing
          await sequelize.query(`
            UPDATE github_repositories
            SET "organizationId" = :keepId
            WHERE "organizationId" = :dupId
              AND "githubRepoId" NOT IN (
                SELECT "githubRepoId" FROM github_repositories WHERE "organizationId" = :keepId
              )
          `, { replacements: { keepId, dupId }, transaction });

          // Delete duplicate repos that already exist in the kept org
          await sequelize.query(`
            DELETE FROM github_repositories WHERE "organizationId" = :dupId
          `, { replacements: { dupId }, transaction });

          // Re-point members
          await sequelize.query(`
            UPDATE github_org_members
            SET "organizationId" = :keepId
            WHERE "organizationId" = :dupId
              AND "githubUserId" NOT IN (
                SELECT "githubUserId" FROM github_org_members WHERE "organizationId" = :keepId
              )
          `, { replacements: { keepId, dupId }, transaction });

          await sequelize.query(`
            DELETE FROM github_org_members WHERE "organizationId" = :dupId
          `, { replacements: { dupId }, transaction });

          // Delete duplicate org
          await sequelize.query(`
            DELETE FROM github_organizations WHERE id = :dupId
          `, { replacements: { dupId }, transaction });
        }
      }
    }

    // Remove credentialId column from github_organizations (if it exists)
    try {
      await sequelize.query(`
        ALTER TABLE github_organizations DROP COLUMN IF EXISTS "credentialId"
      `, { transaction });
    } catch {
      console.log('[migrate] credentialId column already removed from github_organizations');
    }

    console.log('[migrate] GitHub organizations migrated');

    // ─── Step 2: Jira Projects ────────────────────────────────────────────

    // Create JiraInstance records for each unique domain
    const [domains] = await sequelize.query(`
      SELECT DISTINCT domain FROM jira_credentials
    `, { transaction });

    for (const { domain } of domains) {
      await sequelize.query(`
        INSERT INTO jira_instances (domain, "createdAt", "updatedAt")
        VALUES (:domain, NOW(), NOW())
        ON CONFLICT (domain) DO NOTHING
      `, { replacements: { domain }, transaction });
    }

    console.log(`[migrate] Created ${domains.length} JiraInstance records`);

    // Check if credentialId column still exists on jira_projects
    const [projCols] = await sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'jira_projects' AND column_name = 'credentialId'
    `, { transaction });

    if (projCols.length > 0) {
      // Add instanceId column if it doesn't exist
      await sequelize.query(`
        ALTER TABLE jira_projects ADD COLUMN IF NOT EXISTS "instanceId" BIGINT
      `, { transaction });

      // For each project, find the credential's domain, look up the instance, set instanceId
      await sequelize.query(`
        UPDATE jira_projects jp
        SET "instanceId" = ji.id
        FROM jira_credentials jc
        INNER JOIN jira_instances ji ON ji.domain = jc.domain
        WHERE jp."credentialId" = jc.id
          AND jp."instanceId" IS NULL
      `, { transaction });

      // Create junction entries
      await sequelize.query(`
        INSERT INTO credential_jira_projects ("credentialId", "projectId", "createdAt", "updatedAt")
        SELECT jp."credentialId", jp.id, NOW(), NOW()
        FROM jira_projects jp
        WHERE jp."credentialId" IS NOT NULL
        ON CONFLICT ("credentialId", "projectId") DO NOTHING
      `, { transaction });

      // Deduplicate projects with same instanceId + jiraProjectId
      const [dupProjects] = await sequelize.query(`
        SELECT "instanceId", "jiraProjectId", array_agg(id ORDER BY id) AS ids
        FROM jira_projects
        WHERE "instanceId" IS NOT NULL
        GROUP BY "instanceId", "jiraProjectId"
        HAVING COUNT(*) > 1
      `, { transaction });

      for (const dp of dupProjects) {
        const keepId = dp.ids[0];
        const dupIds = dp.ids.slice(1);

        for (const dupId of dupIds) {
          // Move junction entries
          await sequelize.query(`
            UPDATE credential_jira_projects SET "projectId" = :keepId
            WHERE "projectId" = :dupId
              AND "credentialId" NOT IN (
                SELECT "credentialId" FROM credential_jira_projects WHERE "projectId" = :keepId
              )
          `, { replacements: { keepId, dupId }, transaction });

          await sequelize.query(`
            DELETE FROM credential_jira_projects WHERE "projectId" = :dupId
          `, { replacements: { dupId }, transaction });

          // Re-point sprints
          await sequelize.query(`
            UPDATE jira_sprints SET "projectId" = :keepId
            WHERE "projectId" = :dupId
              AND "jiraSprintId" NOT IN (
                SELECT "jiraSprintId" FROM jira_sprints WHERE "projectId" = :keepId
              )
          `, { replacements: { keepId, dupId }, transaction });

          await sequelize.query(`
            DELETE FROM jira_sprints WHERE "projectId" = :dupId
          `, { replacements: { dupId }, transaction });

          // Re-point issues
          await sequelize.query(`
            UPDATE jira_issues SET "projectId" = :keepId
            WHERE "projectId" = :dupId
              AND "jiraIssueId" NOT IN (
                SELECT "jiraIssueId" FROM jira_issues WHERE "projectId" = :keepId
              )
          `, { replacements: { keepId, dupId }, transaction });

          await sequelize.query(`
            DELETE FROM jira_issues WHERE "projectId" = :dupId
          `, { replacements: { dupId }, transaction });

          // Delete duplicate project
          await sequelize.query(`
            DELETE FROM jira_projects WHERE id = :dupId
          `, { replacements: { dupId }, transaction });
        }
      }

      // Make instanceId NOT NULL and drop credentialId
      await sequelize.query(`
        ALTER TABLE jira_projects ALTER COLUMN "instanceId" SET NOT NULL
      `, { transaction }).catch(() => {
        console.log('[migrate] Could not set instanceId NOT NULL (may have null values)');
      });

      await sequelize.query(`
        ALTER TABLE jira_projects DROP COLUMN IF EXISTS "credentialId"
      `, { transaction });

      console.log('[migrate] Jira projects migrated');
    } else {
      console.log('[migrate] Jira projects already migrated (no credentialId column)');
    }

    // ─── Step 3: Deduplicate global GitHub entities ──────────────────────

    // Deduplicate repos by githubRepoId
    const [dupRepos] = await sequelize.query(`
      SELECT "githubRepoId", array_agg(id ORDER BY id) AS ids
      FROM github_repositories
      GROUP BY "githubRepoId"
      HAVING COUNT(*) > 1
    `, { transaction });

    for (const dr of dupRepos) {
      const keepId = dr.ids[0];
      for (const dupId of dr.ids.slice(1)) {
        await sequelize.query(`
          UPDATE github_pull_requests SET "repositoryId" = :keepId
          WHERE "repositoryId" = :dupId
            AND "githubPrId" NOT IN (
              SELECT "githubPrId" FROM github_pull_requests WHERE "repositoryId" = :keepId
            )
        `, { replacements: { keepId, dupId }, transaction });

        await sequelize.query(`DELETE FROM github_pull_requests WHERE "repositoryId" = :dupId`, { replacements: { dupId }, transaction });
        await sequelize.query(`DELETE FROM github_repositories WHERE id = :dupId`, { replacements: { dupId }, transaction });
      }
    }

    // Deduplicate PRs by githubPrId
    const [dupPrs] = await sequelize.query(`
      SELECT "githubPrId", array_agg(id ORDER BY id) AS ids
      FROM github_pull_requests
      GROUP BY "githubPrId"
      HAVING COUNT(*) > 1
    `, { transaction });

    for (const dp of dupPrs) {
      const keepId = dp.ids[0];
      for (const dupId of dp.ids.slice(1)) {
        await sequelize.query(`
          UPDATE github_reviews SET "pullRequestId" = :keepId
          WHERE "pullRequestId" = :dupId
            AND "githubReviewId" NOT IN (
              SELECT "githubReviewId" FROM github_reviews WHERE "pullRequestId" = :keepId
            )
        `, { replacements: { keepId, dupId }, transaction });

        await sequelize.query(`DELETE FROM github_reviews WHERE "pullRequestId" = :dupId`, { replacements: { dupId }, transaction });
        await sequelize.query(`DELETE FROM github_pull_requests WHERE id = :dupId`, { replacements: { dupId }, transaction });
      }
    }

    // Deduplicate reviews by githubReviewId
    const [dupReviews] = await sequelize.query(`
      SELECT "githubReviewId", array_agg(id ORDER BY id) AS ids
      FROM github_reviews
      GROUP BY "githubReviewId"
      HAVING COUNT(*) > 1
    `, { transaction });

    for (const dr of dupReviews) {
      for (const dupId of dr.ids.slice(1)) {
        await sequelize.query(`DELETE FROM github_reviews WHERE id = :dupId`, { replacements: { dupId }, transaction });
      }
    }

    console.log('[migrate] Deduplication complete');

    await transaction.commit();
    console.log('[migrate] Migration completed successfully!');
  } catch (err) {
    await transaction.rollback();
    console.error('[migrate] Migration failed, rolled back:', err.message);
    throw err;
  } finally {
    await sequelize.close();
  }
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
