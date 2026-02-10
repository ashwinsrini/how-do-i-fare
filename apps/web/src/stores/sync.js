import { defineStore } from 'pinia';
import { get, post, put } from '@/services/api.js';

const POLL_INTERVAL_MS = 10_000;

export const useSyncStore = defineStore('sync', {
  state: () => ({
    status: null,
    jobs: [],
    settings: {
      syncIntervalHours: 6,
    },
    loading: false,
    pollingInterval: null,
  }),

  getters: {
    isSyncing(state) {
      return state.status?.running?.length > 0;
    },
    runningJobs(state) {
      return state.status?.running || [];
    },
    recentJobs(state) {
      const last = state.status?.lastCompleted || {};
      const completed = [last.jira, last.github].filter(Boolean);
      return completed.sort(
        (a, b) => new Date(b.completedAt) - new Date(a.completedAt),
      );
    },
  },

  actions: {
    async fetchStatus() {
      try {
        const data = await get('/api/v1/sync/status');
        this.status = data;
      } catch (err) {
        throw err;
      }
    },

    startPolling() {
      if (this.pollingInterval) return;
      this.pollingInterval = setInterval(async () => {
        try {
          await this.fetchStatus();
          if (!this.isSyncing) {
            this.stopPolling();
          }
        } catch {
          // ignore polling errors
        }
      }, POLL_INTERVAL_MS);
    },

    stopPolling() {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }
    },

    async triggerSync(type, credentialId) {
      this.loading = true;
      try {
        const data = await post('/api/v1/sync/trigger', { type, credentialId });
        await this.fetchStatus();
        this.startPolling();
        return data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async triggerAdvancedSync(type, credentialId, filters) {
      this.loading = true;
      try {
        const data = await post('/api/v1/sync/trigger', { type, credentialId, filters });
        await this.fetchStatus();
        this.startPolling();
        return data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async cancelSync(syncJobId) {
      try {
        await post(`/api/v1/sync/cancel/${syncJobId}`, {});
        await this.fetchStatus();
      } catch (err) {
        throw err;
      }
    },

    async fetchJobs() {
      this.loading = true;
      try {
        const data = await get('/api/v1/sync/jobs');
        this.jobs = data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchSettings() {
      this.loading = true;
      try {
        const data = await get('/api/v1/sync/settings');
        this.settings = data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async updateSettings(data) {
      this.loading = true;
      try {
        const result = await put('/api/v1/sync/settings', data);
        this.settings = result;
        return result;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
