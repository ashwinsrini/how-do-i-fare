<script setup>
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
    // Each item: { assigneeName, assigneeAccountId, assigneeAvatar, issueType, ticketCount }
  },
});

const typeColors = {
  Bug: '#EF4444',
  Story: '#3B82F6',
  Task: '#22C55E',
  Epic: '#8B5CF6',
  'Sub-task': '#F97316',
};

function getColor(issueType) {
  return typeColors[issueType] || '#9CA3AF';
}

const chartData = computed(() => {
  if (!props.data || props.data.length === 0) {
    return { labels: [], datasets: [] };
  }

  // Group by assignee
  const assigneeMap = {};
  const issueTypes = new Set();

  for (const row of props.data) {
    const name = row.assigneeName || 'Unassigned';
    if (!assigneeMap[name]) {
      assigneeMap[name] = {};
    }
    assigneeMap[name][row.issueType] = Number(row.ticketCount) || 0;
    issueTypes.add(row.issueType);
  }

  const labels = Object.keys(assigneeMap);
  const types = Array.from(issueTypes).sort();

  const datasets = types.map((type) => ({
    label: type,
    data: labels.map((name) => assigneeMap[name][type] || 0),
    backgroundColor: getColor(type),
    borderRadius: 2,
  }));

  return { labels, datasets };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
    },
    title: {
      display: true,
      text: 'Tickets by Issue Type',
      font: { size: 14 },
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: {
        maxRotation: 45,
        minRotation: 0,
      },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: {
        stepSize: 1,
      },
    },
  },
};
</script>

<template>
  <div>
    <div v-if="data.length === 0" class="flex items-center justify-center py-12 text-surface-400">
      <p>No ticket data available for chart.</p>
    </div>
    <div v-else class="h-80">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
