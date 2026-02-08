<script setup>
import LeaderboardTable from '@/components/common/LeaderboardTable.vue';

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const columns = [
  { field: 'assignee', header: 'Assignee', sortable: false },
  { field: 'totalStoryPoints', header: 'Total Story Points', sortable: true, type: 'number' },
];
</script>

<template>
  <LeaderboardTable
    :data="data"
    :columns="columns"
    :loading="loading"
    emptyMessage="No story points data available. Try adjusting your filters."
  >
    <template #cell-assignee="{ data: row }">
      <div class="flex items-center gap-2">
        <img
          v-if="row.assigneeAvatar"
          :src="row.assigneeAvatar"
          :alt="row.assigneeName"
          class="w-6 h-6 rounded-full"
        />
        <div
          v-else
          class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold"
        >
          {{ (row.assigneeName || '?').charAt(0).toUpperCase() }}
        </div>
        <span class="font-medium">{{ row.assigneeName || 'Unassigned' }}</span>
      </div>
    </template>

    <template #cell-totalStoryPoints="{ value }">
      <span class="font-bold text-blue-700">
        {{ value != null ? Number(value).toLocaleString() : '-' }}
      </span>
    </template>
  </LeaderboardTable>
</template>
