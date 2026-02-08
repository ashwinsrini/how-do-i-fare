<script setup>
import { ref, onMounted } from 'vue';
import { useCredentialsStore } from '@/stores/credentials.js';
import { useSyncStore } from '@/stores/sync.js';
import { useToast } from 'primevue/usetoast';
import { del } from '@/services/api.js';
import Button from 'primevue/button';
import Select from 'primevue/select';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';

const credentialsStore = useCredentialsStore();
const syncStore = useSyncStore();
const toast = useToast();

const syncInterval = ref(6);
const savingSettings = ref(false);
const testingCredential = ref(null);

const intervalOptions = [
  { label: '1 hour', value: 1 },
  { label: '3 hours', value: 3 },
  { label: '6 hours', value: 6 },
  { label: '12 hours', value: 12 },
  { label: '24 hours', value: 24 },
];

onMounted(async () => {
  try {
    await Promise.all([
      credentialsStore.fetchJiraCredentials(),
      credentialsStore.fetchGithubCredentials(),
      syncStore.fetchJobs(),
      syncStore.fetchSettings(),
    ]);
    syncInterval.value = syncStore.settings?.syncIntervalHours || 6;
  } catch {
    // handled in stores
  }
});

async function saveSettings() {
  savingSettings.value = true;
  try {
    await syncStore.updateSettings({ syncIntervalHours: syncInterval.value });
    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: `Sync interval updated to ${syncInterval.value} hour(s).`,
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: err.message,
      life: 5000,
    });
  } finally {
    savingSettings.value = false;
  }
}

async function testJiraCredential(cred) {
  testingCredential.value = cred.id;
  try {
    await credentialsStore.testJiraCredential(cred.id);
    toast.add({
      severity: 'success',
      summary: 'Connection OK',
      detail: `Jira credential "${cred.label}" is working.`,
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Connection Failed',
      detail: err.message,
      life: 5000,
    });
  } finally {
    testingCredential.value = null;
  }
}

async function testGithubCredential(cred) {
  testingCredential.value = cred.id;
  try {
    await credentialsStore.testGithubCredential(cred.id);
    toast.add({
      severity: 'success',
      summary: 'Connection OK',
      detail: `GitHub credential "${cred.label}" is working.`,
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Connection Failed',
      detail: err.message,
      life: 5000,
    });
  } finally {
    testingCredential.value = null;
  }
}

async function deleteJiraCredential(cred) {
  if (!window.confirm(`Delete Jira credential "${cred.label}"? All associated data will be removed.`)) {
    return;
  }
  try {
    await credentialsStore.deleteJiraCredential(cred.id);
    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: `Jira credential "${cred.label}" deleted.`,
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: err.message,
      life: 5000,
    });
  }
}

async function deleteGithubCredential(cred) {
  if (!window.confirm(`Delete GitHub credential "${cred.label}"? All associated data will be removed.`)) {
    return;
  }
  try {
    await credentialsStore.deleteGithubCredential(cred.id);
    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: `GitHub credential "${cred.label}" deleted.`,
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Delete Failed',
      detail: err.message,
      life: 5000,
    });
  }
}

async function clearJiraData() {
  if (!window.confirm('Clear ALL Jira data? This removes all synced Jira projects, sprints, and issues. Credentials will be kept.')) {
    return;
  }
  try {
    await del('/api/v1/jira/data');
    toast.add({
      severity: 'success',
      summary: 'Cleared',
      detail: 'All Jira data has been cleared.',
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'warn',
      summary: 'Notice',
      detail: 'Clear data endpoint may not be implemented yet.',
      life: 5000,
    });
  }
}

