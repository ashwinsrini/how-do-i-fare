<script setup>
import { useAuthStore } from '@/stores/auth.js';
import { useRouter } from 'vue-router';
import SyncStatusBadge from '@/components/common/SyncStatusBadge.vue';

const authStore = useAuthStore();
const router = useRouter();

function logout() {
  authStore.logout();
  router.push('/login');
}
</script>

<template>
  <header class="h-14 flex items-center justify-between px-6 bg-white border-b border-surface-200/80">
    <!-- Left: App title -->
    <div class="flex items-center gap-2.5">
      <div class="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
        <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <span class="text-base font-bold text-surface-800 tracking-tight">TeamMetrics</span>
    </div>

    <!-- Right: Sync status + user -->
    <div class="flex items-center gap-4">
      <SyncStatusBadge />
      <div class="h-5 w-px bg-surface-200"></div>
      <button
        @click="logout"
        class="text-sm text-surface-500 hover:text-surface-700 transition-colors flex items-center gap-1.5"
      >
        <i class="pi pi-sign-out text-xs"></i>
        Sign out
      </button>
    </div>
  </header>
</template>
