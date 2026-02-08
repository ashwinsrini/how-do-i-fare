<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useCredentialsStore } from '@/stores/credentials.js';
import { useJiraStore } from '@/stores/jira.js';
import { useToast } from 'primevue/usetoast';
import StoryPointsTable from '@/components/jira/StoryPointsTable.vue';
import TicketsByTypeChart from '@/components/jira/TicketsByTypeChart.vue';
import TicketsByStatusChart from '@/components/jira/TicketsByStatusChart.vue';
import DateRangePicker from '@/components/common/DateRangePicker.vue';
import LeaderboardTable from '@/components/common/LeaderboardTable.vue';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Button from 'primevue/button';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

const credentialsStore = useCredentialsStore();
const jiraStore = useJiraStore();
const toast = useToast();

const selectedCredential = ref(null);
const selectedProject = ref(null);
const selectedSprint = ref(null);
const startDate = ref(null);
const endDate = ref(null);
const selectedStatuses = ref([]);
const activeTab = ref('0');

onMounted(async () => {
  try {
    await credentialsStore.fetchJiraCredentials();
    if (credentialsStore.jiraCredentials.length > 0) {
      selectedCredential.value = credentialsStore.jiraCredentials[0].id;
    }
  } catch {
    // handled in store
  }
});

// When credential changes, fetch projects and statuses
watch(selectedCredential, async (newVal) => {
  if (!newVal) return;
  selectedProject.value = null;
  selectedSprint.value = null;
  selectedStatuses.value = [];
  jiraStore.sprints = [];

  try {
    await Promise.all([
      jiraStore.fetchProjects(newVal),
      jiraStore.fetchStatuses(newVal, null),
    ]);
    // Default: all statuses selected
    selectedStatuses.value = [...jiraStore.statuses];
  } catch {
    // handled in store
  }
});

// When project changes, fetch sprints and refresh statuses
watch(selectedProject, async (newVal) => {
  selectedSprint.value = null;

  if (newVal) {
    try {
      await Promise.all([
        jiraStore.fetchSprints(newVal),
        jiraStore.fetchStatuses(selectedCredential.value, newVal),
      ]);
      selectedStatuses.value = [...jiraStore.statuses];
    } catch {
      // handled in store
    }
  } else {
    jiraStore.sprints = [];
  }
});

function formatDateForApi(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

async function applyFilters() {
  if (!selectedCredential.value) {
    toast.add({
      severity: 'warn',
      summary: 'Select Credential',
      detail: 'Please select a Jira credential first.',
      life: 3000,
    });
    return;
  }

  jiraStore.filters = {
    credentialId: selectedCredential.value,
    projectId: selectedProject.value || null,
    sprintId: selectedSprint.value || null,
    startDate: formatDateForApi(startDate.value),
    endDate: formatDateForApi(endDate.value),
    statuses: selectedStatuses.value.length > 0 && selectedStatuses.value.length < jiraStore.statuses.length
      ? selectedStatuses.value
      : [],
  };

  try {
    await Promise.all([
      jiraStore.fetchStoryPointsLeaderboard(),
      jiraStore.fetchTicketsByType(),
      jiraStore.fetchTicketsByStatus(),
    ]);
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Fetch Failed',
      detail: err.message,
      life: 5000,
    });
  }
}

// Computed data for tickets-by-type table
const ticketsByTypeTableData = computed(() => {
  const data = jiraStore.ticketsByType;
  if (!data || data.length === 0) return { rows: [], types: [] };

  // Group by assignee
  const assigneeMap = {};
  const issueTypes = new Set();

  for (const row of data) {
    const name = row.assigneeName || 'Unassigned';
    if (!assigneeMap[name]) {
      assigneeMap[name] = { assigneeName: name, assigneeAvatar: row.assigneeAvatar, total: 0 };
    }
    const count = Number(row.ticketCount) || 0;
    assigneeMap[name][row.issueType] = count;
    assigneeMap[name].total += count;
    issueTypes.add(row.issueType);
  }

  return {
    rows: Object.values(assigneeMap).sort((a, b) => b.total - a.total),
    types: Array.from(issueTypes).sort(),
  };
});

// Computed data for tickets-by-status table
const ticketsByStatusTableData = computed(() => {
  const data = jiraStore.ticketsByStatus;
  if (!data || data.length === 0) return { rows: [], categories: [] };

  const statusLabels = {
    new: 'To Do',
    indeterminate: 'In Progress',
    done: 'Done',
  };

  // Group by assignee
  const assigneeMap = {};
  const categories = new Set();

  for (const row of data) {
    const name = row.assigneeName || 'Unassigned';
    if (!assigneeMap[name]) {
      assigneeMap[name] = { assigneeName: name, assigneeAvatar: row.assigneeAvatar, total: 0 };
    }
    const count = Number(row.ticketCount) || 0;
    const label = statusLabels[row.statusCategory] || row.statusCategory;
    assigneeMap[name][label] = count;
    assigneeMap[name].total += count;
    categories.add(label);
  }

  return {
    rows: Object.values(assigneeMap).sort((a, b) => b.total - a.total),
    categories: ['To Do', 'In Progress', 'Done'].filter((c) => categories.has(c)),
  };
});

const projectOptions = computed(() =>
  jiraStore.projects.map((p) => ({ label: p.name, value: p.id }))
);

const sprintOptions = computed(() =>
  jiraStore.sprints.map((s) => ({ label: s.name, value: s.id }))
);

const credentialOptions = computed(() =>
  credentialsStore.jiraCredentials.map((c) => ({ label: c.label, value: c.id }))
);

