#!/usr/bin/env node
import { sequelize } from './index.js';
import { QueryTypes } from 'sequelize';
import { readdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, 'migrations');
const TABLE = 'sequelize_migrations';

async function ensureMigrationsTable() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "${TABLE}" (
      name VARCHAR(255) PRIMARY KEY,
      "runAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `);
}

async function getCompleted() {
  const rows = await sequelize.query(
    `SELECT name FROM "${TABLE}" ORDER BY name`,
    { type: QueryTypes.SELECT },
  );
  return new Set(rows.map((r) => r.name));
}

async function run() {
  try {
    await sequelize.authenticate();
    await ensureMigrationsTable();

    let files;
    try {
      files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.js')).sort();
    } catch {
      console.log('No migrations directory found. Nothing to do.');
      process.exit(0);
    }

    const completed = await getCompleted();
    const pending = files.filter((f) => !completed.has(f));

    if (pending.length === 0) {
      console.log('All migrations are up to date.');
      process.exit(0);
    }

    for (const file of pending) {
      console.log(`Running migration: ${file}`);
      const migration = await import(join(MIGRATIONS_DIR, file));
      await migration.up();
      await sequelize.query(
        `INSERT INTO "${TABLE}" (name) VALUES (:name)`,
        { replacements: { name: file } },
      );
      console.log(`  Done: ${file}`);
    }

    console.log(`\n${pending.length} migration(s) applied.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
