import { sequelize } from '../index.js';

export async function up() {
  await sequelize.query(`
    ALTER TABLE sync_jobs ADD COLUMN IF NOT EXISTS "currentPhase" TEXT
  `);
}

export async function down() {
  const qi = sequelize.getQueryInterface();
  await qi.removeColumn('sync_jobs', 'currentPhase');
}
