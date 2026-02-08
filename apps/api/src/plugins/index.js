import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { SENSITIVE_FIELDS } from '@dev-leaderboard/shared';
import { config } from '../config.js';

export async function registerPlugins(app) {
  // CORS — parse comma-separated ALLOWED_ORIGINS env var
  const origins = config.allowedOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  await app.register(cors, {
    origin: origins,
    credentials: true,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Custom error handler
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : error.message;

    // Sanitize error — strip any sensitive data
    let sanitized = message;
    for (const field of SENSITIVE_FIELDS) {
      const regex = new RegExp(field + '\\s*[:=]\\s*\\S+', 'gi');
      sanitized = sanitized.replace(regex, `${field}: [REDACTED]`);
    }

    request.log.error({ err: { message: sanitized, stack: error.stack }, statusCode }, 'Request error');
    reply.status(statusCode).send({ error: sanitized });
  });
}

/**
 * Pino serializers that strip sensitive fields from all log output.
 */
export const pinoSerializers = {
  req(request) {
    return {
      method: request.method,
      url: request.url,
      hostname: request.hostname,
      remoteAddress: request.ip,
    };
  },
  res(reply) {
    return {
      statusCode: reply.statusCode,
    };
  },
};

/**
 * Pino redact config — redact any sensitive paths.
 */
export const pinoRedact = {
  paths: SENSITIVE_FIELDS.flatMap((f) => [
    f,
    `*.${f}`,
    `*.*.${f}`,
    `req.headers.authorization`,
  ]),
  remove: true,
};
