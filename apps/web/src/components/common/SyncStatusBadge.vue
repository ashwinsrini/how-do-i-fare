<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useSyncStore } from '@/stores/sync.js';
import AdvancedSyncDialog from './AdvancedSyncDialog.vue';

const syncStore = useSyncStore();
const dropdownOpen = ref(false);
const badgeRef = ref(null);
const dropdownRef = ref(null);
const advancedSyncOpen = ref(false);
const cancellingId = ref(null);

onMounted(async () => {
  await syncStore.fetchStatus();
  if (syncStore.isSyncing) {
    syncStore.startPolling();
  }
  document.addEventListener('click', onClickOutside);
});

onUnmounted(() => {
  syncStore.stopPolling();
  document.removeEventListener('click', onClickOutside);
});

watch(() => syncStore.isSyncing, (syncing) => {
  if (syncing) {
    syncStore.startPolling();
  }
});

function onClickOutside(e) {
  if (
    dropdownOpen.value &&
    badgeRef.value && !badgeRef.value.contains(e.target) &&
    dropdownRef.value && !dropdownRef.value.contains(e.target)
  ) {
    dropdownOpen.value = false;
  }
}

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
  if (dropdownOpen.value) {
    syncStore.fetchStatus();
  }
}

async function cancelJob(jobId) {
  cancellingId.value = jobId;
  try {
    await syncStore.cancelSync(jobId);
  } catch {
    // ignore
  } finally {
    cancellingId.value = null;
  }
}

function openAdvancedSync() {
  dropdownOpen.value = false;
  advancedSyncOpen.value = true;
}

const lastSyncTime = computed(() => {
  const lastCompleted = syncStore.status?.lastCompleted;
  if (!lastCompleted) return null;

  const times = [
    lastCompleted.jira?.completedAt,
    lastCompleted.github?.completedAt,
  ].filter(Boolean);

  if (times.length === 0) return null;

  return times.reduce((latest, t) => {
    return new Date(t) > new Date(latest) ? t : latest;
  });
});

const timeAgo = computed(() => {
  if (!lastSyncTime.value) return null;

  const now = new Date();
  const syncDate = new Date(lastSyncTime.value);
  const diffMs = now - syncDate;
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
});

const recentHistory = computed(() => {
  return syncStore.status?.recentHistory || [];
});

