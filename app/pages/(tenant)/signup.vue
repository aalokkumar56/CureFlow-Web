<script setup lang="ts">
import { PhBuildings, PhEnvelopeSimple, PhLock, PhPhone, PhUser } from '@phosphor-icons/vue'
import { normalizeApiError } from '~/utils/api/errors'

definePageMeta({ layout: 'auth' })

const router = useRouter()
const { register, loading } = useTenantRegistration()
const form = reactive({ hospitalName: '', adminName: '', email: '', password: '', phone: '' })
const errorMessage = ref('')

const submit = async () => {
  errorMessage.value = ''
  try {
    const session = await register(form)
    const tenant = session.tenant
    const status = String(tenant?.lifecycle_status ?? tenant?.lifecycleStatus ?? '').toLowerCase().replace(/_/g, '')
    await router.push(status === 'pendingapproval' ? '/pending-approval' : status === 'active' && !(tenant?.onboarding_complete ?? tenant?.onboardingComplete) ? '/onboarding' : '/')
  } catch (error) {
    errorMessage.value = normalizeApiError(error, 'Registration failed')
  }
}
</script>

<template>
  <section class="auth-card auth-card-wide">
    <AuthBrand subtitle="Register your hospital on CureFlow — 14-day trial, no credit card." />
    <div class="auth-heading"><h1>Register your hospital</h1><p>Set up a secure workspace for your team.</p></div>
    <form class="auth-form" data-testid="signup-form" @submit.prevent="submit">
      <label for="hospital-name">Hospital name</label>
      <div class="auth-input"><PhBuildings :size="18" /><input id="hospital-name" v-model.trim="form.hospitalName" data-testid="signup-hospital-name" type="text" name="hospitalName" autocomplete="organization" placeholder="City Hospital" required></div>
      <label for="admin-name">Admin name</label>
      <div class="auth-input"><PhUser :size="18" /><input id="admin-name" v-model.trim="form.adminName" data-testid="signup-admin-name" type="text" name="adminName" autocomplete="name" placeholder="Dr. Admin" required></div>
      <label for="signup-email">Admin email</label>
      <div class="auth-input"><PhEnvelopeSimple :size="18" /><input id="signup-email" v-model.trim="form.email" data-testid="signup-email" type="email" name="email" autocomplete="email" placeholder="admin@hospital.com" required></div>
      <label for="signup-password">Password</label>
      <div class="auth-input"><PhLock :size="18" /><input id="signup-password" v-model="form.password" data-testid="signup-password" type="password" name="password" autocomplete="new-password" minlength="8" placeholder="At least 8 characters" required></div>
      <label for="signup-phone">Phone <span>(optional)</span></label>
      <div class="auth-input"><PhPhone :size="18" /><input id="signup-phone" v-model.trim="form.phone" data-testid="signup-phone" type="tel" name="phone" autocomplete="tel" placeholder="919876543210"></div>
      <p v-if="errorMessage" class="auth-error" role="alert" data-testid="signup-error">{{ errorMessage }}</p>
      <button class="auth-submit" data-testid="signup-submit" type="submit" :disabled="loading">{{ loading ? 'Creating hospital…' : 'Create hospital account' }}</button>
    </form>
    <p class="auth-switch">Already have an account? <NuxtLink to="/login" data-testid="signup-login-link">Sign in</NuxtLink></p>
  </section>
</template>
