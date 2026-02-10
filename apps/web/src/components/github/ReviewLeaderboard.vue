<script setup>
import { computed } from 'vue';
import LeaderboardTable from '@/components/common/LeaderboardTable.vue';

const props = defineProps({
  reviews: {
    type: Array,
    default: () => [],
    // Each item: { reviewerLogin, reviewerId, reviewerAvatar, totalReviews }
  },
  turnaround: {
    type: Array,
    default: () => [],
    // Each item: { reviewerLogin, reviewerId, reviewerAvatar, avgTurnaroundHours, totalReviews }
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const columns = [
  { field: 'reviewer', header: 'Reviewer', sortable: false },
  { field: 'reviewsGiven', header: 'Reviews Given', sortable: true, type: 'number' },
  { field: 'avgTurnaround', header: 'Avg Turnaround', sortable: true },
];

function formatTurnaround(hours) {
  if (hours == null || isNaN(hours)) return '-';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

const mergedData = computed(() => {
  const turnaroundMap = {};

  for (const item of props.turnaround) {
    const hours = item.avgTurnaroundHours;
    turnaroundMap[item.reviewerLogin] = hours != null ? Number(hours) : null;
  }

  const rows = props.reviews.map((item) => {
    const reviewsGiven = Number(item.totalReviews) || 0;
    const avgHours = turnaroundMap[item.reviewerLogin] ?? null;

    return {
      reviewerLogin: item.reviewerLogin,
      reviewerAvatar: item.reviewerAvatar,
      reviewer: item.reviewerName || item.reviewerLogin,
      reviewsGiven,
      avgTurnaroundHours: avgHours,
      avgTurnaround: formatTurnaround(avgHours),
    };
  });

  // Sort by reviews given descending
  rows.sort((a, b) => b.reviewsGiven - a.reviewsGiven);
  return rows;
});
</script>

<template>
  <LeaderboardTable
    :data="mergedData"
    :columns="columns"
    :loading="loading"
    emptyMessage="No code review data available. Try adjusting your filters."
  >
    <template #cell-reviewer="{ data: row }">
      <div class="flex items-center gap-2">
        <img
          v-if="row.reviewerAvatar"
          :src="row.reviewerAvatar"
          :alt="row.reviewerLogin"
          class="w-6 h-6 rounded-full"
        />
        <div
          v-else
          class="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-semibold"
        >
          {{ (row.reviewerLogin || '?').charAt(0).toUpperCase() }}
        </div>
        <span class="font-medium">{{ row.reviewer }}</span>
      </div>
    </template>

    <template #cell-avgTurnaround="{ data: row }">
      <span
        class="font-medium"
        :class="{
          'text-green-600': row.avgTurnaroundHours != null && row.avgTurnaroundHours < 4,
          'text-yellow-600': row.avgTurnaroundHours != null && row.avgTurnaroundHours >= 4 && row.avgTurnaroundHours < 24,
          'text-red-600': row.avgTurnaroundHours != null && row.avgTurnaroundHours >= 24,
        }"
      >
        {{ row.avgTurnaround }}
      </span>
    </template>
  </LeaderboardTable>
</template>
