import { defineStore } from 'pinia';
import { post, get } from '@/services/api.js';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('auth_token') || null,
    user: null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    setToken(token) {
      this.token = token;
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    },

    async signup({ name, email, password }) {
      this.loading = true;
      this.error = null;
      try {
        const data = await post('/api/v1/auth/signup', { name, email, password });
        return data;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async verifyOtp({ email, code }) {
      this.loading = true;
      this.error = null;
      try {
        const data = await post('/api/v1/auth/verify-otp', { email, code });
        this.setToken(data.token);
        this.user = data.user;
        return data;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async signin({ email, password }) {
      this.loading = true;
      this.error = null;
      try {
        const data = await post('/api/v1/auth/signin', { email, password });
        this.setToken(data.token);
        this.user = data.user;
        return data;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async fetchMe() {
      if (!this.token) return null;
      try {
        const user = await get('/api/v1/auth/me');
        this.user = user;
        return user;
      } catch {
        // Token invalid/expired
        this.logout();
        return null;
      }
    },

    logout() {
      this.setToken(null);
      this.user = null;
    },
  },
});
