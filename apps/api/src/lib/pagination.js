/**
 * Parse GitHub Link header for pagination.
 * Returns an object like { next: 'url', last: 'url' }
 */
export function parseGithubLinkHeader(linkHeader) {
  if (!linkHeader) return {};
  const links = {};
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (match) {
      links[match[2]] = match[1];
    }
  }
  return links;
}

/**
 * Paginate through all pages of a GitHub API endpoint.
 * fetchFn receives (url) and returns { data, headers }.
 */
export async function fetchAllGithubPages(initialUrl, fetchFn) {
  const allItems = [];
  let url = initialUrl;

  while (url) {
    const { data, headers } = await fetchFn(url);
    if (Array.isArray(data)) {
      allItems.push(...data);
    }
    const links = parseGithubLinkHeader(headers.link || headers.Link);
    url = links.next || null;
  }

  return allItems;
}

/**
 * Paginate through Jira search results.
 * fetchFn receives (startAt) and returns { issues, total }.
 */
export async function fetchAllJiraPages(fetchFn, maxResults = 100) {
  const allItems = [];
  let startAt = 0;
  let total = Infinity;

  while (startAt < total) {
    const result = await fetchFn(startAt, maxResults);
    allItems.push(...result.issues);
    total = result.total;
    startAt += maxResults;
  }

  return allItems;
}
