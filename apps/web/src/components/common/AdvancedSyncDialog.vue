<script setup>
import { ref, computed, watch } from 'vue';
import { useCredentialsStore } from '@/stores/credentials.js';
import { useSyncStore } from '@/stores/sync.js';
import { get } from '@/services/api.js';

const props = defineProps({
  visible: Boolean,
});

const emit = defineEmits(['update:visible']);

const credentialsStore = useCredentialsStore();
const syncStore = useSyncStore();

const activeTab = ref('github');
const loading = ref(false);
const starting = ref(false);
const error = ref(null);

// GitHub state
const ghOrgs = ref([]);
const ghReposByOrg = ref({}); // orgId -> repos[]
const expandedOrgs = ref(new Set());
const selectedOrgIds = ref(new Set());
const selectedRepoIds = ref(new Set());
const loadingOrgs = ref(new Set());

// Jira state
const jiraProjects = ref([]);
const selectedProjectKeys = ref(new Set());

const hasGithub = computed(() => credentialsStore.githubCredentials.length > 0);
const hasJira = computed(() => credentialsStore.jiraCredentials.length > 0);

// Auto-select the first available tab
watch(() => props.visible, async (open) => {
  if (!open) return;
  error.value = null;
  starting.value = false;

  if (hasGithub.value) {
    activeTab.value = 'github';
    await loadGithubOrgs();
  } else if (hasJira.value) {
    activeTab.value = 'jira';
    await loadJiraProjects();
  }
});

