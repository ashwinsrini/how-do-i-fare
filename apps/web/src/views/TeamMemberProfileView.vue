<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useTeamStore } from '@/stores/team.js';
import { useToast } from 'primevue/usetoast';
import Button from 'primevue/button';
import DateRangePicker from '@/components/common/DateRangePicker.vue';
import UnifiedProfile from '@/components/team/UnifiedProfile.vue';

const route = useRoute();
const teamStore = useTeamStore();
const toast = useToast();

const startDate = ref(null);
const endDate = ref(null);

function formatDateForApi(date) {
  if (!date) return null;
  return new Date(date).toISOString().split('T')[0];
}

async function loadProfile() {
  try {
    await teamStore.fetchProfile(route.params.id, {
      startDate: formatDateForApi(startDate.value),
      endDate: formatDateForApi(endDate.value),
    });
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Error', detail: err.message, life: 5000 });
  }
}

onMounted(loadProfile);

watch(() => route.params.id, loadProfile);
</script>

<template>
  <div>
    <div class="flex items-center gap-4 mb-6">
      <router-link to="/team" class="text-indigo-600 hover:text-indigo-800">
        <i class="pi pi-arrow-left"></i> Back to Team
      </router-link>
    </div>

    <div class="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div class="flex flex-wrap items-end gap-4">
        <DateRangePicker v-model:startDate="startDate" v-model:endDate="endDate" />
        <Button label="Apply" icon="pi pi-search" :loading="teamStore.loading" @click="loadProfile" />
      </div>
    </div>

    <UnifiedProfile :profile="teamStore.profile" :loading="teamStore.loading" />
  </div>
</template>
