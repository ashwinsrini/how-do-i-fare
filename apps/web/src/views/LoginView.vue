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
  <div class="min-h-screen flex">
    <!-- Left: Brand panel -->
    <div class="hidden lg:flex lg:w-[45%] bg-surface-900 relative overflow-hidden flex-col justify-between p-12">
      <!-- Decorative elements -->
      <div class="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div class="absolute bottom-0 left-0 w-72 h-72 bg-emerald-500/5 rounded-full translate-y-1/3 -translate-x-1/3"></div>

      <div class="relative z-10">
        <div class="flex items-center gap-3 mb-16">
          <div class="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <span class="text-xl font-bold text-white tracking-tight">TeamMetrics</span>
        </div>

        <h1 class="text-4xl font-bold text-white leading-tight mb-4">
          Engineering insights<br/>your team can act on.
        </h1>
        <p class="text-surface-400 text-lg leading-relaxed max-w-md">
          Unified Jira and GitHub metrics. Track velocity, review cycles, and team performance — all in one place.
        </p>
      </div>

      <div class="relative z-10 flex items-center gap-6 text-surface-500 text-sm">
        <div class="flex items-center gap-2">
          <i class="pi pi-chart-bar"></i>
          <span>Jira Sync</span>
        </div>
        <div class="flex items-center gap-2">
          <i class="pi pi-github"></i>
          <span>GitHub Sync</span>
        </div>
        <div class="flex items-center gap-2">
          <i class="pi pi-users"></i>
          <span>Team Profiles</span>
        </div>
      </div>
    </div>

    <!-- Right: Auth form -->
    <div class="flex-1 flex items-center justify-center px-6 py-12 bg-surface-50">
      <div class="w-full max-w-[400px]">
        <!-- Mobile logo -->
        <div class="flex items-center gap-2.5 mb-10 lg:hidden">
          <div class="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <span class="text-lg font-bold text-surface-800 tracking-tight">TeamMetrics</span>
        </div>

        <div class="mb-8">
          <h2 class="text-2xl font-bold text-surface-900 tracking-tight">Welcome back</h2>
          <p class="text-surface-500 mt-1">Sign in to your account to continue</p>
        </div>

        <!-- OTP Verification Form -->
        <div v-if="showOtpForm" class="tm-card p-6">
          <h3 class="tm-section-title mb-2">Verify Your Email</h3>
          <p class="text-sm text-surface-500 mb-5">
            Enter the 6-digit code sent to <strong class="text-surface-700">{{ otpEmail }}</strong>
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
        <div v-else>
          <TabView>
            <TabPanel header="Sign In">
              <div class="flex flex-col gap-4 pt-2">
                <div class="flex flex-col gap-1.5">
                  <label class="tm-label">Email</label>
                  <InputText
                    v-model="signinEmail"
                    type="email"
                    placeholder="you@example.com"
                    class="w-full"
                    @keyup.enter="handleSignin"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="tm-label">Password</label>
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
                  class="w-full mt-1"
                />
              </div>
            </TabPanel>

            <TabPanel header="Sign Up">
              <div class="flex flex-col gap-4 pt-2">
                <div class="flex flex-col gap-1.5">
                  <label class="tm-label">Name</label>
                  <InputText
                    v-model="signupName"
                    placeholder="Your name"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="tm-label">Email</label>
                  <InputText
                    v-model="signupEmail"
                    type="email"
                    placeholder="you@example.com"
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="tm-label">Password</label>
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
                  label="Create Account"
                  icon="pi pi-user-plus"
                  :loading="signupLoading"
                  :disabled="!signupName.trim() || !signupEmail.trim() || signupPassword.length < 6"
                  @click="handleSignup"
                  class="w-full mt-1"
                />
              </div>
            </TabPanel>
          </TabView>
        </div>
      </div>
    </div>
  </div>
</template>
