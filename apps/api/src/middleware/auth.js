import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function authMiddleware(app) {
  app.addHook('onRequest', async (request, reply) => {
    // Skip auth for public routes (but not /me which needs the token)
    const path = request.url.split('?')[0];
    if (
      (path.startsWith('/api/v1/auth') && path !== '/api/v1/auth/me') ||
      path === '/api/v1/health'
    ) {
      return;
    }

    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] });
      request.user = { userId: payload.userId, email: payload.email };
    } catch (err) {
      request.log.warn({ err: err.message }, 'JWT verification failed');
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });
}
