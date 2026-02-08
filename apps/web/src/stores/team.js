import { defineStore } from 'pinia';
import { get, post, put, del } from '@/services/api.js';

function buildQuery(params) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== ''
  );
  if (entries.length === 0) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of entries) {
    searchParams.append(key, value);
  }
  return `?${searchParams.toString()}`;
}

export const useTeamStore = defineStore('team', {
  state: () => ({
    members: [],
    jiraUsers: [],
    githubUsers: [],
    suggestions: [],
    profile: null,
    comparison: [],
    cycleTime: [],
    reviewMatrix: null,
    trends: [],
    loading: false,
  }),

  actions: {
    // ─── CRUD ──────────────────────────────────────────────────────────

    async fetchMembers() {
      this.loading = true;
      try {
        this.members = await get('/api/v1/team/members');
      } finally {
        this.loading = false;
      }
    },

    async createMember(data) {
      const member = await post('/api/v1/team/members', data);
      this.members.push(member);
      return member;
    },

    async updateMember(id, data) {
      const member = await put(`/api/v1/team/members/${id}`, data);
      const idx = this.members.findIndex((m) => m.id === id);
      if (idx !== -1) this.members[idx] = member;
      return member;
    },

    async deleteMember(id) {
      await del(`/api/v1/team/members/${id}`);
      this.members = this.members.filter((m) => m.id !== id);
    },

    // ─── Discovery ─────────────────────────────────────────────────────

    async fetchJiraUsers() {
      this.jiraUsers = await get('/api/v1/team/discover/jira-users');
    },

    async fetchGithubUsers() {
      this.githubUsers = await get('/api/v1/team/discover/github-users');
    },

    async fetchSuggestions() {
      this.suggestions = await get('/api/v1/team/suggest');
    },

    // ─── Profile & Comparison ──────────────────────────────────────────

    async fetchProfile(id, { startDate, endDate } = {}) {
      this.loading = true;
      try {
        const query = buildQuery({ startDate, endDate });
        this.profile = await get(`/api/v1/team/members/${id}/profile${query}`);
      } finally {
        this.loading = false;
      }
    },

    async fetchComparison(ids, { startDate, endDate } = {}) {
      this.loading = true;
      try {
        const query = buildQuery({ ids: ids.join(','), startDate, endDate });
        this.comparison = await get(`/api/v1/team/compare${query}`);
      } finally {
        this.loading = false;
      }
    },

    // ─── Metrics ───────────────────────────────────────────────────────

    async fetchCycleTime({ credentialId, startDate, endDate } = {}) {
      this.loading = true;
      try {
        const query = buildQuery({ credentialId, startDate, endDate });
        this.cycleTime = await get(`/api/v1/team/metrics/cycle-time${query}`);
      } finally {
        this.loading = false;
      }
    },

    async fetchReviewMatrix({ credentialId, startDate, endDate } = {}) {
      this.loading = true;
      try {
        const query = buildQuery({ credentialId, startDate, endDate });
        this.reviewMatrix = await get(`/api/v1/team/metrics/review-matrix${query}`);
      } finally {
        this.loading = false;
      }
    },

    async fetchTrends({ metric, interval, credentialId, startDate, endDate } = {}) {
      this.loading = true;
      try {
        const query = buildQuery({ metric, interval, credentialId, startDate, endDate });
        this.trends = await get(`/api/v1/team/metrics/trends${query}`);
      } finally {
        this.loading = false;
      }
    },
  },
});
