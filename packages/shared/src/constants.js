export const SYNC_TYPES = {
  JIRA: 'jira',
  GITHUB: 'github',
};

export const SYNC_STATUSES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

export const SYNC_TRIGGERS = {
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
};

export const GITHUB_PR_STATES = {
  OPEN: 'open',
  CLOSED: 'closed',
};

export const GITHUB_REVIEW_STATES = {
  APPROVED: 'APPROVED',
  CHANGES_REQUESTED: 'CHANGES_REQUESTED',
  COMMENTED: 'COMMENTED',
  DISMISSED: 'DISMISSED',
};

export const JIRA_STATUS_CATEGORIES = {
  NEW: 'new',
  INDETERMINATE: 'indeterminate',
  DONE: 'done',
};

export const DEFAULT_SYNC_INTERVAL_HOURS = 6;

export const SYNC_INTERVAL_OPTIONS = [1, 3, 6, 12, 24];

export const SENSITIVE_FIELDS = [
  'apiToken',
  'pat',
  'token',
  'password',
  'authorization',
  'secret',
];
