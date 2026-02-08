<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTeamStore } from '@/stores/team.js';
import { useCredentialsStore } from '@/stores/credentials.js';
import { useToast } from 'primevue/usetoast';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import Select from 'primevue/select';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import DateRangePicker from '@/components/common/DateRangePicker.vue';
import TeamMemberList from '@/components/team/TeamMemberList.vue';
import TeamMemberForm from '@/components/team/TeamMemberForm.vue';
import ComparisonView from '@/components/team/ComparisonView.vue';
import CycleTimeTable from '@/components/team/CycleTimeTable.vue';
import ReviewMatrixHeatmap from '@/components/team/ReviewMatrixHeatmap.vue';
import TrendsChart from '@/components/team/TrendsChart.vue';

const teamStore = useTeamStore();
const credentialsStore = useCredentialsStore();
const toast = useToast();
const confirm = useConfirm();
const router = useRouter();

const activeTab = ref('0');
const showForm = ref(false);
const editingMember = ref(null);

// Metric filters for Cycle Time & Review Matrix tabs
const metricCredential = ref(null);
const metricStartDate = ref(null);
const metricEndDate = ref(null);

const credentialOptions = computed(() =>
  credentialsStore.githubCredentials.map((c) => ({ label: c.label, value: c.id }))
);

function formatDateForApi(date) {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
}

async function loadCycleTime() {
  try {
    await teamStore.fetchCycleTime({
      credentialId: metricCredential.value,
      startDate: formatDateForApi(metricStartDate.value),
      endDate: formatDateForApi(metricEndDate.value),
    });
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message, life: 5000 });
  }
}

async function loadReviewMatrix() {
  try {
    await teamStore.fetchReviewMatrix({
      credentialId: metricCredential.value,
      startDate: formatDateForApi(metricStartDate.value),
      endDate: formatDateForApi(metricEndDate.value),
    });
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message, life: 5000 });
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      teamStore.fetchMembers(),
      teamStore.fetchJiraUsers(),
      teamStore.fetchGithubUsers(),
      credentialsStore.fetchGithubCredentials(),
    ]);
  } catch {
    // handled by store
  }
});

function openAdd() {
  editingMember.value = null;
  showForm.value = true;
}

function openEdit(member) {
  editingMember.value = member;
  showForm.value = true;
}

async function onSave(data) {
  try {
    if (editingMember.value) {
      await teamStore.updateMember(editingMember.value.id, data);
      toast.add({ severity: 'success', summary: 'Updated', detail: 'Member updated.', life: 3000 });
    } else {
      await teamStore.createMember(data);
      toast.add({ severity: 'success', summary: 'Created', detail: 'Member added.', life: 3000 });
    }
    showForm.value = false;
    // Refresh discovery lists
    await Promise.all([teamStore.fetchJiraUsers(), teamStore.fetchGithubUsers()]);
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message, life: 5000 });
  }
}

function onDelete(member) {
  confirm.require({
    message: `Delete "${member.displayName}"? This cannot be undone.`,
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await teamStore.deleteMember(member.id);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Member removed.', life: 3000 });
        await Promise.all([teamStore.fetchJiraUsers(), teamStore.fetchGithubUsers()]);
      } catch (err) {
        toast.add({ severity: 'error', summary: 'Error', detail: err.message, life: 5000 });
      }
    },
  });
}

function onView(member) {
  router.push(`/team/${member.id}`);
}

