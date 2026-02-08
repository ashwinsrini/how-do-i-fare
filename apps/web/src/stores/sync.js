import { defineStore } from 'pinia';
import { get, post, put } from '@/services/api.js';

export const useSyncStore = defineStore('sync', {
  state: () => ({
    status: null,
    jobs: [],
    settings: {
      syncIntervalHours: 6,
    },
    loading: false,
  }),

  actions: {
    async fetchStatus() {
      this.loading = true;
      try {
        const data = await get('/api/v1/sync/status');
        this.status = data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async triggerSync(type, credentialId) {
      this.loading = true;
      try {
        const data = await post('/api/v1/sync/trigger', { type, credentialId });
        return data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
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
