<script setup>
import { computed } from 'vue';
import LeaderboardTable from '@/components/common/LeaderboardTable.vue';

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
    // Each item: { authorLogin, authorId, authorAvatar, totalLinesAdded, totalLinesDeleted, totalChangedFiles }
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const columns = [
  { field: 'author', header: 'Author', sortable: false },
  { field: 'linesAdded', header: 'Lines Added', sortable: true, type: 'number' },
  { field: 'linesDeleted', header: 'Lines Deleted', sortable: true, type: 'number' },
  { field: 'netChange', header: 'Net Change', sortable: true, type: 'number' },
  { field: 'filesChanged', header: 'Files Changed', sortable: true, type: 'number' },
];

const tableData = computed(() => {
  return props.data.map((item) => {
    const added = Number(item.totalLinesAdded) || 0;
    const deleted = Number(item.totalLinesDeleted) || 0;
    const net = added - deleted;

    return {
      authorLogin: item.authorLogin,
      authorAvatar: item.authorAvatar,
      author: item.authorLogin,
      linesAdded: added,
      linesDeleted: deleted,
      netChange: net,
      filesChanged: Number(item.totalChangedFiles) || 0,
    };
  });
});
</script>

<template>
  <LeaderboardTable
    :data="tableData"
    :columns="columns"
    :loading="loading"
    emptyMessage="No lines changed data available. Try adjusting your filters."
  >
    <template #cell-author="{ data: row }">
      <div class="flex items-center gap-2">
        <img
          v-if="row.authorAvatar"
          :src="row.authorAvatar"
          :alt="row.authorLogin"
          class="w-6 h-6 rounded-full"
        />
        <div
          v-else
          class="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-semibold"
        >
          {{ (row.authorLogin || '?').charAt(0).toUpperCase() }}
        </div>
        <span class="font-medium">{{ row.authorLogin }}</span>
      </div>
    </template>

    <template #cell-linesAdded="{ value }">
      <span class="font-medium text-green-600">
        +{{ value != null ? Number(value).toLocaleString() : '0' }}
      </span>
    </template>

    <template #cell-linesDeleted="{ value }">
      <span class="font-medium text-red-600">
        -{{ value != null ? Number(value).toLocaleString() : '0' }}
      </span>
    </template>

    <template #cell-netChange="{ value }">
      <span
        class="font-semibold"
        :class="{
          'text-green-600': value > 0,
          'text-red-600': value < 0,
          'text-gray-500': value === 0,
        }"
      >
        {{ value > 0 ? '+' : '' }}{{ value != null ? Number(value).toLocaleString() : '0' }}
      </span>
    </template>
  </LeaderboardTable>
</template>
