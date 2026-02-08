export function isValidDomain(domain) {
  if (typeof domain !== 'string') return false;
  return /^[a-zA-Z0-9-]+\.atlassian\.net$/.test(domain);
}

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isNonEmptyString(val) {
  return typeof val === 'string' && val.trim().length > 0;
}

export function isPositiveInteger(val) {
  return Number.isInteger(val) && val > 0;
}
