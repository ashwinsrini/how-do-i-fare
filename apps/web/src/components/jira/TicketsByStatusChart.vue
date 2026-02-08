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
    // Each item: { assigneeName, assigneeAccountId, assigneeAvatar, statusCategory, ticketCount }
  },
});

const statusColors = {
  new: '#9CA3AF',
  indeterminate: '#EAB308',
  done: '#22C55E',
};

const statusLabels = {
  new: 'To Do',
  indeterminate: 'In Progress',
  done: 'Done',
};

function getColor(statusCategory) {
  return statusColors[statusCategory] || '#6B7280';
}

function getLabel(statusCategory) {
  return statusLabels[statusCategory] || statusCategory;
}

const chartData = computed(() => {
  if (!props.data || props.data.length === 0) {
    return { labels: [], datasets: [] };
  }

  // Group by assignee
  const assigneeMap = {};
  const categories = new Set();

  for (const row of props.data) {
    const name = row.assigneeName || 'Unassigned';
    if (!assigneeMap[name]) {
      assigneeMap[name] = {};
    }
    assigneeMap[name][row.statusCategory] = Number(row.ticketCount) || 0;
    categories.add(row.statusCategory);
  }

  const labels = Object.keys(assigneeMap);
  // Enforce order: new, indeterminate, done
  const orderedCategories = ['new', 'indeterminate', 'done'].filter((c) =>
    categories.has(c)
  );
  // Add any remaining categories not in the predefined order
  for (const c of categories) {
    if (!orderedCategories.includes(c)) {
      orderedCategories.push(c);
    }
  }

  const datasets = orderedCategories.map((cat) => ({
    label: getLabel(cat),
    data: labels.map((name) => assigneeMap[name][cat] || 0),
    backgroundColor: getColor(cat),
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
      text: 'Tickets by Status Category',
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
