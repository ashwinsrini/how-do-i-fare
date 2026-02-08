import { defineStore } from 'pinia';
import { get } from '@/services/api.js';

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

export const useGithubStore = defineStore('github', {
  state: () => ({
    organizations: [],
    repos: [],
    prsRaised: [],
    prsMerged: [],
    prsReviewed: [],
    linesChanged: [],
    reviewTurnaround: [],
    loading: false,
    _loadingCount: 0,
    filters: {
      credentialId: null,
      orgId: null,
      repoId: null,
      startDate: null,
      endDate: null,
    },
  }),

  actions: {
    _startLoading() {
      this._loadingCount++;
      this.loading = true;
    },
    _stopLoading() {
      this._loadingCount = Math.max(0, this._loadingCount - 1);
      if (this._loadingCount === 0) this.loading = false;
    },

    async fetchOrganizations(credentialId) {
      this._startLoading();
      try {
        const query = buildQuery({ credentialId });
        const data = await get(`/api/v1/github/organizations${query}`);
        this.organizations = data;
      } catch (err) {
        throw err;
      } finally {
        this._stopLoading();
      }
    },

    async fetchRepos(orgId) {
      this._startLoading();
      try {
        const data = await get(`/api/v1/github/organizations/${orgId}/repos`);
        this.repos = data;
      } catch (err) {
        throw err;
      } finally {
        this._stopLoading();
      }
    },

    async fetchPrsRaised() {
      this._startLoading();
      try {
        const query = buildQuery(this.filters);
        const data = await get(`/api/v1/github/leaderboard/prs-raised${query}`);
        this.prsRaised = data;
      } catch (err) {
        throw err;
      } finally {
        this._stopLoading();
      }
    },

    async fetchPrsMerged() {
      this._startLoading();
      try {
        const query = buildQuery(this.filters);
        const data = await get(`/api/v1/github/leaderboard/prs-merged${query}`);
        this.prsMerged = data;
      } catch (err) {
        throw err;
      } finally {
        this._stopLoading();
      }
    },

    async fetchPrsReviewed() {
      this._startLoading();
      try {
        const query = buildQuery(this.filters);
        const data = await get(`/api/v1/github/leaderboard/prs-reviewed${query}`);
        this.prsReviewed = data;
      } catch (err) {
        throw err;
      } finally {
        this._stopLoading();
      }
    },

    async fetchLinesChanged() {
      this._startLoading();
      try {
        const query = buildQuery(this.filters);
        const data = await get(`/api/v1/github/leaderboard/lines-changed${query}`);
        this.linesChanged = data;
      } catch (err) {
        throw err;
      } finally {
        this._stopLoading();
      }
    },

    async fetchReviewTurnaround() {
      this._startLoading();
      try {
        const query = buildQuery(this.filters);
        const data = await get(`/api/v1/github/leaderboard/review-turnaround${query}`);
        this.reviewTurnaround = data;
      } catch (err) {
        throw err;
      } finally {
        this._stopLoading();
      }
    },
  },
});
