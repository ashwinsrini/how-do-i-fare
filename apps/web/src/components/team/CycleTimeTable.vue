<script setup>
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

defineProps({
  data: { type: Array, default: () => [] },
  loading: Boolean,
});

function fmtHours(val) {
  if (val === null || val === undefined) return '-';
  const n = Number(val);
  if (n < 1) return `${Math.round(n * 60)}m`;
  if (n < 24) return `${n.toFixed(1)}h`;
  return `${(n / 24).toFixed(1)}d`;
}
</script>

<template>
  <DataTable :value="data" :loading="loading" stripedRows class="p-datatable-sm" responsiveLayout="scroll" sortMode="single" removableSort>
    <Column header="#" style="width: 4rem">
      <template #body="{ index }">
        <span class="font-semibold text-surface-400">{{ index + 1 }}</span>
      </template>
    </Column>

    <Column field="authorLogin" header="Author" :sortable="true">
      <template #body="{ data }">
        <div class="flex items-center gap-2">
          <img v-if="data.authorAvatar" :src="data.authorAvatar" class="w-6 h-6 rounded-full" />
          <span class="font-medium">{{ data.authorLogin }}</span>
        </div>
      </template>
    </Column>

    <Column field="avgHoursToFirstReview" header="Avg to First Review" :sortable="true">
      <template #body="{ data }">
        <span class="font-medium">{{ fmtHours(data.avgHoursToFirstReview) }}</span>
      </template>
    </Column>

    <Column field="avgHoursFirstReviewToMerge" header="Avg Review to Merge" :sortable="true">
      <template #body="{ data }">
        <span class="font-medium">{{ fmtHours(data.avgHoursFirstReviewToMerge) }}</span>
      </template>
    </Column>

    <Column field="avgHoursTotalCycleTime" header="Avg Total Cycle" :sortable="true">
      <template #body="{ data }">
        <span class="font-semibold" :class="{
          'text-green-600': Number(data.avgHoursTotalCycleTime) < 24,
          'text-yellow-600': Number(data.avgHoursTotalCycleTime) >= 24 && Number(data.avgHoursTotalCycleTime) < 72,
          'text-red-600': Number(data.avgHoursTotalCycleTime) >= 72,
        }">
          {{ fmtHours(data.avgHoursTotalCycleTime) }}
        </span>
      </template>
    </Column>

    <Column field="totalPRs" header="Total PRs" :sortable="true">
      <template #body="{ data }">
        <span class="font-medium">{{ Number(data.totalPRs).toLocaleString() }}</span>
      </template>
    </Column>

    <template #empty>
      <div class="flex flex-col items-center justify-center py-8 text-surface-400">
        <i class="pi pi-clock text-4xl mb-2"></i>
        <p>No cycle time data available. Apply filters to load data.</p>
      </div>
    </template>
  </DataTable>
</template>
