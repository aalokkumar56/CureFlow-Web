<script setup lang="ts">
import { tenantLifecycleRoute } from '~/utils/tenant-lifecycle'
import { normalizeApiError } from '~/utils/api/errors'
definePageMeta({ middleware: ['tenant-auth', 'tenant-approval'] })
useHead({ title: 'Awaiting approval | CureFlow' })
const auth = useTenantAuth()
const checking = ref(false)
const message = ref('')
async function check() {
  if (checking.value) return
  checking.value = true
  message.value = ''
  try {
    const session = await auth.refreshSession()
    const destination = tenantLifecycleRoute(session.tenant)
    if (destination !== '/pending-approval') await navigateTo(destination)
    else message.value = 'Your registration is still awaiting review.'
  } catch (cause) {
    message.value = normalizeApiError(
      cause,
      'Approval status could not be checked. Please try again.',
    )
  } finally {
    checking.value = false
  }
}
</script>
<template>
  <main class="lifecycle-page">
    <section class="patient-record-card">
      <h1>Awaiting CureFlow approval</h1>
      <p>
        {{ auth.tenant.value?.name || 'Your hospital' }} is registered and
        pending review. Access opens after approval.
      </p>
      <p v-if="message" role="status">{{ message }}</p>
      <div class="patients-header-actions">
        <button
          class="patients-primary-btn"
          :disabled="checking"
          @click="check"
        >
          {{ checking ? 'Checking…' : 'Check approval status' }}</button
        ><button class="patients-secondary-btn" @click="auth.logout()">
          Sign out
        </button>
      </div>
    </section>
  </main>
</template>
