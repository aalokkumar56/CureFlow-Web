<script setup lang="ts">

import { normalizeApiError } from '~/utils/api/errors'


definePageMeta({
  layout: 'auth',
})

const auth = useTenantAuth()

const form = reactive({
  email: '',
  password: '',
})

const loading = ref(false)
const errorMessage = ref('')

const submit = async () => {
  errorMessage.value = ''
  loading.value = true

  try {
    const response = await auth.login({
      email: form.email,
      password: form.password,
    })

    const tenant = response?.tenant ?? auth.tenant.value

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

    if (lifecycleStatus === 'pendingapproval') {
      await navigateTo('/pending-approval')
      return
    }

    if (
      lifecycleStatus === 'active' &&
      !onboardingComplete
    ) {
      await navigateTo('/onboarding')
      return
    }

    await navigateTo('/')
  } catch (error) {
    errorMessage.value = normalizeApiError(
      error,
      'Unable to sign in. Please check your credentials.',
    )
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main>
    <section>
      <div>
        <h1>Sign in to CureFlow</h1>

        <p>
          Sign in to manage your hospital operations.
        </p>
      </div>

      <form
        data-testid="login-form"
        @submit.prevent="submit"
      >
        <div>
          <label for="login-email">
            Email
          </label>

          <input
            id="login-email"
            v-model.trim="form.email"
            data-testid="login-email"
            type="email"
            name="email"
            autocomplete="email"
            required
          />
        </div>

        <div>
          <label for="login-password">
            Password
          </label>

          <input
            id="login-password"
            v-model="form.password"
            data-testid="login-password"
            type="password"
            name="password"
            autocomplete="current-password"
            required
          />
        </div>

        <p
          v-if="errorMessage"
          role="alert"
          data-testid="login-error"
        >
          {{ errorMessage }}
        </p>

        <button
          data-testid="login-submit"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>

      <p>
        Don't have an account?

        <NuxtLink
          to="/signup"
          data-testid="login-signup-link"
        >
          Register your hospital
        </NuxtLink>
      </p>
    </section>
  </main>
</template>