import { signup, verifyOtp, signin, getMe } from './auth.service.js';

export default async function authRoutes(app) {
  /**
   * POST /signup — Register with name, email, password. Sends OTP.
   */
  app.post('/signup', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 1 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const result = await signup(request.body);
      return reply.status(200).send(result);
    } catch (err) {
      return reply.status(err.statusCode || 500).send({ error: err.message });
    }
  });

  /**
   * POST /verify-otp — Verify email with OTP code. Returns JWT.
   */
  app.post('/verify-otp', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'code'],
        properties: {
          email: { type: 'string', format: 'email' },
          code: { type: 'string', minLength: 6, maxLength: 6 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const result = await verifyOtp(request.body);
      return reply.status(200).send(result);
    } catch (err) {
      return reply.status(err.statusCode || 500).send({ error: err.message });
    }
  });

  /**
   * POST /signin — Sign in with email + password. Returns JWT.
   */
  app.post('/signin', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const result = await signin(request.body);
      return reply.status(200).send(result);
    } catch (err) {
      const body = { error: err.message };
      if (err.needsVerification) body.needsVerification = true;
      return reply.status(err.statusCode || 500).send(body);
    }
  });

  /**
   * GET /me — Get current user info (requires auth).
   */
  app.get('/me', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'Authentication required' });
    }
    try {
      const user = await getMe(request.user.userId);
      return reply.status(200).send(user);
    } catch (err) {
      return reply.status(err.statusCode || 500).send({ error: err.message });
    }
  });
}
