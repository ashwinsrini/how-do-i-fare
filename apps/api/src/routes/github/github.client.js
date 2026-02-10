import crypto from 'crypto';
import { fetchAllGithubPages } from '../../lib/pagination.js';
import { TokenBucketLimiter } from '../../lib/rate-limiter.js';

const GITHUB_API = 'https://api.github.com';

// Per-credential rate limiter instances (keyed by PAT hash to avoid storing raw tokens)
const limiterMap = new Map();
const LIMITER_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// Periodic cleanup of stale limiters
setInterval(() => {
  const now = Date.now();
  for (const [key, limiter] of limiterMap) {
    if (now - limiter.lastUsed > LIMITER_TTL_MS) {
      limiterMap.delete(key);
    }
  }
}, 10 * 60 * 1000); // every 10 minutes

function getLimiter(pat) {
  const key = crypto.createHash('sha256').update(pat).digest('hex').slice(0, 16);
  if (!limiterMap.has(key)) {
    limiterMap.set(key, new TokenBucketLimiter({
      maxTokens: 5000,
      refillRate: 5000,
      refillIntervalMs: 3600000,
    }));
  }
  return limiterMap.get(key);
}

// Rate-limit callback — set by the worker to surface wait times in the sync progress
let _onRateLimit = null;
export function setOnRateLimit(fn) { _onRateLimit = fn; }

const MAX_RETRIES = 3;

async function ghFetch(url, pat, retryCount = 0) {
  const limiter = getLimiter(pat);
  await limiter.acquire();

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  // Always update rate limiter from headers (even on errors)
  const remaining = res.headers.get('x-ratelimit-remaining');
  if (remaining !== null) {
    const rem = parseInt(remaining, 10);
    limiter.updateFromHeaders({ 'x-ratelimit-remaining': remaining });
    if (rem > 0 && rem % 500 === 0) {
      console.log(`[github-client] Rate limit remaining: ${rem}`);
    }
    if (rem <= 100 && rem > 0 && rem % 25 === 0) {
      console.warn(`[github-client] Rate limit LOW: ${rem} remaining`);
    }
  }

  // Handle rate limit: sleep and retry
  if (res.status === 403 || res.status === 429) {
    if (retryCount < MAX_RETRIES) {
      // Prefer Retry-After header (seconds) for secondary/abuse rate limits
      const retryAfter = res.headers.get('retry-after');
      const resetEpoch = res.headers.get('x-ratelimit-reset');
      let waitMs;

      if (retryAfter) {
        waitMs = parseInt(retryAfter, 10) * 1000 + 1000;
      } else if (resetEpoch) {
        const resetMs = parseInt(resetEpoch, 10) * 1000;
        // Cap at 120s — if reset is far away it's a secondary limit, not primary exhaustion
        waitMs = Math.min(Math.max(resetMs - Date.now(), 0) + 1000, 120000);
      } else {
        waitMs = 60000; // default 60s backoff
      }

      console.warn(`[github-client] Rate limited (${res.status}). Waiting ${Math.ceil(waitMs / 1000)}s before retry...`);
      _onRateLimit?.({ waitMs });
      limiter.tokens = 0;
      await new Promise((r) => setTimeout(r, waitMs));
      limiter.tokens = limiter.maxTokens;
      return ghFetch(url, pat, retryCount + 1);
    }
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }

  const data = await res.json();
  const linkHeader = res.headers.get('link') || '';

  return { data, headers: { link: linkHeader } };
}

/**
 * Fetch the authenticated user.
 * GET /user
 */
export async function fetchUser(pat) {
  const { data } = await ghFetch(`${GITHUB_API}/user`, pat);
  return data;
}

/**
 * Fetch a user's public profile by login.
 * GET /users/{login}
 */
export async function fetchUserProfile(pat, login) {
  const { data } = await ghFetch(`${GITHUB_API}/users/${encodeURIComponent(login)}`, pat);
  return data;
}

/**
 * Test connection by fetching the authenticated user.
 */
export async function testConnection(pat) {
  const user = await fetchUser(pat);
  return {
    login: user.login,
    id: user.id,
    name: user.name,
    avatarUrl: user.avatar_url,
  };
}

/**
 * Fetch all organizations the authenticated user belongs to (paginated).
 * GET /user/orgs
 */
export async function fetchOrgs(pat) {
  return fetchAllGithubPages(`${GITHUB_API}/user/orgs?per_page=100`, (url) =>
    ghFetch(url, pat),
  );
}

/**
 * Fetch all members of an organization (paginated).
 * GET /orgs/{org}/members
 */
export async function fetchOrgMembers(pat, org) {
  return fetchAllGithubPages(
    `${GITHUB_API}/orgs/${encodeURIComponent(org)}/members?per_page=100`,
    (url) => ghFetch(url, pat),
  );
}

/**
 * Fetch all repos for an organization (paginated).
 * GET /orgs/{org}/repos?type=all
 */
export async function fetchOrgRepos(pat, org) {
  return fetchAllGithubPages(
    `${GITHUB_API}/orgs/${encodeURIComponent(org)}/repos?type=all&per_page=100`,
    (url) => ghFetch(url, pat),
  );
}

/**
 * Fetch all repos owned by the authenticated user (paginated).
 * GET /user/repos?type=all&affiliation=owner
 */
export async function fetchUserRepos(pat) {
  return fetchAllGithubPages(
    `${GITHUB_API}/user/repos?affiliation=owner&per_page=100`,
    (url) => ghFetch(url, pat),
  );
}

/**
 * Fetch repos accessible to the user via org membership (paginated).
 * GET /user/repos?affiliation=organization_member
 * Note: `type` and `affiliation` are mutually exclusive on this endpoint.
 */
export async function fetchUserOrgRepos(pat) {
  return fetchAllGithubPages(
    `${GITHUB_API}/user/repos?affiliation=organization_member&per_page=100`,
    (url) => ghFetch(url, pat),
  );
}

/**
 * Fetch pull requests for a repository.
 * GET /repos/{owner}/{repo}/pulls
 */
export async function fetchPullRequests(pat, owner, repo, state = 'all', page = 1, perPage = 100, sort = 'created') {
  const params = new URLSearchParams({
    state,
    page: String(page),
    per_page: String(perPage),
    sort,
    direction: 'desc',
  });
  const { data, headers } = await ghFetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${params.toString()}`,
    pat,
  );
  return { data, headers };
}

/**
 * Fetch detailed PR info (includes lines added/deleted).
 * GET /repos/{owner}/{repo}/pulls/{number}
 */
export async function fetchPRDetail(pat, owner, repo, number) {
  const { data } = await ghFetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`,
    pat,
  );
  return data;
}

/**
 * Fetch reviews for a pull request.
 * GET /repos/{owner}/{repo}/pulls/{number}/reviews
 */
export async function fetchPRReviews(pat, owner, repo, number) {
  return fetchAllGithubPages(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}/reviews?per_page=100`,
    (url) => ghFetch(url, pat),
  );
}
