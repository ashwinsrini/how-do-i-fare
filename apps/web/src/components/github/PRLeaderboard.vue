<script setup>
import { computed } from 'vue';
import LeaderboardTable from '@/components/common/LeaderboardTable.vue';

const props = defineProps({
  prsRaised: {
    type: Array,
    default: () => [],
    // Each item: { authorLogin, authorId, authorAvatar, totalPRs }
  },
  prsMerged: {
    type: Array,
    default: () => [],
    // Each item: { authorLogin, authorId, authorAvatar, totalMerged }
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const columns = [
  { field: 'author', header: 'Author', sortable: false },
  { field: 'prsRaised', header: 'PRs Raised', sortable: true, type: 'number' },
  { field: 'prsMerged', header: 'PRs Merged', sortable: true, type: 'number' },
  { field: 'mergeRate', header: 'Merge Rate %', sortable: true, type: 'number' },
];

const mergedData = computed(() => {
  const mergedMap = {};

  for (const item of props.prsMerged) {
    mergedMap[item.authorLogin] = Number(item.totalMerged) || 0;
  }

  const rows = props.prsRaised.map((item) => {
    const raised = Number(item.totalPRs) || 0;
    const merged = mergedMap[item.authorLogin] || 0;
    const mergeRate = raised > 0 ? ((merged / raised) * 100).toFixed(1) : '0.0';

    return {
      authorLogin: item.authorLogin,
      authorAvatar: item.authorAvatar,
      author: item.authorLogin,
      prsRaised: raised,
      prsMerged: merged,
      mergeRate: parseFloat(mergeRate),
    };
  });

  // Sort by PRs raised descending
  rows.sort((a, b) => b.prsRaised - a.prsRaised);
  return rows;
});
</script>

<template>
  <LeaderboardTable
    :data="mergedData"
    :columns="columns"
    :loading="loading"
    emptyMessage="No pull request data available. Try adjusting your filters."
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
          class="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-semibold"
        >
          {{ (row.authorLogin || '?').charAt(0).toUpperCase() }}
        </div>
        <span class="font-medium">{{ row.authorLogin }}</span>
      </div>
    </template>

    <template #cell-mergeRate="{ value }">
      <span
        class="font-semibold"
        :class="{
          'text-green-600': value >= 75,
          'text-yellow-600': value >= 50 && value < 75,
          'text-red-600': value < 50,
        }"
      >
        {{ value }}%
      </span>
    </template>
  </LeaderboardTable>
</template>
