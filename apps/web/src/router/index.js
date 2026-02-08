import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('@/views/SetupView.vue'),
  },
  {
    path: '/jira',
    name: 'JiraLeaderboard',
    component: () => import('@/views/JiraLeaderboardView.vue'),
  },
  {
    path: '/github',
    name: 'GithubLeaderboard',
    component: () => import('@/views/GithubLeaderboardView.vue'),
  },
  {
    path: '/team',
    name: 'Team',
    component: () => import('@/views/TeamView.vue'),
  },
  {
    path: '/team/:id',
    name: 'TeamMemberProfile',
    component: () => import('@/views/TeamMemberProfileView.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('@/views/SettingsView.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  if (to.meta.public) return true;

  const authStore = useAuthStore();
  if (!authStore.isAuthenticated) {
    return { name: 'Login' };
  }
  return true;
});

export default router;
