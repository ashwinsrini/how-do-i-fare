import { defineStore } from 'pinia';
import { get, post, del } from '@/services/api.js';

export const useCredentialsStore = defineStore('credentials', {
  state: () => ({
    jiraCredentials: [],
    githubCredentials: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchJiraCredentials() {
      this.loading = true;
      this.error = null;
      try {
        const data = await get('/api/v1/credentials/jira');
        this.jiraCredentials = data;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchGithubCredentials() {
      this.loading = true;
      this.error = null;
      try {
        const data = await get('/api/v1/credentials/github');
        this.githubCredentials = data;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async saveJiraCredential(data) {
      this.loading = true;
      this.error = null;
      try {
        await post('/api/v1/credentials/jira', data);
        await this.fetchJiraCredentials();
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async saveGithubCredential(data) {
      this.loading = true;
      this.error = null;
      try {
        await post('/api/v1/credentials/github', data);
        await this.fetchGithubCredentials();
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteJiraCredential(id) {
      this.loading = true;
      this.error = null;
      try {
        await del(`/api/v1/credentials/jira/${id}`);
        await this.fetchJiraCredentials();
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async deleteGithubCredential(id) {
      this.loading = true;
      this.error = null;
      try {
        await del(`/api/v1/credentials/github/${id}`);
        await this.fetchGithubCredentials();
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async testJiraCredential(id) {
      try {
        return await post(`/api/v1/credentials/jira/${id}/test`);
      } catch (err) {
        this.error = err.message;
        throw err;
      }
    },

    async testGithubCredential(id) {
      try {
        return await post(`/api/v1/credentials/github/${id}/test`);
      } catch (err) {
        this.error = err.message;
        throw err;
      }
    },
  },
});
