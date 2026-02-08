import { JiraCredential, GithubCredential } from '../db/models/index.js';
import { encrypt, decrypt } from '../lib/crypto.js';
import { testConnection as testJiraConnection } from './jira/jira.client.js';
import { testConnection as testGithubConnection } from './github/github.client.js';

// --- Schemas ---

const jiraCredentialBody = {
  type: 'object',
  required: ['label', 'domain', 'email', 'apiToken'],
  properties: {
    label: { type: 'string', minLength: 1 },
    domain: { type: 'string', minLength: 1 },
    email: { type: 'string', format: 'email' },
    apiToken: { type: 'string', minLength: 1 },
  },
};

const githubCredentialBody = {
  type: 'object',
  required: ['label', 'pat'],
  properties: {
    label: { type: 'string', minLength: 1 },
    pat: { type: 'string', minLength: 1 },
  },
};

const idParam = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string' },
  },
};

export default async function credentialsRoutes(app) {
  // ===================== JIRA =====================

  /**
   * POST /jira — Save Jira credentials
   * Validates connection first, encrypts token, auto-detects story points field.
   */
  app.post('/jira', {
    schema: { body: jiraCredentialBody },
  }, async (request, reply) => {
    const { label, email, apiToken } = request.body;
    let { domain } = request.body;

    // Append .atlassian.net if the user only provided the subdomain
    if (!domain.includes('.')) {
      domain = `${domain}.atlassian.net`;
    }

    // Test-only mode: validate connection without saving
    const testOnly = request.headers['x-test-only'] === 'true';

    // Validate connection before saving
    try {
      await testJiraConnection(domain, email, apiToken);
    } catch (err) {
      return reply.status(400).send({
        error: `Failed to connect to Jira: ${err.message}`,
      });
    }

    if (testOnly) {
      return reply.status(200).send({ success: true, message: 'Connection verified' });
    }

    // Auto-detect story points field
    let storyPointsFieldId = null;
    try {
      const { fetchFields, findStoryPointsField } = await import('./jira/jira.client.js');
      const fields = await fetchFields(domain, email, apiToken);
      const spField = findStoryPointsField(fields);
      if (spField) {
        storyPointsFieldId = spField.id;
      }
    } catch {
      // Non-fatal — continue without story points field
    }

    const encryptedToken = encrypt(apiToken);

    const credential = await JiraCredential.create({
      label,
      domain,
      email,
      apiToken: encryptedToken,
      storyPointsFieldId,
      isActive: true,
      userId: request.user.userId,
    });

    return reply.status(201).send({
      id: credential.id,
      label: credential.label,
      domain: credential.domain,
      email: credential.email,
      storyPointsFieldId: credential.storyPointsFieldId,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
    });
  });

  /**
   * GET /jira — List all Jira credentials (never return apiToken)
   */
  app.get('/jira', {
    schema: {
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              domain: { type: 'string' },
              email: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const credentials = await JiraCredential.findAll({
      where: { userId: request.user.userId },
      attributes: ['id', 'label', 'domain', 'email', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    return credentials;
  });

  /**
   * DELETE /jira/:id — Delete a Jira credential (cascades)
   */
  app.delete('/jira/:id', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;
    const credential = await JiraCredential.findOne({ where: { id, userId: request.user.userId } });
    if (!credential) {
      return reply.status(404).send({ error: 'Jira credential not found' });
    }
    await credential.destroy();
    return reply.status(200).send({ message: 'Deleted successfully' });
  });

  /**
   * POST /jira/:id/test — Test Jira connectivity
   */
  app.post('/jira/:id/test', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;
    const credential = await JiraCredential.findOne({ where: { id, userId: request.user.userId } });
    if (!credential) {
      return reply.status(404).send({ error: 'Jira credential not found' });
    }

    try {
      const decryptedToken = decrypt(credential.apiToken);
      const user = await testJiraConnection(credential.domain, credential.email, decryptedToken);
      return { success: true, user };
    } catch (err) {
      return reply.status(400).send({
        success: false,
        error: `Connection failed: ${err.message}`,
      });
    }
  });

  // ===================== GITHUB =====================

  /**
   * POST /github — Save GitHub PAT
   * Validates connection first, encrypts PAT, stores username.
   */
  app.post('/github', {
    schema: { body: githubCredentialBody },
  }, async (request, reply) => {
    const { label, pat } = request.body;

    // Validate connection before saving
    let userInfo;
    try {
      userInfo = await testGithubConnection(pat);
    } catch (err) {
      return reply.status(400).send({
        error: `Failed to connect to GitHub: ${err.message}`,
      });
    }

    const encryptedPat = encrypt(pat);

    const credential = await GithubCredential.create({
      label,
      pat: encryptedPat,
      username: userInfo.login,
      isActive: true,
      userId: request.user.userId,
    });

    return reply.status(201).send({
      id: credential.id,
      label: credential.label,
      username: credential.username,
      isActive: credential.isActive,
      createdAt: credential.createdAt,
    });
  });

  /**
   * GET /github — List all GitHub credentials (never return pat)
   */
  app.get('/github', {
    schema: {
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              username: { type: 'string' },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request) => {
    const credentials = await GithubCredential.findAll({
      where: { userId: request.user.userId },
      attributes: ['id', 'label', 'username', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    return credentials;
  });

  /**
   * DELETE /github/:id — Delete a GitHub credential (cascades)
   */
  app.delete('/github/:id', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;
    const credential = await GithubCredential.findOne({ where: { id, userId: request.user.userId } });
    if (!credential) {
      return reply.status(404).send({ error: 'GitHub credential not found' });
    }
    await credential.destroy();
    return reply.status(200).send({ message: 'Deleted successfully' });
  });

  /**
   * POST /github/:id/test — Test GitHub connectivity
   */
  app.post('/github/:id/test', {
    schema: { params: idParam },
  }, async (request, reply) => {
    const { id } = request.params;
    const credential = await GithubCredential.findOne({ where: { id, userId: request.user.userId } });
    if (!credential) {
      return reply.status(404).send({ error: 'GitHub credential not found' });
    }

    try {
      const decryptedPat = decrypt(credential.pat);
      const user = await testGithubConnection(decryptedPat);
      return { success: true, user };
    } catch (err) {
      return reply.status(400).send({
        success: false,
        error: `Connection failed: ${err.message}`,
      });
    }
  });
}
