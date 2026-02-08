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
const pat = ref('');
const saving = ref(false);

function clearForm() {
  label.value = '';
  pat.value = '';
}

function isFormValid() {
  return label.value.trim() && pat.value.trim();
}

async function testAndSave() {
  if (!isFormValid()) return;

  saving.value = true;
  try {
    await credentialsStore.saveGithubCredential({
      label: label.value.trim(),
      pat: pat.value.trim(),
    });

    toast.add({
      severity: 'success',
      summary: 'Saved',
      detail: 'GitHub credential saved successfully.',
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
          <p class="font-semibold mb-1">How to create a GitHub Personal Access Token:</p>
          <ol class="list-decimal ml-4 space-y-0.5">
            <li>Go to <a href="https://github.com/settings/tokens" target="_blank" class="underline">github.com/settings/tokens</a></li>
            <li>Click "Generate new token" &rarr; "Fine-grained token" (recommended)</li>
            <li>Set expiration, select the organization under "Resource owner"</li>
            <li>Repository access: "All repositories" (to sync all org repos)</li>
            <li>Permissions needed:
              <ul class="list-disc ml-4">
                <li>Repository: Contents (Read), Pull requests (Read), Metadata (Read)</li>
                <li>Organization: Members (Read)</li>
              </ul>
            </li>
            <li>Click "Generate token" and copy it</li>
          </ol>
          <p class="mt-2 text-xs text-surface-500">
            <strong>Classic token alternative:</strong> Select scopes: <code>repo</code>, <code>read:org</code>
          </p>
        </div>
      </template>
    </Message>

    <!-- Label -->
    <div class="flex flex-col gap-1">
      <label class="tm-label">Label</label>
      <InputText
        v-model="label"
        placeholder="e.g. My GitHub Account"
        class="w-full"
      />
    </div>

    <!-- Personal Access Token -->
    <div class="flex flex-col gap-1">
      <label class="tm-label">Personal Access Token</label>
      <Password
        v-model="pat"
        placeholder="ghp_xxxxxxxxxxxx"
        :feedback="false"
        toggleMask
        class="w-full"
        inputClass="w-full"
      />
    </div>

    <!-- Button -->
    <div class="flex items-center gap-3 pt-2">
      <Button
        label="Test & Save"
        icon="pi pi-check"
        :loading="saving"
        :disabled="!isFormValid()"
        @click="testAndSave"
      />
    </div>
  </div>
</template>
