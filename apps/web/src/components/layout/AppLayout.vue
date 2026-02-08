<script setup>
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import AppHeader from './AppHeader.vue';
import AppSidebar from './AppSidebar.vue';

const route = useRoute();
const isPublicPage = computed(() => route.meta.public);
</script>

<template>
  <!-- Public pages (login): no sidebar/header -->
  <div v-if="isPublicPage" class="min-h-screen bg-surface-50">
    <router-view />
  </div>

  <!-- Authenticated layout -->
  <div v-else class="flex flex-col h-screen bg-surface-50">
    <AppHeader />

    <div class="flex flex-row flex-1 overflow-hidden">
      <AppSidebar />

      <main class="flex-1 overflow-y-auto p-6 lg:p-8">
        <div class="max-w-7xl mx-auto">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>
