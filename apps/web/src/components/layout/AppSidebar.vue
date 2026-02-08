<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();

const navItems = [
  { label: 'Dashboard', path: '/', icon: 'pi pi-objects-column' },
  { label: 'Setup', path: '/setup', icon: 'pi pi-wrench' },
  { label: 'Jira', path: '/jira', icon: 'pi pi-chart-bar' },
  { label: 'GitHub', path: '/github', icon: 'pi pi-github' },
  { label: 'Team', path: '/team', icon: 'pi pi-users' },
  { label: 'Settings', path: '/settings', icon: 'pi pi-cog' },
];

const isActive = (path) => {
  if (path === '/') return route.path === '/';
  return route.path === path || route.path.startsWith(path + '/');
};
</script>

<template>
  <aside class="w-56 bg-white border-r border-surface-200/80 flex flex-col">
    <nav class="flex flex-col gap-0.5 px-3 py-4 flex-1">
      <router-link
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150"
        :class="
          isActive(item.path)
            ? 'bg-emerald-50 text-emerald-700 shadow-soft'
            : 'text-surface-500 hover:bg-surface-50 hover:text-surface-700'
        "
      >
        <i
          :class="item.icon"
          class="text-sm w-4 text-center"
          :style="isActive(item.path) ? 'color: #059669' : ''"
        ></i>
        <span>{{ item.label }}</span>
      </router-link>
    </nav>
  </aside>
</template>
