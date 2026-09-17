<script setup lang="ts">
import { lifestyleFields, type RecordValue } from '~/utils/patient-clinical'
import { normalizeApiError } from '~/utils/api/errors'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
const props = defineProps<{ patientId: string }>()
const { $api } = useNuxtApp()
const auth = useTenantAuth()
const canEdit = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.ClinicalEdit),
)
const form = ref<Record<string, RecordValue>>({})
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await $api.get<Record<string, RecordValue>>(
      `/patients/${props.patientId}/lifestyle`,
    )
    form.value = Object.fromEntries(
      lifestyleFields.map((field) => [
        field.key,
        data?.[field.key] ??
          (field.type === 'checkbox' ? false : field.options ? 'unknown' : ''),
      ]),
    )
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Lifestyle could not be loaded.')
  } finally {
    loading.value = false
  }
}
async function save() {
  if (!canEdit.value || saving.value) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const payload = Object.fromEntries(
      lifestyleFields.map((field) => [
        field.key,
        form.value[field.key] === ''
          ? null
          : field.type === 'number'
            ? Number(form.value[field.key])
            : form.value[field.key],
      ]),
    )
    await $api.put(`/patients/${props.patientId}/lifestyle`, payload)
    success.value = 'Lifestyle profile saved.'
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Lifestyle could not be saved.')
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>
<template>
  <section class="patient-clinical-panel">
    <h2>Lifestyle profile</h2>
    <p class="patients-muted">
      Daily habits and context that support a more complete care plan.
    </p>
    <p v-if="error" class="appointments-error" role="alert">
      {{ error }}
      <button class="patients-secondary-btn" @click="load">Retry</button>
    </p>
    <p v-if="success" class="patients-success" role="status">{{ success }}</p>
    <div v-if="loading" class="dashboard-state">Loading lifestyle…</div>
    <form v-else @submit.prevent="save">
      <PatientsRecordFields
        v-model="form"
        :fields="lifestyleFields"
        :disabled="saving || !canEdit"
      />
      <footer v-if="canEdit" class="patient-form-actions">
        <button class="patients-primary-btn" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save lifestyle' }}
        </button>
      </footer>
    </form>
  </section>
</template>
