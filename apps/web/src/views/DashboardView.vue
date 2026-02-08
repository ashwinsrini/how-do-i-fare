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
    <h1 class="tm-page-title mb-6">Dashboard</h1>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <i class="pi pi-spin pi-spinner text-3xl text-surface-300"></i>
    </div>

    <!-- Getting started CTA when no credentials -->
    <div
      v-else-if="!hasCredentials"
      class="tm-card p-10 text-center max-w-lg mx-auto mt-8"
    >
      <div class="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
        <i class="pi pi-flag text-2xl text-emerald-600"></i>
      </div>
      <h2 class="text-xl font-bold text-surface-800 mb-2">Welcome to TeamMetrics</h2>
      <p class="text-surface-500 mb-6 max-w-sm mx-auto">
        Connect your Jira and GitHub accounts to start tracking your team's engineering performance.
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
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Jira -->
        <div class="tm-card p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <i class="pi pi-server text-blue-600 text-sm"></i>
              </div>
              <span class="tm-label">Jira</span>
            </div>
            <Tag
              :value="jiraActive > 0 ? 'Active' : 'Inactive'"
              :severity="jiraActive > 0 ? 'success' : 'warn'"
            />
          </div>
          <p class="tm-stat-value text-surface-900">{{ jiraCount }}</p>
          <p class="tm-stat-label">
            {{ jiraActive }} active credential{{ jiraActive !== 1 ? 's' : '' }}
          </p>
        </div>

        <!-- GitHub -->
        <div class="tm-card p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center">
                <i class="pi pi-github text-surface-700 text-sm"></i>
              </div>
              <span class="tm-label">GitHub</span>
            </div>
            <Tag
              :value="githubActive > 0 ? 'Active' : 'Inactive'"
              :severity="githubActive > 0 ? 'success' : 'warn'"
            />
          </div>
          <p class="tm-stat-value text-surface-900">{{ githubCount }}</p>
          <p class="tm-stat-label">
            {{ githubActive }} active credential{{ githubActive !== 1 ? 's' : '' }}
          </p>
        </div>

        <!-- Last Sync -->
        <div class="tm-card p-5">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <i class="pi pi-clock text-emerald-600 text-sm"></i>
            </div>
            <span class="tm-label">Last Sync</span>
          </div>
          <div class="space-y-1.5">
            <p class="text-sm text-surface-600">
              <span class="font-semibold text-surface-800">Jira:</span> {{ lastJiraSync }}
            </p>
            <p class="text-sm text-surface-600">
              <span class="font-semibold text-surface-800">GitHub:</span> {{ lastGithubSync }}
            </p>
          </div>
        </div>

        <!-- Next Sync -->
        <div class="tm-card p-5">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <i class="pi pi-calendar text-amber-600 text-sm"></i>
            </div>
            <span class="tm-label">Next Sync</span>
          </div>
          <p class="text-base font-semibold text-surface-800">{{ nextSyncEstimate }}</p>
          <p class="tm-stat-label">
            Interval: {{ syncStore.settings?.syncIntervalHours || 6 }}h
          </p>
        </div>
      </div>

      <!-- Quick links -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <router-link
          to="/jira"
          class="tm-card-hover p-5 group flex items-center justify-between"
        >
          <div>
            <h3 class="text-base font-semibold text-surface-800 group-hover:text-blue-600 transition-colors">
              Jira Leaderboard
            </h3>
            <p class="text-sm text-surface-400 mt-0.5">Story points, tickets by type and status</p>
          </div>
          <i class="pi pi-arrow-right text-surface-300 group-hover:text-blue-500 transition-colors"></i>
        </router-link>

        <router-link
          to="/github"
          class="tm-card-hover p-5 group flex items-center justify-between"
        >
          <div>
            <h3 class="text-base font-semibold text-surface-800 group-hover:text-purple-600 transition-colors">
              GitHub Leaderboard
            </h3>
            <p class="text-sm text-surface-400 mt-0.5">Pull requests, code reviews, lines changed</p>
          </div>
          <i class="pi pi-arrow-right text-surface-300 group-hover:text-purple-500 transition-colors"></i>
        </router-link>
      </div>
    </div>
  </div>
</template>
