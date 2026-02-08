<script setup>
import { computed, onMounted } from 'vue';
import { useSyncStore } from '@/stores/sync.js';

const syncStore = useSyncStore();

onMounted(() => {
  syncStore.fetchStatus();
});

const isSyncing = computed(() => {
  return syncStore.status?.running?.length > 0;
});

const lastSyncTime = computed(() => {
  const lastCompleted = syncStore.status?.lastCompleted;
  if (!lastCompleted) return null;

  const times = [
    lastCompleted.jira?.completedAt,
    lastCompleted.github?.completedAt,
  ].filter(Boolean);

  if (times.length === 0) return null;

  return times.reduce((latest, t) => {
    return new Date(t) > new Date(latest) ? t : latest;
  });
});

const timeAgo = computed(() => {
  if (!lastSyncTime.value) return null;

  const now = new Date();
  const syncDate = new Date(lastSyncTime.value);
  const diffMs = now - syncDate;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
});
</script>

<template>
  <div class="flex items-center gap-2 text-sm">
    <!-- Syncing state -->
    <template v-if="isSyncing">
      <span class="relative flex h-2.5 w-2.5">
        <span
          class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
        ></span>
        <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
      </span>
      <span class="text-emerald-600 font-medium">Syncing...</span>
    </template>

    <!-- Last sync exists -->
    <template v-else-if="lastSyncTime">
      <span class="inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
      <span class="text-surface-500">Last sync: {{ timeAgo }}</span>
    </template>

    <!-- No sync yet -->
    <template v-else>
      <span class="inline-flex h-2.5 w-2.5 rounded-full bg-surface-300"></span>
      <span class="text-surface-400">Not synced</span>
    </template>
  </div>
</template>
