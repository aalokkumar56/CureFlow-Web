<script setup lang="ts">
import { PhEnvelopeSimple, PhLock } from '@phosphor-icons/vue'
import { normalizeApiError } from '~/utils/api/errors'

definePageMeta({ layout: 'auth' })

const auth = useTenantAuth()
const form = reactive({ email: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')

const submit = async () => {
  errorMessage.value = ''
  loading.value = true
  try {
    const response = await auth.login(form)
    const tenant = response.tenant ?? auth.tenant.value
    const status = String(tenant?.lifecycle_status ?? tenant?.lifecycleStatus ?? '').toLowerCase().replace(/_/g, '')
    await navigateTo(status === 'pendingapproval' ? '/pending-approval' : status === 'active' && !(tenant?.onboarding_complete ?? tenant?.onboardingComplete) ? '/onboarding' : '/')
  } catch (error) {
    errorMessage.value = normalizeApiError(error, 'Unable to sign in. Please check your credentials.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="auth-card">
    <AuthBrand subtitle="Sign in to manage your hospital operations." />
    <div class="auth-heading"><h1>Welcome back</h1><p>Sign in to continue to your workspace.</p></div>
    <form class="auth-form" data-testid="login-form" @submit.prevent="submit">
      <label for="login-email">Email address</label>
      <div class="auth-input"><PhEnvelopeSimple :size="18" /><input id="login-email" v-model.trim="form.email" data-testid="login-email" type="email" name="email" autocomplete="email" placeholder="Enter your email" required></div>
      <label for="login-password">Password</label>
      <div class="auth-input"><PhLock :size="18" /><input id="login-password" v-model="form.password" data-testid="login-password" type="password" name="password" autocomplete="current-password" placeholder="Enter your password" required></div>
      <p v-if="errorMessage" class="auth-error" role="alert" data-testid="login-error">{{ errorMessage }}</p>
      <button class="auth-submit" data-testid="login-submit" type="submit" :disabled="loading">{{ loading ? 'Signing in…' : 'Sign in' }}</button>
    </form>
    <p class="auth-switch">New hospital? <NuxtLink to="/signup" data-testid="login-signup-link">Register your hospital</NuxtLink></p>
  </section>
</template>