const statusOptions = computed(() => jiraStore.statuses || []);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Jira Leaderboard</h1>

    <!-- Filter bar -->
    <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div class="flex flex-wrap items-end gap-4">
        <!-- Credential selector -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Credential</label>
          <Select
            v-model="selectedCredential"
            :options="credentialOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select credential"
            class="w-48"
          />
        </div>

        <!-- Project selector -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Project</label>
          <Select
            v-model="selectedProject"
            :options="projectOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All projects"
            showClear
            class="w-48"
          />
        </div>

        <!-- Sprint selector -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Sprint</label>
          <Select
            v-model="selectedSprint"
            :options="sprintOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All sprints"
            showClear
            class="w-48"
            :disabled="!selectedProject"
          />
        </div>

        <!-- Date range -->
        <DateRangePicker
          v-model:startDate="startDate"
          v-model:endDate="endDate"
        />

        <!-- Status multi-select -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Statuses</label>
          <MultiSelect
            v-model="selectedStatuses"
            :options="statusOptions"
            placeholder="All statuses"
            class="w-56"
            :maxSelectedLabels="2"
            selectedItemsLabel="{0} statuses selected"
          />
        </div>

        <!-- Apply button -->
        <Button
          label="Apply Filters"
          icon="pi pi-search"
          :loading="jiraStore.loading"
          @click="applyFilters"
        />
      </div>
    </div>

    <!-- Tabs -->
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="0">Story Points</Tab>
        <Tab value="1">Tickets by Type</Tab>
        <Tab value="2">Tickets by Status</Tab>
      </TabList>

      <TabPanels>
        <!-- Tab 1: Story Points -->
        <TabPanel value="0">
          <div class="mt-4">
            <StoryPointsTable
              :data="jiraStore.storyPointsLeaderboard"
              :loading="jiraStore.loading"
            />
          </div>
        </TabPanel>

        <!-- Tab 2: Tickets by Type -->
        <TabPanel value="1">
          <div class="mt-4 space-y-6">
            <!-- Chart -->
            <TicketsByTypeChart :data="jiraStore.ticketsByType" />

            <!-- Table -->
            <div v-if="ticketsByTypeTableData.rows">
              <DataTable
                :value="ticketsByTypeTableData.rows"
                :loading="jiraStore.loading"
                stripedRows
                class="p-datatable-sm"
                sortMode="single"
                removableSort
              >
                <template #empty>
                  <div class="text-center py-8 text-gray-500">
                    No ticket type data available.
                  </div>
                </template>

                <Column header="#" style="width: 4rem">
                  <template #body="{ index }">
                    <span class="font-semibold text-gray-500">{{ index + 1 }}</span>
                  </template>
                </Column>

                <Column header="Assignee" field="assigneeName">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <img
                        v-if="data.assigneeAvatar"
                        :src="data.assigneeAvatar"
                        :alt="data.assigneeName"
                        class="w-6 h-6 rounded-full"
                      />
                      <span class="font-medium">{{ data.assigneeName }}</span>
                    </div>
                  </template>
                </Column>

                <Column
                  v-for="type in ticketsByTypeTableData.types"
                  :key="type"
                  :header="type"
                  :field="type"
                  sortable
                >
                  <template #body="{ data }">
                    <span class="font-medium">{{ data[type] || 0 }}</span>
                  </template>
                </Column>

                <Column header="Total" field="total" sortable>
                  <template #body="{ data }">
                    <span class="font-bold">{{ data.total }}</span>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </TabPanel>

        <!-- Tab 3: Tickets by Status -->
        <TabPanel value="2">
          <div class="mt-4 space-y-6">
            <!-- Chart -->
            <TicketsByStatusChart :data="jiraStore.ticketsByStatus" />

            <!-- Table -->
            <div v-if="ticketsByStatusTableData.rows">
              <DataTable
                :value="ticketsByStatusTableData.rows"
                :loading="jiraStore.loading"
                stripedRows
                class="p-datatable-sm"
                sortMode="single"
                removableSort
              >
                <template #empty>
                  <div class="text-center py-8 text-gray-500">
                    No ticket status data available.
                  </div>
                </template>

                <Column header="#" style="width: 4rem">
                  <template #body="{ index }">
                    <span class="font-semibold text-gray-500">{{ index + 1 }}</span>
                  </template>
                </Column>

                <Column header="Assignee" field="assigneeName">
                  <template #body="{ data }">
                    <div class="flex items-center gap-2">
                      <img
                        v-if="data.assigneeAvatar"
                        :src="data.assigneeAvatar"
                        :alt="data.assigneeName"
                        class="w-6 h-6 rounded-full"
                      />
                      <span class="font-medium">{{ data.assigneeName }}</span>
                    </div>
                  </template>
                </Column>

                <Column
                  v-for="cat in ticketsByStatusTableData.categories"
                  :key="cat"
                  :header="cat"
                  :field="cat"
                  sortable
                >
                  <template #body="{ data }">
                    <span
                      class="font-medium"
                      :class="{
                        'text-gray-600': cat === 'To Do',
                        'text-yellow-600': cat === 'In Progress',
                        'text-green-600': cat === 'Done',
                      }"
                    >
                      {{ data[cat] || 0 }}
                    </span>
                  </template>
                </Column>

                <Column header="Total" field="total" sortable>
                  <template #body="{ data }">
                    <span class="font-bold">{{ data.total }}</span>
                  </template>
                </Column>
              </DataTable>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
