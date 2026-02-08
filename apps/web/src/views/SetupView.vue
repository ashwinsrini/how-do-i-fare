<script setup>
import { ref, computed, onMounted } from 'vue';
import { useCredentialsStore } from '@/stores/credentials.js';
import { useSyncStore } from '@/stores/sync.js';
import { useToast } from 'primevue/usetoast';
import JiraCredentialForm from '@/components/credentials/JiraCredentialForm.vue';
import GithubCredentialForm from '@/components/credentials/GithubCredentialForm.vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Tag from 'primevue/tag';

const credentialsStore = useCredentialsStore();
const syncStore = useSyncStore();
const toast = useToast();

const syncing = ref(false);

onMounted(async () => {
  try {
    await Promise.all([
      credentialsStore.fetchJiraCredentials(),
      credentialsStore.fetchGithubCredentials(),
    ]);
  } catch {
    // Errors handled in stores
  }
});

const hasAnyCredential = computed(() => {
  return credentialsStore.jiraCredentials.length > 0 || credentialsStore.githubCredentials.length > 0;
});

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

async function deleteJiraCredential(credential) {
  if (!window.confirm(`Delete Jira credential "${credential.label}"? This will also remove all synced data for this credential.`)) {
    return;
  }

  try {
    await credentialsStore.deleteJiraCredential(credential.id);
    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: `Jira credential "${credential.label}" deleted.`,
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

async function deleteGithubCredential(credential) {
  if (!window.confirm(`Delete GitHub credential "${credential.label}"? This will also remove all synced data for this credential.`)) {
    return;
  }

  try {
    await credentialsStore.deleteGithubCredential(credential.id);
    toast.add({
      severity: 'success',
      summary: 'Deleted',
      detail: `GitHub credential "${credential.label}" deleted.`,
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

async function triggerSyncAll() {
  syncing.value = true;
  const jobs = [];

  try {
    // Trigger sync for all Jira credentials
    for (const cred of credentialsStore.jiraCredentials) {
      jobs.push(syncStore.triggerSync('jira', cred.id));
    }
    // Trigger sync for all GitHub credentials
    for (const cred of credentialsStore.githubCredentials) {
      jobs.push(syncStore.triggerSync('github', cred.id));
    }

    await Promise.all(jobs);

    toast.add({
      severity: 'success',
      summary: 'Sync Triggered',
      detail: `${jobs.length} sync job(s) started.`,
      life: 3000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Sync Failed',
      detail: err.message,
      life: 5000,
    });
  } finally {
    syncing.value = false;
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-800">Credentials Setup</h1>
      <Button
        v-if="hasAnyCredential"
        label="Sync Now"
        icon="pi pi-sync"
        :loading="syncing"
        @click="triggerSyncAll"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Jira Credentials Section -->
      <div>
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-server text-blue-500"></i>
              <span>Jira Credentials</span>
            </div>
          </template>
          <template #content>
            <JiraCredentialForm />
          </template>
        </Card>

        <!-- Existing Jira Credentials List -->
        <div v-if="credentialsStore.jiraCredentials.length > 0" class="mt-4 space-y-3">
          <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Saved Credentials</h3>
          <div
            v-for="cred in credentialsStore.jiraCredentials"
            :key="cred.id"
            class="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-gray-800">{{ cred.label }}</span>
                <Tag
                  :value="cred.isActive ? 'Active' : 'Inactive'"
                  :severity="cred.isActive ? 'success' : 'warn'"
                  class="text-xs"
                />
              </div>
              <p class="text-sm text-gray-500">
                {{ cred.domain }}.atlassian.net &middot; {{ cred.email }}
              </p>
              <p class="text-xs text-gray-400 mt-1">
                Created {{ formatDate(cred.createdAt) }}
              </p>
            </div>
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              @click="deleteJiraCredential(cred)"
            />
          </div>
        </div>
      </div>

      <!-- GitHub Credentials Section -->
      <div>
        <Card>
          <template #title>
            <div class="flex items-center gap-2">
              <i class="pi pi-github text-gray-800"></i>
              <span>GitHub Credentials</span>
            </div>
          </template>
          <template #content>
            <GithubCredentialForm />
          </template>
        </Card>

        <!-- Existing GitHub Credentials List -->
        <div v-if="credentialsStore.githubCredentials.length > 0" class="mt-4 space-y-3">
          <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Saved Credentials</h3>
          <div
            v-for="cred in credentialsStore.githubCredentials"
            :key="cred.id"
            class="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between"
          >
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-medium text-gray-800">{{ cred.label }}</span>
                <Tag
                  :value="cred.isActive ? 'Active' : 'Inactive'"
                  :severity="cred.isActive ? 'success' : 'warn'"
                  class="text-xs"
                />
              </div>
              <p class="text-sm text-gray-500">
                {{ cred.username || 'GitHub User' }}
              </p>
              <p class="text-xs text-gray-400 mt-1">
                Created {{ formatDate(cred.createdAt) }}
              </p>
            </div>
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              @click="deleteGithubCredential(cred)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
