import { TokenBucketLimiter } from '../../lib/rate-limiter.js';

const limiter = new TokenBucketLimiter({
  maxTokens: 4000,
  refillRate: 4000,
  refillIntervalMs: 3600000,
});

function basicAuth(email, apiToken) {
  return 'Basic ' + Buffer.from(`${email}:${apiToken}`).toString('base64');
}

async function jiraFetch(url, email, apiToken) {
  await limiter.acquire();

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: basicAuth(email, apiToken),
      Accept: 'application/json',
    },
  });

  // Update rate limiter from headers if available
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining !== null) {
    limiter.updateFromHeaders({ 'x-ratelimit-remaining': remaining });
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira API ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Test connection by fetching the current user.
 * GET /rest/api/3/myself
 */
export async function testConnection(domain, email, apiToken) {
  const url = `https://${domain}/rest/api/3/myself`;
  const user = await jiraFetch(url, email, apiToken);
  return {
    accountId: user.accountId,
    displayName: user.displayName,
    emailAddress: user.emailAddress,
    avatarUrl: user.avatarUrls?.['48x48'] || null,
  };
}

/**
 * Fetch all fields defined in the Jira instance.
 * GET /rest/api/3/field
 */
export async function fetchFields(domain, email, apiToken) {
  const url = `https://${domain}/rest/api/3/field`;
  return jiraFetch(url, email, apiToken);
}

/**
 * Find ALL custom field IDs that could contain story points.
 * Jira instances can have multiple estimation fields (e.g. "Story Points",
 * "Story point estimate", etc.) used by different projects.
 */
export function findStoryPointsFields(fields) {
  return fields
    .filter((f) => f.custom && f.name.toLowerCase().includes('story point'))
    .map((f) => ({ id: f.id, name: f.name }));
}

/**
 * Find the custom field ID for story points (returns first match).
 * @deprecated Use findStoryPointsFields for multi-field support.
 */
export function findStoryPointsField(fields) {
  const matches = findStoryPointsFields(fields);
  return matches.length > 0 ? matches[0] : null;
}

/**
 * Find the custom field ID for sprint.
 * In Jira Cloud, "Sprint" is typically customfield_10020 but the ID varies.
 */
export function findSprintField(fields) {
  const match = fields.find(
    (f) => f.custom && f.name.toLowerCase() === 'sprint',
  );
  return match ? { id: match.id, name: match.name } : null;
}

/**
 * Fetch all projects (paginated).
 * GET /rest/api/3/project/search
 */
export async function fetchProjects(domain, email, apiToken) {
  const allProjects = [];
  let startAt = 0;
  const maxResults = 50;
  let isLast = false;
  const maxPages = 100;
  let page = 0;

  while (!isLast && page < maxPages) {
    const url = `https://${domain}/rest/api/3/project/search?startAt=${startAt}&maxResults=${maxResults}`;
    const data = await jiraFetch(url, email, apiToken);
    const values = data.values || [];
    allProjects.push(...values);
    if (values.length === 0) break;
    isLast = data.isLast !== false;
    startAt += maxResults;
    page++;
  }

  return allProjects;
}

/**
 * Fetch all boards for a project (Agile API).
 * GET /rest/agile/1.0/board?projectKeyOrId={key}
 */
export async function fetchBoards(domain, email, apiToken, projectKey) {
  const allBoards = [];
  let startAt = 0;
  const maxResults = 50;
  let isLast = false;
  const maxPages = 100;
  let page = 0;

  while (!isLast && page < maxPages) {
    const url = `https://${domain}/rest/agile/1.0/board?projectKeyOrId=${encodeURIComponent(projectKey)}&startAt=${startAt}&maxResults=${maxResults}`;
    const data = await jiraFetch(url, email, apiToken);
    const values = data.values || [];
    allBoards.push(...values);
    if (values.length === 0) break;
    isLast = data.isLast !== false;
    startAt += maxResults;
    page++;
  }

  return allBoards;
}

/**
 * Fetch all sprints for a board (Agile API, paginated).
 * GET /rest/agile/1.0/board/{boardId}/sprint
 * Returns all sprints including closed ones.
 */
export async function fetchBoardSprints(domain, email, apiToken, boardId) {
  const allSprints = [];
  let startAt = 0;
  const maxResults = 50;
  let isLast = false;
  const maxPages = 100;
  let page = 0;

  while (!isLast && page < maxPages) {
    const url = `https://${domain}/rest/agile/1.0/board/${boardId}/sprint?startAt=${startAt}&maxResults=${maxResults}`;
    const data = await jiraFetch(url, email, apiToken);
    const values = data.values || [];
    allSprints.push(...values);
    if (values.length === 0) break;
    isLast = data.isLast !== false;
    startAt += maxResults;
  }

  return allSprints;
}

/**
 * Search issues using JQL.
 * GET /rest/api/3/search/jql
 */
export async function searchIssues(domain, email, apiToken, jql, startAt = 0, maxResults = 100, fields = []) {
  const params = new URLSearchParams({
    jql,
    startAt: String(startAt),
    maxResults: String(maxResults),
  });
  if (fields.length > 0) {
    params.set('fields', fields.join(','));
  }

  const url = `https://${domain}/rest/api/3/search/jql?${params.toString()}`;
  const data = await jiraFetch(url, email, apiToken);

  return {
    issues: data.issues || [],
    total: data.total || 0,
  };
}
