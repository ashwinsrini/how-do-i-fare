<script setup>
import { ref, watch, onMounted, computed } from 'vue';
import { useCredentialsStore } from '@/stores/credentials.js';
import { useGithubStore } from '@/stores/github.js';
import { useToast } from 'primevue/usetoast';
import PRLeaderboard from '@/components/github/PRLeaderboard.vue';
import ReviewLeaderboard from '@/components/github/ReviewLeaderboard.vue';
import LinesChangedTable from '@/components/github/LinesChangedTable.vue';
import DateRangePicker from '@/components/common/DateRangePicker.vue';
import Select from 'primevue/select';
import MultiSelect from 'primevue/multiselect';
import Button from 'primevue/button';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';

const credentialsStore = useCredentialsStore();
const githubStore = useGithubStore();
const toast = useToast();

const selectedCredential = ref(null);
const selectedOrg = ref(null);
const selectedRepos = ref([]);
const startDate = ref(null);
const endDate = ref(null);
const activeTab = ref('0');

onMounted(async () => {
  try {
    await credentialsStore.fetchGithubCredentials();
    if (credentialsStore.githubCredentials.length > 0) {
      selectedCredential.value = credentialsStore.githubCredentials[0].id;
    }
  } catch {
    // handled in store
  }
});

// When credential changes, fetch organizations
watch(selectedCredential, async (newVal) => {
  if (!newVal) return;
  selectedOrg.value = null;
  selectedRepos.value = [];
  githubStore.repos = [];

  try {
    await githubStore.fetchOrganizations(newVal);
  } catch {
    // handled in store
  }
});

// When organization changes, fetch repos
watch(selectedOrg, async (newVal) => {
  selectedRepos.value = [];

  if (newVal) {
    try {
      await githubStore.fetchRepos(newVal);
    } catch {
      // handled in store
    }
  } else {
    githubStore.repos = [];
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
      detail: 'Please select a GitHub credential first.',
      life: 3000,
    });
    return;
  }

  githubStore.filters = {
    credentialId: selectedCredential.value,
    orgId: selectedOrg.value || null,
    repoId: selectedRepos.value.length === 1 ? selectedRepos.value[0] : null,
    startDate: formatDateForApi(startDate.value),
    endDate: formatDateForApi(endDate.value),
  };

  try {
    await Promise.all([
      githubStore.fetchPrsRaised(),
      githubStore.fetchPrsMerged(),
      githubStore.fetchPrsReviewed(),
      githubStore.fetchLinesChanged(),
      githubStore.fetchReviewTurnaround(),
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

const credentialOptions = computed(() =>
  credentialsStore.githubCredentials.map((c) => ({ label: c.label, value: c.id }))
);

const orgOptions = computed(() =>
  githubStore.organizations.map((o) => ({ label: o.login, value: o.id }))
);

const repoOptions = computed(() =>
  githubStore.repos.map((r) => ({ label: r.name, value: r.id }))
);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-6">GitHub Leaderboard</h1>

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

        <!-- Organization selector -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Organization</label>
          <Select
            v-model="selectedOrg"
            :options="orgOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All organizations"
            showClear
            class="w-48"
          />
        </div>

        <!-- Repository multi-select -->
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Repositories</label>
          <MultiSelect
            v-model="selectedRepos"
            :options="repoOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="All repositories"
            class="w-56"
            :maxSelectedLabels="2"
            selectedItemsLabel="{0} repos selected"
            :disabled="!selectedOrg"
          />
        </div>

        <!-- Date range -->
        <DateRangePicker
          v-model:startDate="startDate"
          v-model:endDate="endDate"
        />

        <!-- Apply button -->
        <Button
          label="Apply Filters"
          icon="pi pi-search"
          :loading="githubStore.loading"
          @click="applyFilters"
        />
      </div>
    </div>

    <!-- Tabs -->
    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="0">Pull Requests</Tab>
        <Tab value="1">Code Reviews</Tab>
        <Tab value="2">Lines Changed</Tab>
      </TabList>

      <TabPanels>
        <!-- Tab 1: Pull Requests -->
        <TabPanel value="0">
          <div class="mt-4">
            <PRLeaderboard
              :prsRaised="githubStore.prsRaised"
              :prsMerged="githubStore.prsMerged"
              :loading="githubStore.loading"
            />
          </div>
        </TabPanel>

        <!-- Tab 2: Code Reviews -->
        <TabPanel value="1">
          <div class="mt-4">
            <ReviewLeaderboard
              :reviews="githubStore.prsReviewed"
              :turnaround="githubStore.reviewTurnaround"
              :loading="githubStore.loading"
            />
          </div>
        </TabPanel>

        <!-- Tab 3: Lines Changed -->
        <TabPanel value="2">
          <div class="mt-4">
            <LinesChangedTable
              :data="githubStore.linesChanged"
              :loading="githubStore.loading"
            />
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
