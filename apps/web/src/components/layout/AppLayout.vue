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
  <div v-if="isPublicPage" class="min-h-screen bg-gray-50">
    <router-view />
  </div>

  <!-- Authenticated layout -->
  <div v-else class="flex flex-col h-screen">
    <!-- Header: full width at top -->
    <AppHeader />

    <!-- Body: sidebar + main content -->
    <div class="flex flex-row flex-1 overflow-hidden">
      <AppSidebar />

      <main class="flex-1 overflow-y-auto bg-gray-50 p-6">
        <router-view />
      </main>
    </div>

    <!-- Footer -->
    <footer class="text-xs text-gray-400 py-2 text-center border-t border-gray-200">
      <a href="https://kopiko.dev" target="_blank" class="hover:text-gray-500">built on Kopiko</a>
    </footer>
  </div>
</template>
