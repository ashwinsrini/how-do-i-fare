import { sequelize } from '../index.js';

export async function up() {
  await sequelize.query(`
    ALTER TABLE github_pull_requests ADD COLUMN IF NOT EXISTS "authorName" VARCHAR(255)
  `);
  await sequelize.query(`
    ALTER TABLE github_reviews ADD COLUMN IF NOT EXISTS "reviewerName" VARCHAR(255)
  `);
}

export async function down() {
  const qi = sequelize.getQueryInterface();
  await qi.removeColumn('github_pull_requests', 'authorName');
  await qi.removeColumn('github_reviews', 'reviewerName');
}
