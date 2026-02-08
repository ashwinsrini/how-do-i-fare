import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (3 levels up from apps/api/src/)
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const required = (key) => {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
};

const optional = (key, fallback) => process.env[key] || fallback;

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  api: {
    port: parseInt(optional('API_PORT', '3001'), 10),
    host: optional('API_HOST', '0.0.0.0'),
  },
  db: {
    url: optional('DATABASE_URL', null),
    host: optional('DB_HOST', 'localhost'),
    port: parseInt(optional('DB_PORT', '5432'), 10),
    name: optional('DB_NAME', 'devleaderboard'),
    user: optional('DB_USER', 'devlead'),
    password: optional('DB_PASSWORD', 'devlead'),
    dialect: 'postgres',
  },
  redis: {
    url: optional('REDIS_URL', 'redis://localhost:6379'),
  },
  encryption: {
    masterKey: required('ENCRYPTION_MASTER_KEY'),
  },
  jwt: {
    secret: required('JWT_SECRET'),
  },
  smtp: {
    host: optional('SMTP_HOST', 'localhost'),
    port: parseInt(optional('SMTP_PORT', '587'), 10),
    user: optional('SMTP_USER', ''),
    pass: optional('SMTP_PASS', ''),
    from: optional('SMTP_FROM', 'noreply@devleaderboard.local'),
  },
  sync: {
    defaultIntervalHours: parseInt(optional('DEFAULT_SYNC_INTERVAL_HOURS', '6'), 10),
  },
  worker: {
    concurrency: parseInt(optional('WORKER_CONCURRENCY', '5'), 10),
  },
  frontendUrl: optional('VITE_API_URL', 'http://localhost:5173'),
};
