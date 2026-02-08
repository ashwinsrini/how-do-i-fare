<script setup>
import { ref, computed, watch } from 'vue';
import { useTeamStore } from '@/stores/team.js';
import { useCredentialsStore } from '@/stores/credentials.js';
import { useToast } from 'primevue/usetoast';
import Chart from 'primevue/chart';
import Select from 'primevue/select';
import Button from 'primevue/button';
import DateRangePicker from '@/components/common/DateRangePicker.vue';

const teamStore = useTeamStore();
const credentialsStore = useCredentialsStore();
const toast = useToast();

const selectedMetric = ref('prs-raised');
const selectedInterval = ref('week');
const selectedCredential = ref(null);
const startDate = ref(null);
const endDate = ref(null);

const metricOptions = [
  { label: 'PRs Raised', value: 'prs-raised' },
  { label: 'PRs Merged', value: 'prs-merged' },
  { label: 'Reviews', value: 'reviews' },
  { label: 'Story Points', value: 'story-points' },
];

const intervalOptions = [
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' },
];

const credentialOptions = computed(() =>
  credentialsStore.githubCredentials.map((c) => ({ label: c.label, value: c.id }))
);

function formatDateForApi(date) {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
}

async function loadTrends() {
  try {
    await teamStore.fetchTrends({
      metric: selectedMetric.value,
      interval: selectedInterval.value,
      credentialId: selectedCredential.value,
      startDate: formatDateForApi(startDate.value),
      endDate: formatDateForApi(endDate.value),
    });
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message, life: 5000 });
  }
}

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6',
];

const chartData = computed(() => {
  if (!teamStore.trends || teamStore.trends.length === 0) return null;

  // Group by period, then by person
  const periodMap = new Map();
  const people = new Set();

  for (const row of teamStore.trends) {
    const period = new Date(row.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    people.add(row.person);
    if (!periodMap.has(period)) periodMap.set(period, {});
    periodMap.get(period)[row.person] = row.value;
  }

  const labels = [...periodMap.keys()];
  const datasets = [...people].map((person, i) => ({
    label: person,
    data: labels.map((l) => periodMap.get(l)?.[person] || 0),
    borderColor: COLORS[i % COLORS.length],
    backgroundColor: COLORS[i % COLORS.length] + '20',
    tension: 0.3,
    fill: false,
  }));

  return { labels, datasets };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' },
  },
  scales: {
    y: { beginAtZero: true },
  },
};
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end gap-4 mb-6">
      <div class="flex flex-col gap-1">
        <label class="tm-label">Metric</label>
        <Select v-model="selectedMetric" :options="metricOptions" optionLabel="label" optionValue="value" class="w-40" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="tm-label">Interval</label>
        <Select v-model="selectedInterval" :options="intervalOptions" optionLabel="label" optionValue="value" class="w-32" />
      </div>
      <div class="flex flex-col gap-1" v-if="selectedMetric !== 'story-points'">
        <label class="tm-label">Credential</label>
        <Select
          v-model="selectedCredential"
          :options="credentialOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="All"
          showClear
          class="w-48"
        />
      </div>
      <DateRangePicker v-model:startDate="startDate" v-model:endDate="endDate" />
      <Button label="Load" icon="pi pi-chart-line" :loading="teamStore.loading" @click="loadTrends" />
    </div>

    <div v-if="chartData" class="tm-card p-4" style="height: 400px">
      <Chart type="line" :data="chartData" :options="chartOptions" class="h-full" />
    </div>

    <div v-else-if="!teamStore.loading" class="flex flex-col items-center justify-center py-12 text-surface-400">
      <i class="pi pi-chart-line text-4xl mb-2"></i>
      <p>Select a metric and click Load to view trends over time.</p>
    </div>
  </div>
</template>
