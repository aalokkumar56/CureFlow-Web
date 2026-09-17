<script setup lang="ts">
import { usePatients } from '~/composables/patients/usePatients'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
import { normalizeApiError } from '~/utils/api/errors'
definePageMeta({
  layout: 'tenant',
  middleware: ['tenant-auth', 'tenant-approval'],
})
useHead({ title: 'New patient | CureFlow' })
const auth = useTenantAuth()
const canCreate = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.PatientCreate),
)
const { create } = usePatients()
const { $api } = useNuxtApp()
const createdId = ref<string>()
const saving = ref(false)
const error = ref('')
async function save(payload: Record<string, unknown>) {
  if (!canCreate.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    if (!createdId.value) createdId.value = (await create(payload)).id
    if (
      payload.referring_doctor_id &&
      hasPermission(auth.user.value, PERMISSIONS.ReferralManage)
    ) {
      try {
        await $api.post('/referrals', {
          doctor_id: payload.referring_doctor_id,
          patient_id: createdId.value,
          revenue: 0,
          notes: 'Recorded during patient registration',
        })
      } catch (cause) {
        error.value = `Patient created, but referral logging failed. ${normalizeApiError(cause)}`
        return
      }
    }
    await navigateTo(`/patients/${createdId.value}`)
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Patient could not be created.')
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <section class="patients-page">
    <p v-if="!canCreate" class="appointments-error" role="alert">
      You do not have permission to create patients.
    </p>
    <template v-else
      ><p v-if="error" class="appointments-error" role="alert">{{ error }}</p>
      <NuxtLink
        v-if="createdId"
        :to="`/patients/${createdId}`"
        class="patients-secondary-btn"
        >Open created patient</NuxtLink
      >
      <PatientsPatientForm
        :saving="saving"
        :readonly="!!createdId"
        @save="save"
        @cancel="navigateTo('/patients')"
    /></template>
  </section>
</template>
