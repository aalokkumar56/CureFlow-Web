<script setup lang="ts">
import { normalizeApiError } from '~/utils/api/errors'
definePageMeta({ middleware: ['tenant-auth', 'tenant-approval'] })
useHead({ title: 'Set up your hospital | CureFlow' })
const auth = useTenantAuth()
const { $api } = useNuxtApp()
const state = ref<Record<string, boolean>>({})
const loading = ref(true)
const busy = ref('')
const error = ref('')
const steps = [
  {
    key: 'profile',
    field: 'profile_complete',
    alias: 'profileComplete',
    label: 'Hospital profile',
    description: 'Add your hospital name, address, and contact details.',
    to: '/settings?section=hospital',
  },
  {
    key: 'whatsapp',
    field: 'whatsapp_connected',
    alias: 'whatsAppConnected',
    label: 'WhatsApp setup',
    description: 'Connect Meta Cloud API for patient communication.',
    to: '/settings?section=integrations',
  },
  {
    key: 'team',
    field: 'team_invited',
    alias: 'teamInvited',
    label: 'Invite team',
    description: 'Add doctors and staff who will use CureFlow.',
    to: '/settings/users',
  },
]
async function load() {
  loading.value = true
  error.value = ''
  try {
    state.value = await $api.get('/onboarding')
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Setup could not be loaded.')
  } finally {
    loading.value = false
  }
}
async function complete(key: string) {
  if (busy.value) return
  busy.value = key
  error.value = ''
  try {
    state.value = await $api.post(`/onboarding/${key}`)
    if (key === 'complete') {
      await auth.refreshSession()
      await navigateTo('/')
    }
  } catch (cause) {
    error.value = normalizeApiError(
      cause,
      'Setup could not be saved. Please retry.',
    )
  } finally {
    busy.value = ''
  }
}
onMounted(load)
</script>
<template>
  <main class="lifecycle-page">
    <h1>Set up {{ auth.tenant.value?.name || 'your hospital' }}</h1>
    <p>
      Configure each item, then mark it done. You can finish WhatsApp and team
      setup later.
    </p>
    <p v-if="error" class="appointments-error" role="alert">
      {{ error }} <button @click="load">Retry</button>
    </p>
    <p v-if="loading" role="status">Loading setup…</p>
    <section v-for="step in steps" :key="step.key" class="patient-record-card">
      <h2>{{ step.label }}</h2>
      <p>{{ step.description }}</p>
      <div class="patients-header-actions">
        <NuxtLink :to="step.to" class="patients-secondary-btn"
          >Open settings</NuxtLink
        ><button
          class="patients-primary-btn"
          :disabled="
            loading || !!busy || state[step.field] || state[step.alias]
          "
          @click="complete(step.key)"
        >
          {{
            state[step.field] || state[step.alias]
              ? 'Completed'
              : busy === step.key
                ? 'Saving…'
                : 'Mark done'
          }}
        </button>
      </div>
    </section>
    <div class="patients-header-actions">
      <button
        class="patients-primary-btn"
        :disabled="loading || !!busy"
        @click="complete('complete')"
      >
        {{
          busy === 'complete' ? 'Finishing…' : 'Continue to dashboard'
        }}</button
      ><button class="patients-secondary-btn" @click="auth.logout()">
        Sign out
      </button>
    </div>
  </main>
</template>
