import { sequelize } from '../index.js';

export async function up() {
  await sequelize.query(`
    ALTER TYPE enum_sync_jobs_status ADD VALUE IF NOT EXISTS 'cancelled'
  `);
  await sequelize.query(`
    ALTER TABLE sync_jobs ADD COLUMN IF NOT EXISTS "queueJobId" VARCHAR(255)
  `);
}

export async function down() {
  const qi = sequelize.getQueryInterface();
  await qi.removeColumn('sync_jobs', 'queueJobId');
}
