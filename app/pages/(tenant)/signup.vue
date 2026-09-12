<script setup lang="ts">
import { normalizeApiError } from '~/utils/api/errors'

definePageMeta({
  layout: 'auth',
})

const router = useRouter()

const { register, loading } = useTenantRegistration()

const form = reactive({
  hospitalName: '',
  adminName: '',
  email: '',
  password: '',
  phone: '',
})

const errorMessage = ref('')

const submit = async () => {
  errorMessage.value = ''

  try {
    const session = await register(form)

    const tenant = session.tenant

    const lifecycleStatus = String(
      tenant?.lifecycle_status ??
      tenant?.lifecycleStatus ??
      '',
    )
      .toLowerCase()
      .replace(/_/g, '')

    const onboardingComplete =
      tenant?.onboarding_complete ??
      tenant?.onboardingComplete ??
      false

    let destination = '/'

    if (lifecycleStatus === 'pendingapproval') {
      destination = '/pending-approval'
    } else if (
      lifecycleStatus === 'active' &&
      !onboardingComplete
    ) {
      destination = '/onboarding'
    }

    await router.push(destination)
  } catch (error) {
    errorMessage.value = normalizeApiError(
      error,
      'Registration failed',
    )
  }
}
</script>

<template>
  <main>
    <section>
      <div>
        <h1>Register your hospital</h1>

        <p>
          Register your hospital on CureFlow — 14-day trial, no credit card
        </p>
      </div>

      <form
        data-testid="signup-form"
        @submit.prevent="submit"
      >
        <div>
          <label for="hospital-name">
            Hospital name
          </label>

          <input
            id="hospital-name"
            v-model.trim="form.hospitalName"
            data-testid="signup-hospital-name"
            type="text"
            name="hospitalName"
            autocomplete="organization"
            placeholder="City Hospital"
            required
          />
        </div>

        <div>
          <label for="admin-name">
            Admin name
          </label>

          <input
            id="admin-name"
            v-model.trim="form.adminName"
            data-testid="signup-admin-name"
            type="text"
            name="adminName"
            autocomplete="name"
            placeholder="Dr. Admin"
            required
          />
        </div>

        <div>
          <label for="signup-email">
            Admin email
          </label>

          <input
            id="signup-email"
            v-model.trim="form.email"
            data-testid="signup-email"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="admin@hospital.com"
            required
          />
        </div>

        <div>
          <label for="signup-password">
            Password
          </label>

          <input
            id="signup-password"
            v-model="form.password"
            data-testid="signup-password"
            type="password"
            name="password"
            autocomplete="new-password"
            minlength="8"
            placeholder="Min 8 characters"
            required
          />
        </div>

        <div>
          <label for="signup-phone">
            Phone (optional)
          </label>

          <input
            id="signup-phone"
            v-model.trim="form.phone"
            data-testid="signup-phone"
            type="tel"
            name="phone"
            autocomplete="tel"
            placeholder="919876543210"
          />
        </div>

        <p
          v-if="errorMessage"
          role="alert"
          data-testid="signup-error"
        >
          {{ errorMessage }}
        </p>

        <button
          data-testid="signup-submit"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? 'Creating hospital...' : 'Create hospital account' }}
        </button>
      </form>

      <p>
        Already have an account?

        <NuxtLink
          to="/login"
          data-testid="signup-login-link"
        >
          Sign in
        </NuxtLink>
      </p>
    </section>
  </main>
</template>