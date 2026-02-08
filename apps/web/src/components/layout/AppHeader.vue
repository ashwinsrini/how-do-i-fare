<script setup>
import SyncStatusBadge from '@/components/common/SyncStatusBadge.vue';
</script>

<template>
  <header class="bg-white shadow-sm border-b h-16 flex items-center justify-between px-6">
    <!-- Left: App title with code icon -->
    <div class="flex items-center gap-2">
      <i class="pi pi-code text-indigo-600 text-xl"></i>
      <h1 class="text-lg font-semibold text-gray-800">Dev Leaderboard</h1>
    </div>

    <!-- Right: Sync status -->
    <div class="flex items-center">
      <SyncStatusBadge />
    </div>
  </header>
</template>
