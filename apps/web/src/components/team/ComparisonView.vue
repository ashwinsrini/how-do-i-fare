<script setup>
import { ref, computed } from 'vue';
import { useTeamStore } from '@/stores/team.js';
import { useToast } from 'primevue/usetoast';
import MultiSelect from 'primevue/multiselect';
import Button from 'primevue/button';
import DateRangePicker from '@/components/common/DateRangePicker.vue';

const teamStore = useTeamStore();
const toast = useToast();

const selectedIds = ref([]);
const startDate = ref(null);
const endDate = ref(null);

const memberOptions = computed(() =>
  teamStore.members.map((m) => ({ label: m.displayName, value: m.id }))
);

function formatDateForApi(date) {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
}

async function compare() {
  if (selectedIds.value.length < 2) {
    toast.add({ severity: 'warn', summary: 'Select Members', detail: 'Pick at least 2 members to compare.', life: 3000 });
    return;
  }
  try {
    await teamStore.fetchComparison(selectedIds.value, {
      startDate: formatDateForApi(startDate.value),
      endDate: formatDateForApi(endDate.value),
    });
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message, life: 5000 });
  }
}

function fmt(val) {
  if (val === null || val === undefined) return '-';
  return Number(val).toLocaleString();
}

function fmtHours(val) {
  if (val === null || val === undefined) return '-';
  const n = Number(val);
  if (n < 1) return `${Math.round(n * 60)}m`;
  if (n < 24) return `${n.toFixed(1)}h`;
  return `${(n / 24).toFixed(1)}d`;
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-end gap-4 mb-6">
      <div class="flex flex-col gap-1">
        <label class="tm-label">Members</label>
        <MultiSelect
          v-model="selectedIds"
          :options="memberOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select 2-5 members"
          class="w-64"
          :maxSelectedLabels="3"
          selectedItemsLabel="{0} selected"
        />
      </div>
      <DateRangePicker v-model:startDate="startDate" v-model:endDate="endDate" />
      <Button label="Compare" icon="pi pi-arrows-h" :loading="teamStore.loading" @click="compare" />
    </div>

    <div v-if="teamStore.comparison.length > 0" class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b">
            <th class="text-left py-2 px-3 text-surface-500">Metric</th>
            <th
              v-for="p in teamStore.comparison"
              :key="p.member.id"
              class="text-center py-2 px-3 text-surface-500"
            >
              <div class="flex flex-col items-center gap-1">
                <img
                  v-if="p.member.avatarUrl"
                  :src="p.member.avatarUrl"
                  class="w-8 h-8 rounded-full"
                />
                <span class="font-medium">{{ p.member.displayName }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- Jira Section -->
          <tr class="bg-surface-50">
            <td colspan="100" class="py-2 px-3 font-semibold text-surface-700">Jira</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 px-3 text-surface-500">Story Points</td>
            <td v-for="p in teamStore.comparison" :key="'sp-'+p.member.id" class="text-center py-2 px-3 font-medium">
              {{ p.jira ? fmt(p.jira.totalStoryPoints) : '-' }}
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2 px-3 text-surface-500">Total Tickets</td>
            <td v-for="p in teamStore.comparison" :key="'tt-'+p.member.id" class="text-center py-2 px-3 font-medium">
              {{ p.jira ? fmt(p.jira.totalTickets) : '-' }}
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2 px-3 text-surface-500">Done</td>
            <td v-for="p in teamStore.comparison" :key="'td-'+p.member.id" class="text-center py-2 px-3 font-medium text-green-600">
              {{ p.jira ? fmt(p.jira.ticketsDone) : '-' }}
            </td>
          </tr>

          <!-- GitHub Section -->
          <tr class="bg-surface-50">
            <td colspan="100" class="py-2 px-3 font-semibold text-surface-700">GitHub</td>
          </tr>
          <tr class="border-b">
            <td class="py-2 px-3 text-surface-500">PRs Raised</td>
            <td v-for="p in teamStore.comparison" :key="'pr-'+p.member.id" class="text-center py-2 px-3 font-medium">
              {{ p.github ? fmt(p.github.prsRaised) : '-' }}
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2 px-3 text-surface-500">PRs Merged</td>
            <td v-for="p in teamStore.comparison" :key="'pm-'+p.member.id" class="text-center py-2 px-3 font-medium">
              {{ p.github ? fmt(p.github.prsMerged) : '-' }}
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2 px-3 text-surface-500">Merge Rate</td>
            <td v-for="p in teamStore.comparison" :key="'mr-'+p.member.id" class="text-center py-2 px-3 font-medium">
              {{ p.github ? `${p.github.mergeRate}%` : '-' }}
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2 px-3 text-surface-500">Reviews Given</td>
            <td v-for="p in teamStore.comparison" :key="'rv-'+p.member.id" class="text-center py-2 px-3 font-medium">
              {{ p.github ? fmt(p.github.reviewsGiven) : '-' }}
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2 px-3 text-surface-500">Lines Added</td>
            <td v-for="p in teamStore.comparison" :key="'la-'+p.member.id" class="text-center py-2 px-3 font-medium text-green-600">
              {{ p.github ? `+${fmt(p.github.linesAdded)}` : '-' }}
            </td>
          </tr>
          <tr class="border-b">
            <td class="py-2 px-3 text-surface-500">Avg Cycle Time</td>
            <td v-for="p in teamStore.comparison" :key="'ct-'+p.member.id" class="text-center py-2 px-3 font-medium">
              {{ p.github ? fmtHours(p.github.avgHoursTotalCycleTime) : '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!teamStore.loading" class="text-center text-surface-400 py-8">
      <i class="pi pi-arrows-h text-4xl mb-2"></i>
      <p>Select members and click Compare to see side-by-side metrics.</p>
    </div>
  </div>
</template>
