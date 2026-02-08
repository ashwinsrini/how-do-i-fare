<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.js';
import { useToast } from 'primevue/usetoast';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToast();

// Sign Up state
const signupName = ref('');
const signupEmail = ref('');
const signupPassword = ref('');
const signupLoading = ref(false);

// OTP verification state
const showOtpForm = ref(false);
const otpEmail = ref('');
const otpCode = ref('');
const otpLoading = ref(false);

// Sign In state
const signinEmail = ref('');
const signinPassword = ref('');
const signinLoading = ref(false);

async function handleSignup() {
  if (!signupName.value.trim() || !signupEmail.value.trim() || !signupPassword.value) return;

  signupLoading.value = true;
  try {
    await authStore.signup({
      name: signupName.value.trim(),
      email: signupEmail.value.trim(),
      password: signupPassword.value,
    });
    otpEmail.value = signupEmail.value.trim();
    showOtpForm.value = true;
    toast.add({
      severity: 'success',
      summary: 'Code Sent',
      detail: 'Check your email for the verification code.',
      life: 5000,
    });
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Sign Up Failed',
      detail: err.message,
      life: 5000,
    });
  } finally {
    signupLoading.value = false;
  }
}

async function handleVerifyOtp() {
  if (!otpCode.value.trim()) return;

  otpLoading.value = true;
  try {
    await authStore.verifyOtp({
      email: otpEmail.value,
      code: otpCode.value.trim(),
    });
    toast.add({
      severity: 'success',
      summary: 'Verified',
      detail: 'Email verified successfully!',
      life: 3000,
    });
    router.push('/');
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Verification Failed',
      detail: err.message,
      life: 5000,
    });
  } finally {
    otpLoading.value = false;
  }
}

async function handleSignin() {
  if (!signinEmail.value.trim() || !signinPassword.value) return;

  signinLoading.value = true;
  try {
    await authStore.signin({
      email: signinEmail.value.trim(),
      password: signinPassword.value,
    });
    router.push('/');
  } catch (err) {
    if (err.needsVerification) {
      otpEmail.value = signinEmail.value.trim();
      showOtpForm.value = true;
    }
    toast.add({
      severity: 'error',
      summary: 'Sign In Failed',
      detail: err.message,
      life: 5000,
    });
  } finally {
    signinLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-800">Dev Leaderboard</h1>
        <p class="text-sm text-gray-500 mt-1">Track your team's engineering metrics</p>
      </div>

      <!-- OTP Verification Form -->
      <div v-if="showOtpForm" class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-700 mb-4">Verify Your Email</h2>
        <p class="text-sm text-gray-500 mb-4">
          Enter the 6-digit code sent to <strong>{{ otpEmail }}</strong>
        </p>
        <div class="flex flex-col gap-4">
          <InputText
            v-model="otpCode"
            placeholder="000000"
            class="w-full text-center text-xl tracking-widest"
            maxlength="6"
            @keyup.enter="handleVerifyOtp"
          />
          <Button
            label="Verify"
            icon="pi pi-check"
            :loading="otpLoading"
            :disabled="otpCode.length !== 6"
            @click="handleVerifyOtp"
            class="w-full"
          />
          <Button
            label="Back"
            severity="secondary"
            text
            @click="showOtpForm = false"
            class="w-full"
          />
        </div>
      </div>

      <!-- Login Tabs -->
      <div v-else class="bg-white rounded-lg shadow p-6">
        <TabView>
          <TabPanel header="Sign In">
            <div class="flex flex-col gap-4 pt-2">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-gray-700">Email</label>
                <InputText
                  v-model="signinEmail"
                  type="email"
                  placeholder="you@example.com"
                  class="w-full"
                  @keyup.enter="handleSignin"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-gray-700">Password</label>
                <Password
                  v-model="signinPassword"
                  placeholder="Enter your password"
                  :feedback="false"
                  toggleMask
                  class="w-full"
                  inputClass="w-full"
                  @keyup.enter="handleSignin"
                />
              </div>
              <Button
                label="Sign In"
                icon="pi pi-sign-in"
                :loading="signinLoading"
                :disabled="!signinEmail.trim() || !signinPassword"
                @click="handleSignin"
                class="w-full"
              />
            </div>
          </TabPanel>

          <TabPanel header="Sign Up">
            <div class="flex flex-col gap-4 pt-2">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-gray-700">Name</label>
                <InputText
                  v-model="signupName"
                  placeholder="Your name"
                  class="w-full"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-gray-700">Email</label>
                <InputText
                  v-model="signupEmail"
                  type="email"
                  placeholder="you@example.com"
                  class="w-full"
                />
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-sm font-medium text-gray-700">Password</label>
                <Password
                  v-model="signupPassword"
                  placeholder="At least 6 characters"
                  :feedback="false"
                  toggleMask
                  class="w-full"
                  inputClass="w-full"
                />
              </div>
              <Button
                label="Sign Up"
                icon="pi pi-user-plus"
                :loading="signupLoading"
                :disabled="!signupName.trim() || !signupEmail.trim() || signupPassword.length < 6"
                @click="handleSignup"
                class="w-full"
              />
            </div>
          </TabPanel>
        </TabView>
      </div>

      <p class="text-center text-xs text-gray-400 mt-6">
        <a href="https://kopiko.dev" target="_blank" class="hover:text-gray-500">built on Kopiko</a>
      </p>
    </div>
  </div>
</template>