async function loadGithubOrgs() {
  const cred = credentialsStore.githubCredentials[0];
  if (!cred) return;
  loading.value = true;
  try {
    const data = await get(`/api/v1/github/organizations?credentialId=${cred.id}`);
    ghOrgs.value = data;
    // Select all orgs by default
    selectedOrgIds.value = new Set(data.map((o) => o.id));
    selectedRepoIds.value = new Set();
    ghReposByOrg.value = {};
    expandedOrgs.value = new Set();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function loadJiraProjects() {
  const cred = credentialsStore.jiraCredentials[0];
  if (!cred) return;
  loading.value = true;
  try {
    const data = await get(`/api/v1/jira/projects?credentialId=${cred.id}`);
    jiraProjects.value = data;
    // Select all by default
    selectedProjectKeys.value = new Set(data.map((p) => p.key));
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function toggleOrgExpand(org) {
  if (expandedOrgs.value.has(org.id)) {
    expandedOrgs.value.delete(org.id);
    expandedOrgs.value = new Set(expandedOrgs.value);
    return;
  }

  // Load repos if not cached
  if (!ghReposByOrg.value[org.id]) {
    loadingOrgs.value.add(org.id);
    loadingOrgs.value = new Set(loadingOrgs.value);
    try {
      const data = await get(`/api/v1/github/organizations/${org.id}/repos`);
      ghReposByOrg.value[org.id] = data;
      // If org is selected, auto-select all its repos
      if (selectedOrgIds.value.has(org.id)) {
        for (const r of data) selectedRepoIds.value.add(r.id);
        selectedRepoIds.value = new Set(selectedRepoIds.value);
      }
    } catch (err) {
      error.value = err.message;
    } finally {
      loadingOrgs.value.delete(org.id);
      loadingOrgs.value = new Set(loadingOrgs.value);
    }
  }

  expandedOrgs.value.add(org.id);
  expandedOrgs.value = new Set(expandedOrgs.value);
}

function toggleOrg(org) {
  if (selectedOrgIds.value.has(org.id)) {
    selectedOrgIds.value.delete(org.id);
    // Deselect all repos for this org
    const repos = ghReposByOrg.value[org.id] || [];
    for (const r of repos) selectedRepoIds.value.delete(r.id);
  } else {
    selectedOrgIds.value.add(org.id);
    // Select all repos for this org
    const repos = ghReposByOrg.value[org.id] || [];
    for (const r of repos) selectedRepoIds.value.add(r.id);
  }
  selectedOrgIds.value = new Set(selectedOrgIds.value);
  selectedRepoIds.value = new Set(selectedRepoIds.value);
}

function toggleRepo(repo, orgId) {
  if (selectedRepoIds.value.has(repo.id)) {
    selectedRepoIds.value.delete(repo.id);
    // Check if org should be deselected (if no repos remain)
    const repos = ghReposByOrg.value[orgId] || [];
    const anySelected = repos.some((r) => selectedRepoIds.value.has(r.id));
    if (!anySelected) selectedOrgIds.value.delete(orgId);
  } else {
    selectedRepoIds.value.add(repo.id);
    selectedOrgIds.value.add(orgId);
  }
  selectedOrgIds.value = new Set(selectedOrgIds.value);
  selectedRepoIds.value = new Set(selectedRepoIds.value);
}

function toggleProject(project) {
  if (selectedProjectKeys.value.has(project.key)) {
    selectedProjectKeys.value.delete(project.key);
  } else {
    selectedProjectKeys.value.add(project.key);
  }
  selectedProjectKeys.value = new Set(selectedProjectKeys.value);
}

function selectAllGithub() {
  selectedOrgIds.value = new Set(ghOrgs.value.map((o) => o.id));
  const allRepos = new Set();
  for (const repos of Object.values(ghReposByOrg.value)) {
    for (const r of repos) allRepos.add(r.id);
  }
  selectedRepoIds.value = allRepos;
}

function deselectAllGithub() {
  selectedOrgIds.value = new Set();
  selectedRepoIds.value = new Set();
}

function selectAllJira() {
  selectedProjectKeys.value = new Set(jiraProjects.value.map((p) => p.key));
}

function deselectAllJira() {
  selectedProjectKeys.value = new Set();
}

async function startSync() {
  starting.value = true;
  error.value = null;

  try {
    if (activeTab.value === 'github' && hasGithub.value) {
      const cred = credentialsStore.githubCredentials[0];
      const filters = {};

      // Only add filters if not everything is selected
      if (selectedOrgIds.value.size < ghOrgs.value.length) {
        filters.orgIds = [...selectedOrgIds.value];
      }
      if (selectedRepoIds.value.size > 0) {
        filters.repoIds = [...selectedRepoIds.value];
      }

      const hasFilters = Object.keys(filters).length > 0;
      await syncStore.triggerAdvancedSync('github', cred.id, hasFilters ? filters : undefined);
    } else if (activeTab.value === 'jira' && hasJira.value) {
      const cred = credentialsStore.jiraCredentials[0];
      const filters = {};

      if (selectedProjectKeys.value.size < jiraProjects.value.length) {
        filters.projectKeys = [...selectedProjectKeys.value];
      }

      const hasFilters = Object.keys(filters).length > 0;
      await syncStore.triggerAdvancedSync('jira', cred.id, hasFilters ? filters : undefined);
    }

    emit('update:visible', false);
  } catch (err) {
    error.value = err.message;
  } finally {
    starting.value = false;
  }
}

function close() {
  emit('update:visible', false);
}

const canStart = computed(() => {
  if (activeTab.value === 'github') {
    return selectedOrgIds.value.size > 0;
  }
  return selectedProjectKeys.value.size > 0;
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="visible" class="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" @click.self="close">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h2 class="text-lg font-semibold text-surface-800">Advanced Sync</h2>
            <button @click="close" class="text-surface-400 hover:text-surface-600 transition-colors cursor-pointer">
              <i class="pi pi-times text-sm"></i>
            </button>
          </div>

          <!-- Tabs -->
          <div v-if="hasGithub && hasJira" class="flex border-b border-surface-100">
            <button
              @click="activeTab = 'github'; loadGithubOrgs()"
              class="flex-1 py-2.5 text-sm font-medium text-center transition-colors cursor-pointer"
              :class="activeTab === 'github' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-surface-400 hover:text-surface-600'"
            >
              <i class="pi pi-github mr-1.5"></i>GitHub
            </button>
            <button
              @click="activeTab = 'jira'; loadJiraProjects()"
              class="flex-1 py-2.5 text-sm font-medium text-center transition-colors cursor-pointer"
              :class="activeTab === 'jira' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-surface-400 hover:text-surface-600'"
            >
              <i class="pi pi-ticket mr-1.5"></i>Jira
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto p-5">
            <!-- Loading -->
            <div v-if="loading" class="flex items-center justify-center py-8">
              <i class="pi pi-spin pi-spinner text-xl text-surface-400"></i>
            </div>

            <!-- Error -->
            <div v-else-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-3">
              {{ error }}
            </div>

            <!-- GitHub Tab -->
            <template v-else-if="activeTab === 'github' && hasGithub">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs text-surface-400">Select organizations and repos to sync</span>
                <div class="flex gap-2">
                  <button @click="selectAllGithub" class="text-xs text-emerald-600 hover:underline cursor-pointer">All</button>
                  <button @click="deselectAllGithub" class="text-xs text-surface-400 hover:underline cursor-pointer">None</button>
                </div>
              </div>

              <div class="space-y-1">
                <div v-for="org in ghOrgs" :key="org.id">
                  <!-- Org row -->
                  <div class="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-surface-50 transition-colors">
                    <button
                      @click="toggleOrgExpand(org)"
                      class="text-surface-400 hover:text-surface-600 w-5 h-5 flex items-center justify-center cursor-pointer"
                    >
                      <i
                        v-if="loadingOrgs.has(org.id)"
                        class="pi pi-spin pi-spinner text-xs"
                      ></i>
                      <i
                        v-else
                        class="pi text-xs transition-transform"
                        :class="expandedOrgs.has(org.id) ? 'pi-chevron-down' : 'pi-chevron-right'"
                      ></i>
                    </button>
                    <label class="flex items-center gap-2 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        :checked="selectedOrgIds.has(org.id)"
                        @change="toggleOrg(org)"
                        class="w-4 h-4 rounded border-surface-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <img
                        v-if="org.avatarUrl"
                        :src="org.avatarUrl"
                        class="w-5 h-5 rounded-full"
                      />
                      <span class="text-sm text-surface-700 font-medium">{{ org.login }}</span>
                      <span v-if="org.isPersonal" class="text-[10px] text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded-full">Personal</span>
                    </label>
                  </div>

                  <!-- Repos (expanded) -->
                  <div v-if="expandedOrgs.has(org.id) && ghReposByOrg[org.id]" class="ml-9 space-y-0.5 mb-1">
                    <label
                      v-for="repo in ghReposByOrg[org.id]"
                      :key="repo.id"
                      class="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-surface-50 cursor-pointer text-sm text-surface-600"
                    >
                      <input
                        type="checkbox"
                        :checked="selectedRepoIds.has(repo.id)"
                        @change="toggleRepo(repo, org.id)"
                        class="w-3.5 h-3.5 rounded border-surface-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{{ repo.name }}</span>
                      <i v-if="repo.isPrivate" class="pi pi-lock text-[10px] text-surface-300"></i>
                    </label>
                    <div v-if="ghReposByOrg[org.id].length === 0" class="text-xs text-surface-400 py-1 px-2">
                      No repos found
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- Jira Tab -->
            <template v-else-if="activeTab === 'jira' && hasJira">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs text-surface-400">Select projects to sync</span>
                <div class="flex gap-2">
                  <button @click="selectAllJira" class="text-xs text-emerald-600 hover:underline cursor-pointer">All</button>
                  <button @click="deselectAllJira" class="text-xs text-surface-400 hover:underline cursor-pointer">None</button>
                </div>
              </div>

              <div class="space-y-0.5">
                <label
                  v-for="project in jiraProjects"
                  :key="project.id"
                  class="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-surface-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="selectedProjectKeys.has(project.key)"
                    @change="toggleProject(project)"
                    class="w-4 h-4 rounded border-surface-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <img
                    v-if="project.avatarUrl"
                    :src="project.avatarUrl"
                    class="w-5 h-5 rounded"
                  />
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-surface-700">{{ project.key }}</span>
                    <span class="text-sm text-surface-400 ml-2">{{ project.name }}</span>
                  </div>
                </label>
              </div>
            </template>

            <!-- No credentials -->
            <div v-else class="text-center py-8 text-surface-400 text-sm">
              No credentials configured.
            </div>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-end gap-3 px-5 py-4 border-t border-surface-100">
            <button
              @click="close"
              class="px-4 py-2 text-sm text-surface-600 hover:text-surface-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              @click="startSync"
              :disabled="!canStart || starting"
              class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 cursor-pointer"
            >
              <i v-if="starting" class="pi pi-spin pi-spinner text-xs"></i>
              <i v-else class="pi pi-sync text-xs"></i>
              Start Sync
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
