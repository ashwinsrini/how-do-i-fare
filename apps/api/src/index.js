import Fastify from 'fastify';
import { config } from './config.js';
import { registerPlugins, pinoSerializers, pinoRedact } from './plugins/index.js';
import { sequelize } from './db/models/index.js';
import { registerRoutes } from './routes/index.js';
import { initScheduler } from './jobs/schedulers/sync-scheduler.js';

const app = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    serializers: pinoSerializers,
    redact: pinoRedact,
  },
});

async function start() {
  try {
    // Register plugins
    await registerPlugins(app);

    // Register routes
    await registerRoutes(app);

    // Health check
    app.get('/api/v1/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

    // Sync DB — alter:true in dev only (auto-adjusts columns). Use migrations for production.
    await sequelize.sync({ alter: config.nodeEnv === 'development' });
    app.log.info('Database synced');

    // Init background job scheduler
    await initScheduler(app.log);

    // Start server
    await app.listen({ port: config.api.port, host: config.api.host });
    app.log.info(`Server listening on ${config.api.host}:${config.api.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(reason) {
  app.log.info(`Shutting down (${reason})...`);
  try { await app.close(); } catch {}
  try { await sequelize.close(); } catch {}
  process.exit(reason === 'uncaughtException' || reason === 'unhandledRejection' ? 1 : 0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  app.log.error(err, 'Uncaught exception');
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (err) => {
  app.log.error(err, 'Unhandled rejection');
  shutdown('unhandledRejection');
});

start();
