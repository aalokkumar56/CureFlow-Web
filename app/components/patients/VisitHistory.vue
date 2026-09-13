<script setup lang="ts">
import type { ClinicalRecord } from '~/utils/patient-clinical'
import { patientList, patientDate, patientLabel } from '~/utils/patients'
import { normalizeApiError } from '~/utils/api/errors'
const props = defineProps<{
  patientId: string
  kind: 'timeline' | 'visit-chart'
}>()
const { $api } = useNuxtApp()
const items = ref<ClinicalRecord[]>([])
const loading = ref(true)
const error = ref('')
const recordValue = (record: ClinicalRecord, ...keys: string[]) =>
  keys.map((key) => record[key]).find((value) => value != null && value !== '')
const recordList = (record: ClinicalRecord, ...keys: string[]) => {
  const value = recordValue(record, ...keys)
  return Array.isArray(value) ? value as ClinicalRecord[] : []
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    try {
      items.value = patientList<ClinicalRecord>(
        await $api.get(`/patients/${props.patientId}/${props.kind}`),
      )
    } catch (cause: any) {
      // Older API deployments do not expose visit-chart yet. Timeline records
      // are the compatible representation, so use them for the chart tab.
      if (props.kind !== 'visit-chart' || cause?.response?.status !== 404) throw cause
      items.value = patientList<ClinicalRecord>(
        await $api.get(`/patients/${props.patientId}/timeline`),
      )
    }
  } catch (cause) {
    error.value = normalizeApiError(cause, 'History could not be loaded.')
  } finally {
    loading.value = false
  }
}
const displayFields = (record: ClinicalRecord) =>
  Object.entries(record).filter(
    ([key, value]) =>
      !/(^id$|_id$|_url$|json$)/.test(key) &&
      value != null &&
      value !== '' &&
      typeof value !== 'object',
  )
onMounted(load)
</script>
<template>
  <section class="patient-clinical-panel">
    <header class="patient-section-header">
      <h2>{{ kind === 'timeline' ? 'Patient timeline' : 'Visit chart' }}</h2>
      <button class="patients-secondary-btn" @click="load">Refresh</button>
    </header>
    <p v-if="error" class="appointments-error" role="alert">{{ error }}</p>
    <div v-if="loading" class="dashboard-state">Loading history…</div>
    <div v-else-if="!items.length && !error" class="empty-state-box">
      No visit activity recorded.
    </div>
    <div v-else class="patient-timeline">
      <article
        v-for="(item, index) in items"
        :key="index"
        class="patient-record-card"
      >
        <header>
          <div>
            <p class="patients-kicker">
              {{ patientDate(recordValue(item, 'occurred_at', 'visit_date', 'visitDate')) }}
            </p>
            <h3>{{ recordValue(item, 'title', 'chief_complaint', 'chiefComplaint') || 'Patient visit' }}</h3>
          </div>
          <span>{{ patientLabel(String(recordValue(item, 'status', 'type', 'visitType') || '')) }}</span>
        </header>
        <p v-if="recordValue(item, 'summary', 'symptoms', 'doctor_notes', 'doctorNotes')">
          {{ recordValue(item, 'summary', 'symptoms', 'doctor_notes', 'doctorNotes') }}
        </p>
        <dl v-if="kind === 'visit-chart'" class="patient-record-values">
          <div
            v-for="key in [
              'doctor_name',
              'department',
              'diagnosis',
              'doctor_notes',
            ]"
            :key="key"
          >
            <dt>{{ patientLabel(key) }}</dt>
            <dd>{{ recordValue(item, key, key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())) || '—' }}</dd>
          </div>
        </dl>
        <template v-if="kind === 'visit-chart'"
          ><details
            v-for="key in ['vitals', 'notes', 'prescriptions', 'paperNotes']"
            :key="key"
          >
            <summary>
              {{ patientLabel(key) }} ({{
                recordList(item, key, key.replace(/([A-Z])/g, '_$1').toLowerCase()).length
              }})
            </summary>
            <article
              v-for="(record, i) in recordList(item, key, key.replace(/([A-Z])/g, '_$1').toLowerCase())"
              :key="i"
              class="patient-record-card"
            >
              <dl class="patient-record-values">
                <div
                  v-for="[field, value] in displayFields(record)"
                  :key="field"
                >
                  <dt>{{ patientLabel(field) }}</dt>
                  <dd>{{ value }}</dd>
                </div>
              </dl>
              <div
                v-for="(medicine, j) in recordList(record, 'items')"
                :key="j"
              >
                <dl class="patient-record-values">
                  <div
                    v-for="[field, value] in displayFields(medicine)"
                    :key="field"
                  >
                    <dt>{{ patientLabel(field) }}</dt>
                    <dd>{{ value }}</dd>
                  </div>
                </dl>
              </div>
            </article>
          </details></template
        >
      </article>
    </div>
  </section>
</template>
