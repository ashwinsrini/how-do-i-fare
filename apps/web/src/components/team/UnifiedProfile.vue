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
    <i class="pi pi-spinner pi-spin text-3xl text-indigo-600"></i>
  </div>

  <div v-else-if="profile" class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <img
        v-if="profile.member?.avatarUrl"
        :src="profile.member.avatarUrl"
        :alt="profile.member.displayName"
        class="w-16 h-16 rounded-full"
      />
      <div
        v-else
        class="w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl font-bold"
      >
        {{ (profile.member?.displayName || '?').charAt(0).toUpperCase() }}
      </div>
      <div>
        <h2 class="text-xl font-bold text-gray-800">{{ profile.member?.displayName }}</h2>
        <div class="flex gap-3 text-sm text-gray-500">
          <span v-if="profile.member?.jiraDisplayName">Jira: {{ profile.member.jiraDisplayName }}</span>
          <span v-if="profile.member?.githubLogin">GitHub: @{{ profile.member.githubLogin }}</span>
        </div>
      </div>
    </div>

    <!-- Jira Metrics -->
    <div v-if="profile.jira" class="bg-white rounded-lg shadow-sm p-5">
      <h3 class="text-lg font-semibold text-gray-700 mb-4">Jira Metrics</h3>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-indigo-600">{{ fmt(profile.jira.totalStoryPoints) }}</div>
          <div class="text-sm text-gray-500">Story Points</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-800">{{ fmt(profile.jira.totalTickets) }}</div>
          <div class="text-sm text-gray-500">Total Tickets</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{{ fmt(profile.jira.ticketsDone) }}</div>
          <div class="text-sm text-gray-500">Done</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{{ fmt(profile.jira.ticketsInProgress) }}</div>
          <div class="text-sm text-gray-500">In Progress</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-500">{{ fmt(profile.jira.ticketsToDo) }}</div>
          <div class="text-sm text-gray-500">To Do</div>
        </div>
      </div>
    </div>

    <!-- GitHub Metrics -->
    <div v-if="profile.github" class="bg-white rounded-lg shadow-sm p-5">
      <h3 class="text-lg font-semibold text-gray-700 mb-4">GitHub Metrics</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{{ fmt(profile.github.prsRaised) }}</div>
          <div class="text-sm text-gray-500">PRs Raised</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{{ fmt(profile.github.prsMerged) }}</div>
          <div class="text-sm text-gray-500">PRs Merged</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-indigo-600">{{ profile.github.mergeRate }}%</div>
          <div class="text-sm text-gray-500">Merge Rate</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-600">{{ fmt(profile.github.reviewsGiven) }}</div>
          <div class="text-sm text-gray-500">Reviews Given</div>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-green-500">+{{ fmt(profile.github.linesAdded) }}</div>
          <div class="text-sm text-gray-500">Lines Added</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-red-500">-{{ fmt(profile.github.linesDeleted) }}</div>
          <div class="text-sm text-gray-500">Lines Deleted</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{{ fmtHours(profile.github.avgHoursToFirstReview) }}</div>
          <div class="text-sm text-gray-500">Avg to First Review</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{{ fmtHours(profile.github.avgHoursTotalCycleTime) }}</div>
          <div class="text-sm text-gray-500">Avg Cycle Time</div>
        </div>
      </div>
    </div>

    <div v-if="!profile.jira && !profile.github" class="text-center text-gray-500 py-8">
      No identity linked yet. Edit this member to link Jira/GitHub accounts.
    </div>
  </div>
</template>