async function autoSuggest() {
  try {
    await teamStore.fetchSuggestions();
    if (teamStore.suggestions.length === 0) {
      toast.add({ severity: 'info', summary: 'No Matches', detail: 'No auto-suggestions found.', life: 3000 });
      return;
    }
    // Auto-create members from suggestions
    let created = 0;
    for (const s of teamStore.suggestions) {
      try {
        await teamStore.createMember({
          displayName: s.jiraDisplayName || s.githubLogin,
          avatarUrl: s.jiraAvatar || s.githubAvatar || null,
          jiraAccountId: s.jiraAccountId,
          jiraDisplayName: s.jiraDisplayName,
          githubLogin: s.githubLogin,
          githubUserId: s.githubUserId,
        });
        created++;
      } catch (err) {
        // Skip duplicate/conflict errors, surface others
        if (err.message && !err.message.includes('409') && !err.message.toLowerCase().includes('duplicate')) {
          console.warn('[TeamView] Auto-suggest create failed:', err.message);
        }
      }
    }
    toast.add({
      severity: 'success',
      summary: 'Auto-Suggest',
      detail: `Created ${created} member(s) from ${teamStore.suggestions.length} suggestion(s).`,
      life: 5000,
    });
    await Promise.all([
      teamStore.fetchMembers(),
      teamStore.fetchJiraUsers(),
      teamStore.fetchGithubUsers(),
    ]);
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message, life: 5000 });
  }
}
</script>

<template>
  <div>
    <ConfirmDialog />

    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Team</h1>
    </div>

    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab value="0">Members</Tab>
        <Tab value="1">Compare</Tab>
        <Tab value="2">Cycle Time</Tab>
        <Tab value="3">Review Matrix</Tab>
        <Tab value="4">Trends</Tab>
      </TabList>

      <TabPanels>
        <!-- Members Tab -->
        <TabPanel value="0">
          <div class="mt-4">
            <div class="flex gap-2 mb-4">
              <Button label="Add Member" icon="pi pi-plus" @click="openAdd" />
              <Button label="Auto-Suggest" icon="pi pi-sparkles" severity="secondary" @click="autoSuggest" />
            </div>
            <TeamMemberList
              :members="teamStore.members"
              :loading="teamStore.loading"
              @edit="openEdit"
              @delete="onDelete"
              @view="onView"
            />
          </div>
        </TabPanel>

        <!-- Compare Tab -->
        <TabPanel value="1">
          <div class="mt-4">
            <ComparisonView />
          </div>
        </TabPanel>

        <!-- Cycle Time Tab -->
        <TabPanel value="2">
          <div class="mt-4">
            <div class="flex flex-wrap items-end gap-4 mb-4">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-gray-700">Credential</label>
                <Select
                  v-model="metricCredential"
                  :options="credentialOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="All"
                  showClear
                  class="w-48"
                />
              </div>
              <DateRangePicker v-model:startDate="metricStartDate" v-model:endDate="metricEndDate" />
              <Button label="Load" icon="pi pi-clock" :loading="teamStore.loading" @click="loadCycleTime" />
            </div>
            <CycleTimeTable :data="teamStore.cycleTime" :loading="teamStore.loading" />
          </div>
        </TabPanel>

        <!-- Review Matrix Tab -->
        <TabPanel value="3">
          <div class="mt-4">
            <div class="flex flex-wrap items-end gap-4 mb-4">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-gray-700">Credential</label>
                <Select
                  v-model="metricCredential"
                  :options="credentialOptions"
                  optionLabel="label"
                  optionValue="value"
                  placeholder="All"
                  showClear
                  class="w-48"
                />
              </div>
              <DateRangePicker v-model:startDate="metricStartDate" v-model:endDate="metricEndDate" />
              <Button label="Load" icon="pi pi-th-large" :loading="teamStore.loading" @click="loadReviewMatrix" />
            </div>
            <ReviewMatrixHeatmap :data="teamStore.reviewMatrix" :loading="teamStore.loading" />
          </div>
        </TabPanel>

        <!-- Trends Tab -->
        <TabPanel value="4">
          <div class="mt-4">
            <TrendsChart />
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>

    <TeamMemberForm
      v-model:visible="showForm"
      :member="editingMember"
      :jiraUsers="teamStore.jiraUsers"
      :githubUsers="teamStore.githubUsers"
      @save="onSave"
    />
  </div>
</template>
