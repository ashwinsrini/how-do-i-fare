<script setup>
defineProps({
  profile: { type: Object, default: null },
  loading: Boolean,
});

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
  <div v-if="loading" class="flex justify-center py-12">
    <i class="pi pi-spinner pi-spin text-3xl text-surface-300"></i>
  </div>

  <div v-else-if="profile" class="space-y-6">
    <!-- Header -->
    <div class="tm-card p-6 flex items-center gap-5">
      <img
        v-if="profile.member?.avatarUrl"
        :src="profile.member.avatarUrl"
        :alt="profile.member.displayName"
        class="w-16 h-16 rounded-full ring-2 ring-surface-100"
      />
      <div
        v-else
        class="w-16 h-16 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl font-bold ring-2 ring-emerald-100"
      >
        {{ (profile.member?.displayName || '?').charAt(0).toUpperCase() }}
      </div>
      <div>
        <h2 class="text-xl font-bold text-surface-900">{{ profile.member?.displayName }}</h2>
        <div class="flex gap-3 text-sm text-surface-400 mt-0.5">
          <span v-if="profile.member?.jiraDisplayName">Jira: {{ profile.member.jiraDisplayName }}</span>
          <span v-if="profile.member?.githubLogin">GitHub: @{{ profile.member.githubLogin }}</span>
        </div>
      </div>
    </div>

    <!-- Jira Metrics -->
    <div v-if="profile.jira" class="tm-card p-6">
      <h3 class="tm-section-title mb-5">Jira Metrics</h3>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-indigo-600">{{ fmt(profile.jira.totalStoryPoints) }}</div>
          <div class="tm-stat-label">Story Points</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-surface-800">{{ fmt(profile.jira.totalTickets) }}</div>
          <div class="tm-stat-label">Total Tickets</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-emerald-600">{{ fmt(profile.jira.ticketsDone) }}</div>
          <div class="tm-stat-label">Done</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-blue-600">{{ fmt(profile.jira.ticketsInProgress) }}</div>
          <div class="tm-stat-label">In Progress</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-surface-400">{{ fmt(profile.jira.ticketsToDo) }}</div>
          <div class="tm-stat-label">To Do</div>
        </div>
      </div>
    </div>

    <!-- GitHub Metrics -->
    <div v-if="profile.github" class="tm-card p-6">
      <h3 class="tm-section-title mb-5">GitHub Metrics</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-purple-600">{{ fmt(profile.github.prsRaised) }}</div>
          <div class="tm-stat-label">PRs Raised</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-emerald-600">{{ fmt(profile.github.prsMerged) }}</div>
          <div class="tm-stat-label">PRs Merged</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-indigo-600">{{ profile.github.mergeRate }}%</div>
          <div class="tm-stat-label">Merge Rate</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-orange-600">{{ fmt(profile.github.reviewsGiven) }}</div>
          <div class="tm-stat-label">Reviews Given</div>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-emerald-500">+{{ fmt(profile.github.linesAdded) }}</div>
          <div class="tm-stat-label">Lines Added</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-red-500">-{{ fmt(profile.github.linesDeleted) }}</div>
          <div class="tm-stat-label">Lines Deleted</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-blue-600">{{ fmtHours(profile.github.avgHoursToFirstReview) }}</div>
          <div class="tm-stat-label">Avg to First Review</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-surface-50">
          <div class="tm-stat-value text-blue-600">{{ fmtHours(profile.github.avgHoursTotalCycleTime) }}</div>
          <div class="tm-stat-label">Avg Cycle Time</div>
        </div>
      </div>
    </div>

    <div v-if="!profile.jira && !profile.github" class="tm-card p-8 text-center text-surface-400">
      No identity linked yet. Edit this member to link Jira/GitHub accounts.
    </div>
  </div>
</template>
