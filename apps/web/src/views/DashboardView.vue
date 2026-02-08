<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useCredentialsStore } from '@/stores/credentials.js';
import { useSyncStore } from '@/stores/sync.js';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

const router = useRouter();
const credentialsStore = useCredentialsStore();
const syncStore = useSyncStore();
const loading = ref(true);

onMounted(async () => {
  try {
    await Promise.all([
      credentialsStore.fetchJiraCredentials(),
      credentialsStore.fetchGithubCredentials(),
      syncStore.fetchStatus(),
      syncStore.fetchSettings(),
    ]);
  } catch {
    // Errors handled in stores
  } finally {
    loading.value = false;
  }
});

const hasCredentials = computed(() => {
  return credentialsStore.jiraCredentials.length > 0 || credentialsStore.githubCredentials.length > 0;
});

const jiraCount = computed(() => credentialsStore.jiraCredentials.length);
const githubCount = computed(() => credentialsStore.githubCredentials.length);

const jiraActive = computed(() =>
  credentialsStore.jiraCredentials.filter((c) => c.isActive).length
);
const githubActive = computed(() =>
  credentialsStore.githubCredentials.filter((c) => c.isActive).length
);

const lastJiraSync = computed(() => {
  const job = syncStore.status?.lastCompleted?.jira;
  return job?.completedAt ? formatDate(job.completedAt) : 'Never';
});

const lastGithubSync = computed(() => {
  const job = syncStore.status?.lastCompleted?.github;
  return job?.completedAt ? formatDate(job.completedAt) : 'Never';
});

const nextSyncEstimate = computed(() => {
  const interval = syncStore.settings?.syncIntervalHours || 6;
  // Find the most recent completed sync
  const jiraTime = syncStore.status?.lastCompleted?.jira?.completedAt;
  const githubTime = syncStore.status?.lastCompleted?.github?.completedAt;

  const times = [jiraTime, githubTime].filter(Boolean).map((t) => new Date(t).getTime());
  if (times.length === 0) return 'After first sync';

  const latestSync = Math.max(...times);
  const nextSync = new Date(latestSync + interval * 60 * 60 * 1000);
  return formatDate(nextSync);
});

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function goToSetup() {
  router.push('/setup');
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <i class="pi pi-spin pi-spinner text-3xl text-gray-400"></i>
    </div>

    <!-- Getting started CTA when no credentials -->
    <div
      v-else-if="!hasCredentials"
      class="bg-white rounded-lg shadow-sm p-8 text-center max-w-lg mx-auto mt-12"
    >
      <i class="pi pi-flag text-5xl text-blue-500 mb-4"></i>
      <h2 class="text-xl font-semibold text-gray-800 mb-2">Welcome!</h2>
      <p class="text-gray-600 mb-6">
        Set up your Jira and GitHub credentials to get started tracking your team's performance.
      </p>
      <Button
        label="Get Started"
        icon="pi pi-arrow-right"
        @click="goToSetup"
      />
    </div>

    <!-- Dashboard content when credentials exist -->
    <div v-else>
      <!-- Summary cards row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- Jira Integration Status -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Jira</h3>
            <Tag
              :value="jiraActive > 0 ? 'Active' : 'Inactive'"
              :severity="jiraActive > 0 ? 'success' : 'warn'"
            />
          </div>
          <p class="text-2xl font-bold text-gray-800">{{ jiraCount }}</p>
          <p class="text-sm text-gray-500 mt-1">
            {{ jiraActive }} active credential{{ jiraActive !== 1 ? 's' : '' }}
          </p>
        </div>

        <!-- GitHub Integration Status -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">GitHub</h3>
            <Tag
              :value="githubActive > 0 ? 'Active' : 'Inactive'"
              :severity="githubActive > 0 ? 'success' : 'warn'"
            />
          </div>
          <p class="text-2xl font-bold text-gray-800">{{ githubCount }}</p>
          <p class="text-sm text-gray-500 mt-1">
            {{ githubActive }} active credential{{ githubActive !== 1 ? 's' : '' }}
          </p>
        </div>

        <!-- Last Sync Time -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Last Sync</h3>
            <i class="pi pi-clock text-gray-400"></i>
          </div>
          <div class="space-y-1">
            <p class="text-sm text-gray-700">
              <span class="font-medium">Jira:</span> {{ lastJiraSync }}
            </p>
            <p class="text-sm text-gray-700">
              <span class="font-medium">GitHub:</span> {{ lastGithubSync }}
            </p>
          </div>
        </div>

        <!-- Next Sync Time -->
        <div class="bg-white rounded-lg shadow-sm p-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">Next Sync</h3>
            <i class="pi pi-calendar text-gray-400"></i>
          </div>
          <p class="text-lg font-semibold text-gray-800">{{ nextSyncEstimate }}</p>
          <p class="text-sm text-gray-500 mt-1">
            Interval: {{ syncStore.settings?.syncIntervalHours || 6 }}h
          </p>
        </div>
      </div>

      <!-- Quick links -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <router-link
          to="/jira"
          class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow group flex items-center justify-between"
        >
          <div>
            <h3 class="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
              View Jira Leaderboard
            </h3>
            <p class="text-sm text-gray-500 mt-1">Story points, tickets by type and status</p>
          </div>
          <i class="pi pi-arrow-right text-gray-400 group-hover:text-blue-500 transition-colors text-xl"></i>
        </router-link>

        <router-link
          to="/github"
          class="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow group flex items-center justify-between"
        >
          <div>
            <h3 class="text-lg font-semibold text-gray-800 group-hover:text-purple-600 transition-colors">
              View GitHub Leaderboard
            </h3>
            <p class="text-sm text-gray-500 mt-1">Pull requests, code reviews, lines changed</p>
          </div>
          <i class="pi pi-arrow-right text-gray-400 group-hover:text-purple-500 transition-colors text-xl"></i>
        </router-link>
      </div>
    </div>
  </div>
</template>