function elapsed(startedAt) {
  if (!startedAt) return '';
  const ms = Date.now() - new Date(startedAt).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function duration(startedAt, completedAt) {
  if (!startedAt || !completedAt) return '';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function progressPercent(job) {
  if (!job.totalItems || job.totalItems === 0) return null;
  return Math.min(100, Math.round((job.processedItems / job.totalItems) * 100));
}

function statusLabel(status) {
  if (status === 'completed') return 'Done';
  if (status === 'failed') return 'Failed';
  if (status === 'cancelled') return 'Cancelled';
  return status;
}

function statusClass(status) {
  if (status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  if (status === 'cancelled') return 'bg-amber-100 text-amber-700';
  return 'bg-surface-100 text-surface-600';
}
</script>

<template>
  <div class="relative">
    <!-- Badge button -->
    <button
      ref="badgeRef"
      @click="toggleDropdown"
      class="flex items-center gap-2 text-sm px-2.5 py-1 rounded-lg transition-colors hover:bg-surface-100 cursor-pointer"
    >
      <!-- Syncing state -->
      <template v-if="syncStore.isSyncing">
        <span class="relative flex h-2.5 w-2.5">
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
          ></span>
          <span class="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
        </span>
        <span class="text-emerald-600 font-medium">Syncing...</span>
        <i class="pi pi-chevron-down text-[10px] text-surface-400 transition-transform" :class="{ 'rotate-180': dropdownOpen }"></i>
      </template>

      <!-- Last sync exists -->
      <template v-else-if="lastSyncTime">
        <span class="inline-flex h-2.5 w-2.5 rounded-full bg-green-500"></span>
        <span class="text-surface-500">Last sync: {{ timeAgo }}</span>
        <i class="pi pi-chevron-down text-[10px] text-surface-400 transition-transform" :class="{ 'rotate-180': dropdownOpen }"></i>
      </template>

      <!-- No sync yet -->
      <template v-else>
        <span class="inline-flex h-2.5 w-2.5 rounded-full bg-surface-300"></span>
        <span class="text-surface-400">Not synced</span>
      </template>
    </button>

    <!-- Dropdown panel -->
    <Transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="dropdownOpen"
        ref="dropdownRef"
        class="absolute right-0 top-full mt-2 w-[420px] bg-white rounded-xl shadow-lg border border-surface-200 z-50 overflow-hidden"
      >
        <!-- Running jobs -->
        <div v-if="syncStore.runningJobs.length > 0" class="p-4 border-b border-surface-100">
          <div class="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Running</div>
          <div class="space-y-3">
            <div
              v-for="job in syncStore.runningJobs"
              :key="job.id"
              class="bg-surface-50 rounded-lg p-3"
            >
              <!-- Type + elapsed + stop button -->
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-2">
                  <i
                    :class="job.type === 'github' ? 'pi pi-github' : 'pi pi-ticket'"
                    class="text-sm text-surface-600"
                  ></i>
                  <span class="text-sm font-medium text-surface-700 capitalize">{{ job.type }}</span>
                  <span
                    class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700"
                  >
                    {{ job.status === 'pending' ? 'Queued' : 'Running' }}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-surface-400">{{ elapsed(job.startedAt || job.createdAt) }}</span>
                  <button
                    @click.stop="cancelJob(job.id)"
                    :disabled="cancellingId !== null"
                    class="text-red-400 hover:text-red-600 transition-colors p-0.5 rounded hover:bg-red-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Stop sync"
                  >
                    <i v-if="cancellingId === job.id" class="pi pi-spin pi-spinner text-xs"></i>
                    <i v-else class="pi pi-stop-circle text-xs"></i>
                  </button>
                </div>
              </div>

              <!-- Phase text -->
              <div v-if="job.currentPhase" class="text-xs text-surface-500 mb-2 truncate" :title="job.currentPhase">
                {{ job.currentPhase }}
              </div>

              <!-- Progress bar -->
              <div class="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                <div
                  v-if="progressPercent(job) !== null"
                  class="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  :style="{ width: progressPercent(job) + '%' }"
                ></div>
                <div
                  v-else
                  class="h-full w-1/3 bg-emerald-500 rounded-full animate-indeterminate"
                ></div>
              </div>

              <!-- Items count -->
              <div class="text-xs text-surface-400 mt-1.5">
                <template v-if="job.totalItems > 0">
                  {{ job.processedItems.toLocaleString() }} / {{ job.totalItems.toLocaleString() }} items
                </template>
                <template v-else-if="job.processedItems > 0">
                  {{ job.processedItems.toLocaleString() }} items processed
                </template>
                <template v-else>
                  Starting...
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent history -->
        <div class="p-4">
          <div class="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Recent</div>
          <div v-if="recentHistory.length === 0" class="text-xs text-surface-400 text-center py-3">
            No sync history yet
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="job in recentHistory"
              :key="job.id"
              class="flex items-center gap-3 py-2"
            >
              <i
                :class="job.type === 'github' ? 'pi pi-github' : 'pi pi-ticket'"
                class="text-sm text-surface-400"
              ></i>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm text-surface-600 capitalize">{{ job.type }}</span>
                  <span
                    class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                    :class="statusClass(job.status)"
                  >
                    {{ statusLabel(job.status) }}
                  </span>
                  <span
                    v-if="job.triggeredBy"
                    class="text-[9px] font-medium px-1 py-0.5 rounded bg-surface-100 text-surface-400 uppercase"
                  >
                    {{ job.triggeredBy }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                  <span v-if="duration(job.startedAt, job.completedAt)" class="text-[11px] text-surface-400">
                    {{ duration(job.startedAt, job.completedAt) }}
                  </span>
                  <span v-if="job.processedItems > 0" class="text-[11px] text-surface-300">
                    {{ job.processedItems.toLocaleString() }} items
                  </span>
                </div>
                <div v-if="job.error" class="text-[11px] text-red-500 truncate mt-0.5" :title="job.error">
                  {{ job.error }}
                </div>
              </div>
              <div class="text-right shrink-0">
                <div class="text-xs text-surface-400">{{ formatTime(job.completedAt) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Advanced Sync link -->
        <div class="px-4 pb-3 pt-1 border-t border-surface-100">
          <button
            @click="openAdvancedSync"
            class="text-xs text-emerald-600 hover:text-emerald-700 hover:underline transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <i class="pi pi-sliders-h text-[10px]"></i>
            Advanced Sync...
          </button>
        </div>
      </div>
    </Transition>

    <!-- Advanced Sync Dialog -->
    <AdvancedSyncDialog v-model:visible="advancedSyncOpen" />
  </div>
</template>

<style scoped>
@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.animate-indeterminate {
  animation: indeterminate 1.5s ease-in-out infinite;
}
</style>
