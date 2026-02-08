import { authMiddleware } from '../middleware/auth.js';
import authRoutes from './auth/auth.routes.js';
import credentialsRoutes from './credentials.routes.js';
import jiraRoutes from './jira/jira.routes.js';
import githubRoutes from './github/github.routes.js';
import syncRoutes from './sync/sync.routes.js';
import teamRoutes from './team/team.routes.js';

export async function registerRoutes(app) {
  // Auth routes (public — no JWT required)
  await app.register(authRoutes, { prefix: '/api/v1/auth' });

  // Apply auth middleware to all subsequent routes
  authMiddleware(app);

  await app.register(credentialsRoutes, { prefix: '/api/v1/credentials' });
  await app.register(jiraRoutes, { prefix: '/api/v1/jira' });
  await app.register(githubRoutes, { prefix: '/api/v1/github' });
  await app.register(syncRoutes, { prefix: '/api/v1/sync' });
  await app.register(teamRoutes, { prefix: '/api/v1/team' });
}
