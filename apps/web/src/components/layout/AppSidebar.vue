<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();

const navItems = [
  { label: 'Dashboard', path: '/', icon: 'pi pi-home' },
  { label: 'Setup', path: '/setup', icon: 'pi pi-cog' },
  { label: 'Jira Leaderboard', path: '/jira', icon: 'pi pi-chart-bar' },
  { label: 'GitHub Leaderboard', path: '/github', icon: 'pi pi-github' },
  { label: 'Team', path: '/team', icon: 'pi pi-users' },
  { label: 'Settings', path: '/settings', icon: 'pi pi-sliders-h' },
];

const isActive = (path) => {
  if (path === '/') return route.path === '/';
  return route.path === path || route.path.startsWith(path + '/');
};
</script>

<template>
  <aside class="w-64 bg-white border-r h-full py-4">
    <nav class="flex flex-col gap-1 px-3">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
        :class="
          isActive(item.path)
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        "
      >
        <i :class="item.icon" class="text-base"></i>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>
