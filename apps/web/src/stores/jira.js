import { defineStore } from 'pinia';
import { get } from '@/services/api.js';

function buildQuery(params) {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  );
  if (entries.length === 0) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, v));
    } else {
      searchParams.append(key, value);
    }
  }
  return `?${searchParams.toString()}`;
}

export const useJiraStore = defineStore('jira', {
  state: () => ({
    projects: [],
    sprints: [],
    statuses: [],
    storyPointsLeaderboard: [],
    ticketsByType: [],
    ticketsByStatus: [],
    loading: false,
    filters: {
      credentialId: null,
      projectId: null,
      sprintId: null,
      startDate: null,
      endDate: null,
      statuses: [],
    },
  }),

  actions: {
    async fetchProjects(credentialId) {
      this.loading = true;
      try {
        const query = buildQuery({ credentialId });
        const data = await get(`/api/v1/jira/projects${query}`);
        this.projects = data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchSprints(projectId) {
      this.loading = true;
      try {
        const data = await get(`/api/v1/jira/projects/${projectId}/sprints`);
        this.sprints = data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchStatuses(credentialId, projectId) {
      this.loading = true;
      try {
        const query = buildQuery({ credentialId, projectId });
        const data = await get(`/api/v1/jira/statuses${query}`);
        this.statuses = data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchStoryPointsLeaderboard() {
      this.loading = true;
      try {
        const params = { ...this.filters };
        // Send statuses as comma-separated string (API expects string type)
        if (Array.isArray(params.statuses) && params.statuses.length > 0) {
          params.statuses = params.statuses.join(',');
        } else {
          delete params.statuses;
        }
        const query = buildQuery(params);
        const data = await get(`/api/v1/jira/leaderboard/story-points${query}`);
        this.storyPointsLeaderboard = data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchTicketsByType() {
      this.loading = true;
      try {
        const { statuses, ...params } = this.filters;
        const query = buildQuery(params);
        const data = await get(`/api/v1/jira/leaderboard/tickets-by-type${query}`);
        this.ticketsByType = data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchTicketsByStatus() {
      this.loading = true;
      try {
        const { statuses, ...params } = this.filters;
        const query = buildQuery(params);
        const data = await get(`/api/v1/jira/leaderboard/tickets-by-status${query}`);
        this.ticketsByStatus = data;
      } catch (err) {
        throw err;
      } finally {
        this.loading = false;
      }
    },
  },
});
