<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: { type: Object, default: null },
  loading: Boolean,
});

const allPeople = computed(() => {
  if (!props.data) return [];
  const set = new Set([...props.data.reviewers, ...props.data.authors]);
  return [...set].sort();
});

const maxCount = computed(() => {
  if (!props.data) return 1;
  let max = 1;
  for (const reviewer of Object.keys(props.data.matrix)) {
    for (const count of Object.values(props.data.matrix[reviewer])) {
      if (count > max) max = count;
    }
  }
  return max;
});

function getCount(reviewer, author) {
  if (!props.data?.matrix[reviewer]) return 0;
  return props.data.matrix[reviewer][author] || 0;
}

function getCellColor(count) {
  if (count === 0) return 'bg-gray-50 text-gray-300';
  const intensity = count / maxCount.value;
  if (intensity > 0.75) return 'bg-indigo-600 text-white';
  if (intensity > 0.5) return 'bg-indigo-400 text-white';
  if (intensity > 0.25) return 'bg-indigo-200 text-indigo-800';
  return 'bg-indigo-100 text-indigo-700';
}
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-12">
      <i class="pi pi-spinner pi-spin text-3xl text-indigo-600"></i>
    </div>

    <div v-else-if="data && allPeople.length > 0" class="overflow-x-auto">
      <table class="text-sm border-collapse">
        <thead>
          <tr>
            <th class="py-2 px-3 text-left text-gray-600 bg-gray-50 sticky left-0">Reviewer \ Author</th>
            <th
              v-for="author in allPeople"
              :key="'h-'+author"
              class="py-2 px-3 text-center text-gray-600 bg-gray-50 whitespace-nowrap"
            >
              {{ author }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="reviewer in allPeople" :key="reviewer" class="border-t">
            <td class="py-2 px-3 font-medium text-gray-700 bg-gray-50 sticky left-0 whitespace-nowrap">
              {{ reviewer }}
            </td>
            <td
              v-for="author in allPeople"
              :key="reviewer+'-'+author"
              class="py-2 px-3 text-center font-medium transition-colors"
              :class="reviewer === author ? 'bg-gray-100 text-gray-300' : getCellColor(getCount(reviewer, author))"
            >
              {{ reviewer === author ? '-' : getCount(reviewer, author) || '' }}
            </td>
          </tr>
        </tbody>
      </table>

      <div class="flex items-center gap-4 mt-4 text-xs text-gray-500">
        <span>Intensity:</span>
        <div class="flex items-center gap-1">
          <div class="w-4 h-4 rounded bg-gray-50 border"></div>
          <span>0</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-4 h-4 rounded bg-indigo-100"></div>
          <span>Low</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-4 h-4 rounded bg-indigo-400"></div>
          <span>Medium</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-4 h-4 rounded bg-indigo-600"></div>
          <span>High</span>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col items-center justify-center py-8 text-gray-500">
      <i class="pi pi-th-large text-4xl mb-2"></i>
      <p>No review matrix data available. Apply filters to load data.</p>
    </div>
  </div>
</template>
