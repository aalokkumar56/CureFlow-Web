<script setup lang="ts">
import {
  clinicalSections,
  type ClinicalRecord,
  type RecordValue,
} from '~/utils/patient-clinical'
import { patientList, patientDate, patientLabel } from '~/utils/patients'
import { normalizeApiError } from '~/utils/api/errors'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
const props = defineProps<{
  patientId: string
  kind: string
  visitId?: string
  appointmentId?: string
}>()
const emit = defineEmits<{ changed: [] }>()
const config = computed(() => clinicalSections[props.kind]!)
const { $api } = useNuxtApp()
const auth = useTenantAuth()
const canEdit = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.ClinicalEdit),
)
const items = ref<ClinicalRecord[]>([])
const form = ref<Record<string, RecordValue>>({})
const editing = ref<string | null>(null)
const showing = ref(false)
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = patientList<ClinicalRecord>(
      await $api.get(
        `${config.value.endpoint}/patient/${encodeURIComponent(props.patientId)}`,
      ),
    )
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Records could not be loaded.')
  } finally {
    loading.value = false
  }
}
function open(item?: ClinicalRecord) {
  form.value = Object.fromEntries(
    config.value.fields.map((field) => [
      field.key,
      (item?.[field.key] ??
        (field.type === 'checkbox'
          ? false
          : field.options?.[0] || '')) as RecordValue,
    ]),
  )
  editing.value = item?.id || null
  showing.value = true
  success.value = ''
}
async function save() {
  if (saving.value || !canEdit.value) return
  if (
    props.kind === 'vitals' &&
    !config.value.fields.some(
      (field) =>
        field.type === 'number' &&
        form.value[field.key] !== '' &&
        form.value[field.key] != null,
    )
  ) {
    error.value = 'Enter at least one measurement.'
    return
  }
  if (
    props.kind === 'notes' &&
    !['subjective', 'objective', 'assessment', 'plan'].some((key) =>
      String(form.value[key] || '').trim(),
    )
  ) {
    error.value = 'Enter at least one section of the clinical note.'
    return
  }
  saving.value = true
  error.value = ''
  const payload = Object.fromEntries(
    config.value.fields.map((field) => {
      const value = form.value[field.key]
      return [
        field.key,
        value === '' ? null : field.type === 'number' ? Number(value) : value,
      ]
    }),
  )
  try {
    if (editing.value)
      await $api.patch(`${config.value.endpoint}/${editing.value}`, payload)
    else
      await $api.post(config.value.endpoint, {
        ...payload,
        patient_id: props.patientId,
        visit_id: props.visitId || null,
        appointment_id: props.appointmentId || null,
      })
    showing.value = false
    success.value = 'Record saved.'
    await load()
    emit('changed')
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Record could not be saved.')
  } finally {
    saving.value = false
  }
}
async function remove(item: ClinicalRecord) {
  if (
    !canEdit.value ||
    saving.value ||
    !window.confirm('Remove this allergy from the patient record?')
  )
    return
  saving.value = true
  try {
    await $api.delete(`${config.value.endpoint}/${item.id}`)
    await load()
    emit('changed')
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Record could not be removed.')
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>
<template>
  <section class="patient-clinical-panel">
    <header class="patient-section-header">
      <div>
        <h2>{{ config.title }}</h2>
        <p class="patients-muted">{{ items.length }} recorded entries</p>
      </div>
      <button
        v-if="canEdit && !showing"
        class="patients-primary-btn"
        @click="open()"
      >
        + Add record
      </button>
    </header>
    <p v-if="error" class="appointments-error" role="alert">
      {{ error }}
      <button v-if="!showing" class="patients-secondary-btn" @click="load">
        Retry
      </button>
    </p>
    <p v-if="success" class="patients-success" role="status">{{ success }}</p>
    <form v-if="showing" class="patient-record-form" @submit.prevent="save">
      <PatientsRecordFields
        v-model="form"
        :fields="config.fields"
        :disabled="saving"
      />
      <footer class="patient-form-actions">
        <button
          type="button"
          class="patients-secondary-btn"
          :disabled="saving"
          @click="showing = false"
        >
          Cancel</button
        ><button class="patients-primary-btn" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save record' }}
        </button>
      </footer>
    </form>
    <div v-if="loading" class="dashboard-state" role="status">
      Loading records…
    </div>
    <div v-else-if="!items.length && !error" class="empty-state-box">
      No {{ config.title.toLowerCase() }} recorded.
    </div>
    <div v-else class="patient-record-list">
      <article
        v-for="(item, index) in items"
        :key="item.id || index"
        class="patient-record-card"
      >
        <header>
          <strong>{{ patientDate(item.created_at || item.measured_at) }}</strong
          ><span>{{ item.author_name || item.recorded_by_name }}</span
          ><button
            v-if="canEdit && config.edit"
            class="patients-secondary-btn"
            @click="open(item)"
          >
            Edit</button
          ><button
            v-if="canEdit && config.remove"
            class="patients-secondary-btn"
            :disabled="saving"
            @click="remove(item)"
          >
            Remove
          </button>
        </header>
        <dl class="patient-record-values">
          <template v-for="field in config.fields" :key="field.key"
            ><div
              v-if="
                item[field.key] !== null &&
                item[field.key] !== undefined &&
                item[field.key] !== ''
              "
              :class="{ 'full-width': field.type === 'textarea' }"
            >
              <dt>{{ field.label }}</dt>
              <dd>
                {{
                  field.type === 'checkbox'
                    ? item[field.key]
                      ? 'Yes'
                      : 'No'
                    : field.type === 'date'
                      ? patientDate(item[field.key])
                      : field.options
                        ? patientLabel(item[field.key])
                        : item[field.key]
                }}
              </dd>
            </div></template
          >
        </dl>
      </article>
    </div>
  </section>
</template>
