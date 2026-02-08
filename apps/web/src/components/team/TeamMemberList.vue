<script setup>
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';

defineProps({
  members: { type: Array, default: () => [] },
  loading: Boolean,
});

const emit = defineEmits(['edit', 'delete', 'view']);
</script>

<template>
  <DataTable :value="members" :loading="loading" stripedRows class="p-datatable-sm" responsiveLayout="scroll">
    <Column header="Member" style="min-width: 14rem">
      <template #body="{ data }">
        <div class="flex items-center gap-3">
          <img
            v-if="data.avatarUrl"
            :src="data.avatarUrl"
            :alt="data.displayName"
            class="w-8 h-8 rounded-full"
          />
          <div
            v-else
            class="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold"
          >
            {{ (data.displayName || '?').charAt(0).toUpperCase() }}
          </div>
          <span class="font-medium">{{ data.displayName }}</span>
        </div>
      </template>
    </Column>

    <Column header="Jira" style="min-width: 10rem">
      <template #body="{ data }">
        <Tag v-if="data.jiraAccountId" severity="info" :value="data.jiraDisplayName || data.jiraAccountId" />
        <span v-else class="text-gray-400 text-sm">Not linked</span>
      </template>
    </Column>

    <Column header="GitHub" style="min-width: 10rem">
      <template #body="{ data }">
        <Tag v-if="data.githubLogin" severity="success" :value="data.githubLogin" />
        <span v-else class="text-gray-400 text-sm">Not linked</span>
      </template>
    </Column>

    <Column header="Actions" style="width: 12rem">
      <template #body="{ data }">
        <div class="flex gap-2">
          <Button icon="pi pi-user" severity="info" text rounded size="small" @click="emit('view', data)" />
          <Button icon="pi pi-pencil" severity="secondary" text rounded size="small" @click="emit('edit', data)" />
          <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="emit('delete', data)" />
        </div>
      </template>
    </Column>

    <template #empty>
      <div class="flex flex-col items-center justify-center py-8 text-gray-500">
        <i class="pi pi-users text-4xl mb-2"></i>
        <p>No team members yet. Add your first member to get started.</p>
      </div>
    </template>
  </DataTable>
</template>