async function clearGithubData() {
  if (!window.confirm('Clear ALL GitHub data? This removes all synced organizations, repositories, PRs, and reviews. Credentials will be kept.')) {
    return;
  }
  try {
    await del('/api/v1/github/data');
    toast.add({
      severity: 'success',
      summary: 'Cleared',
      detail: 'All GitHub data has been cleared.',
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'warn',
      summary: 'Notice',
      detail: 'Clear data endpoint may not be implemented yet.',
      life: 5000,
    });
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getStatusSeverity(status) {
  switch (status) {
    case 'completed': return 'success';
    case 'running': return 'info';
    case 'pending': return 'warn';
    case 'failed': return 'danger';
    default: return 'secondary';
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

    <!-- Credential Management -->
    <section class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Credential Management</h2>

      <!-- Jira Credentials -->
      <div v-if="credentialsStore.jiraCredentials.length > 0" class="mb-4">
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Jira</h3>
        <div class="space-y-2">
          <div
            v-for="cred in credentialsStore.jiraCredentials"
            :key="cred.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <i class="pi pi-server text-blue-500"></i>
              <div>
                <span class="font-medium text-gray-800">{{ cred.label }}</span>
                <p class="text-sm text-gray-500">{{ cred.domain }}.atlassian.net</p>
              </div>
              <Tag
                :value="cred.isActive ? 'Active' : 'Inactive'"
                :severity="cred.isActive ? 'success' : 'warn'"
                class="text-xs"
              />
            </div>
            <div class="flex items-center gap-2">
              <Button
                icon="pi pi-bolt"
                label="Test"
                severity="secondary"
                text
                size="small"
                :loading="testingCredential === cred.id"
                @click="testJiraCredential(cred)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                size="small"
                @click="deleteJiraCredential(cred)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- GitHub Credentials -->
      <div v-if="credentialsStore.githubCredentials.length > 0">
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">GitHub</h3>
        <div class="space-y-2">
          <div
            v-for="cred in credentialsStore.githubCredentials"
            :key="cred.id"
            class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <i class="pi pi-github text-gray-800"></i>
              <div>
                <span class="font-medium text-gray-800">{{ cred.label }}</span>
                <p class="text-sm text-gray-500">{{ cred.username || 'GitHub User' }}</p>
              </div>
              <Tag
                :value="cred.isActive ? 'Active' : 'Inactive'"
                :severity="cred.isActive ? 'success' : 'warn'"
                class="text-xs"
              />
            </div>
            <div class="flex items-center gap-2">
              <Button
                icon="pi pi-bolt"
                label="Test"
                severity="secondary"
                text
                size="small"
                :loading="testingCredential === cred.id"
                @click="testGithubCredential(cred)"
              />
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                size="small"
                @click="deleteGithubCredential(cred)"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="credentialsStore.jiraCredentials.length === 0 && credentialsStore.githubCredentials.length === 0"
        class="text-center py-4 text-gray-500"
      >
        <p>No credentials configured. <router-link to="/setup" class="text-blue-600 hover:underline">Add credentials</router-link></p>
      </div>
    </section>

    <!-- Sync Configuration -->
    <section class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Sync Configuration</h2>
      <div class="flex items-end gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-gray-700">Sync Interval</label>
          <Select
            v-model="syncInterval"
            :options="intervalOptions"
            optionLabel="label"
            optionValue="value"
            class="w-48"
          />
        </div>
        <Button
          label="Save"
          icon="pi pi-check"
          :loading="savingSettings"
          @click="saveSettings"
        />
      </div>
    </section>

    <!-- Sync History -->
    <section class="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-800">Sync History</h2>
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          severity="secondary"
          text
          size="small"
          @click="syncStore.fetchJobs()"
        />
      </div>

      <DataTable
        :value="syncStore.jobs"
        :loading="syncStore.loading"
        stripedRows
        class="p-datatable-sm"
        :paginator="syncStore.jobs.length > 10"
        :rows="10"
        :rowsPerPageOptions="[10, 25, 50]"
        sortField="createdAt"
        :sortOrder="-1"
      >
        <template #empty>
          <div class="text-center py-8 text-gray-500">
            No sync history yet.
          </div>
        </template>

        <Column field="type" header="Type" sortable>
          <template #body="{ data }">
            <Tag
              :value="data.type === 'jira' ? 'Jira' : 'GitHub'"
              :severity="data.type === 'jira' ? 'info' : 'secondary'"
            />
          </template>
        </Column>

        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Tag
              :value="data.status"
              :severity="getStatusSeverity(data.status)"
            />
          </template>
        </Column>

        <Column field="createdAt" header="Started" sortable>
          <template #body="{ data }">
            {{ formatDateTime(data.createdAt) }}
          </template>
        </Column>

        <Column field="completedAt" header="Completed" sortable>
          <template #body="{ data }">
            {{ formatDateTime(data.completedAt) }}
          </template>
        </Column>

        <Column field="itemsProcessed" header="Items" sortable>
          <template #body="{ data }">
            <span class="font-medium">
              {{ data.itemsProcessed != null ? data.itemsProcessed : '-' }}
            </span>
          </template>
        </Column>

        <Column field="errorMessage" header="Error">
          <template #body="{ data }">
            <span v-if="data.errorMessage" class="text-red-600 text-sm">
              {{ data.errorMessage }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>
        </Column>

        <Column field="triggeredBy" header="Triggered By" sortable>
          <template #body="{ data }">
            <span class="text-sm text-gray-600 capitalize">
              {{ data.triggeredBy || '-' }}
            </span>
          </template>
        </Column>
      </DataTable>
    </section>

    <!-- Data Management -->
    <section class="bg-white rounded-lg shadow-sm p-6">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Data Management</h2>
      <p class="text-sm text-gray-500 mb-4">
        Clear synced data to start fresh. This will not delete your credentials.
      </p>
      <div class="flex items-center gap-4">
        <Button
          label="Clear All Jira Data"
          icon="pi pi-trash"
          severity="danger"
          outlined
          @click="clearJiraData"
        />
        <Button
          label="Clear All GitHub Data"
          icon="pi pi-trash"
          severity="danger"
          outlined
          @click="clearGithubData"
        />
      </div>
    </section>
  </div>
</template>
