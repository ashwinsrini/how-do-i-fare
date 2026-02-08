<script setup>
import { ref } from 'vue';
import { useCredentialsStore } from '@/stores/credentials.js';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';

const credentialsStore = useCredentialsStore();
const toast = useToast();

const label = ref('');
const domain = ref('');
const email = ref('');
const apiToken = ref('');
const saving = ref(false);
const testing = ref(false);
const testResult = ref(null);

function clearForm() {
  label.value = '';
  domain.value = '';
  email.value = '';
  apiToken.value = '';
  testResult.value = null;
}

function isFormValid() {
  return (
    label.value.trim() &&
    domain.value.trim() &&
    email.value.trim() &&
    apiToken.value.trim()
  );
}

async function testConnection() {
  if (!isFormValid()) return;

  testing.value = true;
  testResult.value = null;
  try {
    // POST to credentials endpoint to test. The API validates the connection
    // before saving. We use a direct fetch for test-only to avoid creating a record.
    const token = localStorage.getItem('auth_token');
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const response = await fetch(`${baseUrl}/api/v1/credentials/jira`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Test-Only': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        label: label.value.trim(),
        domain: domain.value.trim(),
        email: email.value.trim(),
        apiToken: apiToken.value.trim(),
      }),
    });

    if (response.ok) {
      testResult.value = { success: true };
      toast.add({
        severity: 'success',
        summary: 'Connection Successful',
        detail: 'Jira credentials are valid.',
        life: 3000,
      });
    } else {
      const body = await response.json().catch(() => null);
      testResult.value = { success: false, error: body?.error || 'Connection failed' };
      toast.add({
        severity: 'error',
        summary: 'Connection Failed',
        detail: body?.error || 'Could not connect to Jira.',
        life: 5000,
      });
    }
  } catch (err) {
    testResult.value = { success: false, error: err.message };
    toast.add({
      severity: 'error',
      summary: 'Connection Failed',
      detail: err.message,
      life: 5000,
    });
  } finally {
    testing.value = false;
  }
}

async function save() {
  if (!isFormValid()) return;

  saving.value = true;
  try {
    await credentialsStore.saveJiraCredential({
      label: label.value.trim(),
      domain: domain.value.trim(),
      email: email.value.trim(),
      apiToken: apiToken.value.trim(),
    });

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'Jira credential saved successfully.',
      life: 3000,
    });

    clearForm();
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: err.message,
      life: 5000,
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Setup guidance -->
    <Message severity="info" :closable="false">
      <template #default>
        <div class="text-sm">
          <p class="font-semibold mb-1">How to create a Jira API Token:</p>
          <ol class="list-decimal ml-4 space-y-0.5">
            <li>Go to <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" class="underline">id.atlassian.com/manage-profile/security/api-tokens</a></li>
            <li>Click "Create API token" and give it a label</li>
            <li>Copy the generated token — you won't see it again</li>
            <li>Use the email address associated with your Atlassian account</li>
          </ol>
          <p class="mt-2 text-xs text-gray-600">
            <strong>Required permissions:</strong> The token inherits your Jira user permissions.
            Ensure you have access to the projects you want to sync.
          </p>
        </div>
      </template>
    </Message>

    <!-- Label -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Label</label>
      <InputText
        v-model="label"
        placeholder="e.g. My Jira Account"
        class="w-full"
      />
    </div>

    <!-- Domain -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Domain</label>
      <div class="flex items-center gap-1">
        <InputText
          v-model="domain"
          placeholder="your-company"
          class="flex-1"
        />
        <span class="text-sm text-gray-500 whitespace-nowrap">.atlassian.net</span>
      </div>
    </div>

    <!-- Email -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">Email</label>
      <InputText
        v-model="email"
        type="email"
        placeholder="you@example.com"
        class="w-full"
      />
    </div>

    <!-- API Token -->
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium text-gray-700">API Token</label>
      <Password
        v-model="apiToken"
        placeholder="Paste your Jira API token"
        :feedback="false"
        toggleMask
        class="w-full"
        inputClass="w-full"
      />
    </div>

    <!-- Buttons -->
    <div class="flex items-center gap-3 pt-2">
      <Button
        label="Test Connection"
        icon="pi pi-bolt"
        severity="secondary"
        outlined
        :loading="testing"
        :disabled="!isFormValid() || saving"
        @click="testConnection"
      />
      <Button
        label="Save"
        icon="pi pi-check"
        :loading="saving"
        :disabled="!isFormValid() || testing"
        @click="save"
      />
    </div>

    <!-- Test result feedback -->
    <div v-if="testResult" class="text-sm">
      <span
        v-if="testResult.success"
        class="text-green-600 flex items-center gap-1"
      >
        <i class="pi pi-check-circle"></i> Connection verified
      </span>
      <span
        v-else
        class="text-red-600 flex items-center gap-1"
      >
        <i class="pi pi-times-circle"></i> {{ testResult.error }}
      </span>
    </div>
  </div>
</template>
