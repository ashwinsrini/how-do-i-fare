<script setup>
import { ref, watch, computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';

const props = defineProps({
  visible: Boolean,
  member: { type: Object, default: null },
  jiraUsers: { type: Array, default: () => [] },
  githubUsers: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:visible', 'save']);

const form = ref({
  displayName: '',
  avatarUrl: '',
  jiraAccountId: null,
  jiraDisplayName: '',
  githubLogin: null,
  githubUserId: null,
});

watch(() => props.visible, (val) => {
  if (val && props.member) {
    form.value = {
      displayName: props.member.displayName || '',
      avatarUrl: props.member.avatarUrl || '',
      jiraAccountId: props.member.jiraAccountId || null,
      jiraDisplayName: props.member.jiraDisplayName || '',
      githubLogin: props.member.githubLogin || null,
      githubUserId: props.member.githubUserId || null,
    };
  } else if (val) {
    form.value = {
      displayName: '',
      avatarUrl: '',
      jiraAccountId: null,
      jiraDisplayName: '',
      githubLogin: null,
      githubUserId: null,
    };
  }
});

const jiraOptions = computed(() =>
  props.jiraUsers.map((u) => ({
    label: `${u.assigneeName} (${u.assigneeAccountId})`,
    value: u.assigneeAccountId,
    name: u.assigneeName,
    avatar: u.assigneeAvatar,
  }))
);

const githubOptions = computed(() =>
  props.githubUsers.map((u) => ({
    label: u.displayName ? `${u.displayName} (${u.login})` : u.login,
    value: u.login,
    displayName: u.displayName || null,
    userId: u.githubUserId,
    avatar: u.avatarUrl,
  }))
);

function onJiraSelect(val) {
  const user = props.jiraUsers.find((u) => u.assigneeAccountId === val);
  if (user) {
    form.value.jiraDisplayName = user.assigneeName || '';
    if (!form.value.displayName) {
      form.value.displayName = user.assigneeName || '';
    }
    if (!form.value.avatarUrl && user.assigneeAvatar) {
      form.value.avatarUrl = user.assigneeAvatar;
    }
  }
}

function onGithubSelect(val) {
  const user = props.githubUsers.find((u) => u.login === val);
  if (user) {
    form.value.githubUserId = user.githubUserId;
    if (!form.value.displayName) {
      form.value.displayName = user.displayName || user.login;
    }
    if (!form.value.avatarUrl && user.avatarUrl) {
      form.value.avatarUrl = user.avatarUrl;
    }
  }
}

function save() {
  emit('save', { ...form.value });
}

const isEdit = computed(() => !!props.member);
</script>

<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    :header="isEdit ? 'Edit Team Member' : 'Add Team Member'"
    :modal="true"
    class="w-full max-w-lg"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label class="tm-label">Display Name *</label>
        <InputText v-model="form.displayName" placeholder="Full name" />
      </div>

      <div class="flex flex-col gap-1">
        <label class="tm-label">Avatar URL</label>
        <InputText v-model="form.avatarUrl" placeholder="https://..." />
      </div>

      <div class="flex flex-col gap-1">
        <label class="tm-label">Jira Identity</label>
        <Select
          v-model="form.jiraAccountId"
          :options="jiraOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select Jira user"
          showClear
          filter
          class="w-full"
          @update:modelValue="onJiraSelect"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="tm-label">GitHub Identity</label>
        <Select
          v-model="form.githubLogin"
          :options="githubOptions"
          optionLabel="label"
          optionValue="value"
          placeholder="Select GitHub user"
          showClear
          filter
          class="w-full"
          @update:modelValue="onGithubSelect"
        />
      </div>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" @click="$emit('update:visible', false)" />
      <Button :label="isEdit ? 'Update' : 'Create'" @click="save" :disabled="!form.displayName" />
    </template>
  </Dialog>
</template>
