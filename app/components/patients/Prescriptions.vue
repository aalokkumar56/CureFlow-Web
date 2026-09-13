<script setup lang="ts">
import type {
  Field,
  RecordValue,
  ClinicalRecord,
} from '~/utils/patient-clinical'
import { patientDate, patientList } from '~/utils/patients'
import { normalizeApiError } from '~/utils/api/errors'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
const props = defineProps<{
  patientId: string
  patientName?: string
  visitId?: string
  appointmentId?: string
}>()
const emit = defineEmits<{ changed: [] }>()
const { $api } = useNuxtApp()
const auth = useTenantAuth()
const canEdit = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.ClinicalEdit),
)
const records = ref<ClinicalRecord[]>([])
const loading = ref(true)
const saving = ref(false)
const showing = ref(false)
const error = ref('')
const form = ref<Record<string, RecordValue>>({})
const medicines = ref<Record<string, RecordValue>[]>([])
const injections = ref<Record<string, RecordValue>[]>([])
const injectionFields: Field[] = [
  { key: 'name', label: 'Injection name', required: true },
  { key: 'generic_name', label: 'Generic name' },
  { key: 'strength', label: 'Strength' },
  { key: 'site', label: 'Injection site' },
  {
    key: 'route',
    label: 'Route',
    options: ['iv', 'im', 'subcutaneous', 'other'],
    required: true,
  },
  {
    key: 'administered_at',
    label: 'Administered at (local time)',
    type: 'datetime-local',
    required: true,
  },
  { key: 'administered_by', label: 'Administered by', required: true },
  { key: 'batch_number', label: 'Batch number' },
  { key: 'expiry_date', label: 'Expiry date', type: 'date' },
  {
    key: 'reason_for_injection',
    label: 'Reason for injection',
    required: true,
  },
  { key: 'adverse_reaction', label: 'Adverse reaction' },
  { key: 'notes', label: 'Notes', type: 'textarea' },
]
const fields: Field[] = [
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'chief_complaint', label: 'Chief complaint' },
  { key: 'clinical_notes', label: 'Clinical notes', type: 'textarea' },
  { key: 'follow_up_advice', label: 'Follow-up advice', type: 'textarea' },
  { key: 'next_visit_date', label: 'Next visit date', type: 'date' },
]
const medicineFields: Field[] = [
  { key: 'drug_name', label: 'Drug name', required: true },
  { key: 'generic_name', label: 'Generic name' },
  { key: 'strength', label: 'Strength' },
  { key: 'form', label: 'Form' },
  {
    key: 'route',
    label: 'Route',
    options: [
      'oral',
      'topical',
      'iv',
      'im',
      'subcutaneous',
      'inhalation',
      'other',
    ],
  },
  ...[
    ['dosage', 'Dosage'],
    ['frequency', 'Frequency'],
    ['duration', 'Duration'],
    ['timing', 'Timing'],
  ].map(([key, label]) => ({ key: key!, label: label! })),
  { key: 'quantity', label: 'Quantity', type: 'number', min: 1 },
  {
    key: 'reason_for_prescribing',
    label: 'Reason for prescribing',
    required: true,
  },
  { key: 'possible_side_effects', label: 'Possible side effects' },
  {
    key: 'patient_instructions',
    label: 'Patient instructions',
    type: 'textarea',
  },
  { key: 'is_continuation', label: 'Continuation', type: 'checkbox' },
  { key: 'is_acute', label: 'Acute', type: 'checkbox' },
]
const addMedicine = () =>
  medicines.value.push({
    route: 'oral',
    is_continuation: false,
    is_acute: false,
  })
async function load() {
  loading.value = true
  error.value = ''
  try {
    records.value = patientList<ClinicalRecord>(
      await $api.get(`/prescriptions/patient/${props.patientId}`),
    )
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Prescriptions could not be loaded.')
  } finally {
    loading.value = false
  }
}
async function save() {
  if (!canEdit.value || saving.value) return
  if (!medicines.value.length) {
    error.value = 'Add at least one medicine.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    await $api.post('/prescriptions', {
      ...form.value,
      next_visit_date: form.value.next_visit_date || null,
      patient_id: props.patientId,
      visit_id: props.visitId || null,
      appointment_id: props.appointmentId || null,
      items: medicines.value.map((item) => ({
        ...item,
        quantity: item.quantity ? Number(item.quantity) : null,
      })),
      injections: injections.value.map((item) => ({
        ...item,
        administered_at: new Date(String(item.administered_at)).toISOString(),
        expiry_date: item.expiry_date || null,
      })),
    })
    showing.value = false
    form.value = {}
    medicines.value = []
    injections.value = []
    await load()
    emit('changed')
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Prescription could not be saved.')
  } finally {
    saving.value = false
  }
}
function printRecord(record: ClinicalRecord) {
  // Render Vue-escaped record content through the browser's print stylesheet.
  printId.value = record.id || ''
  nextTick(() => window.print())
}
const printId = ref('')
function openPrescription() {
  showing.value = true
  if (!medicines.value.length) addMedicine()
}
function cancelPrescription() {
  showing.value = false
  medicines.value = []
  injections.value = []
}
onMounted(load)
</script>
<template>
  <section class="patient-clinical-panel">
    <header class="patient-section-header">
      <div>
        <h2>Prescriptions</h2>
        <p class="patients-muted">
          Medication plans and follow-up instructions.
        </p>
      </div>
      <button
        v-if="canEdit && !showing"
        class="patients-primary-btn"
        @click="openPrescription"
      >
        + New prescription
      </button>
    </header>
    <p v-if="error" class="appointments-error" role="alert">
      {{ error }}
      <button v-if="!showing" class="patients-secondary-btn" @click="load">
        Retry
      </button>
    </p>
    <form v-if="showing" class="patient-record-form" @submit.prevent="save">
      <PatientsRecordFields
        v-model="form"
        :fields="fields"
        :disabled="saving"
      />
      <article
        v-for="(_, index) in medicines"
        :key="index"
        class="patient-record-card"
      >
        <header>
          <h3>Medicine {{ index + 1 }}</h3>
          <button
            type="button"
            class="patients-secondary-btn"
            :disabled="saving"
            @click="medicines.splice(index, 1)"
          >
            Remove
          </button>
        </header>
        <PatientsRecordFields
          v-model="medicines[index]!"
          :fields="medicineFields"
          :disabled="saving"
        />
      </article>
      <button
        type="button"
        class="patients-secondary-btn"
        :disabled="saving"
        @click="addMedicine"
      >
        + Add medicine
      </button>
      <article
        v-for="(_, index) in injections"
        :key="`injection-${index}`"
        class="patient-record-card"
      >
        <header>
          <h3>Injection {{ index + 1 }}</h3>
          <button
            type="button"
            class="patients-secondary-btn"
            :disabled="saving"
            @click="injections.splice(index, 1)"
          >
            Remove
          </button>
        </header>
        <PatientsRecordFields
          v-model="injections[index]!"
          :fields="injectionFields"
          :disabled="saving"
        />
      </article>
      <button
        type="button"
        class="patients-secondary-btn"
        :disabled="saving"
        @click="injections.push({ route: 'im' })"
      >
        + Add injection
      </button>
      <footer class="patient-form-actions">
        <button
          type="button"
          class="patients-secondary-btn"
          :disabled="saving"
          @click="cancelPrescription"
        >
          Cancel</button
        ><button class="patients-primary-btn" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save prescription' }}
        </button>
      </footer>
    </form>
    <div v-if="loading" class="dashboard-state">Loading prescriptions…</div>
    <div v-else-if="!records.length && !error" class="empty-state-box">
      No prescriptions recorded.
    </div>
    <article
      v-for="record in records"
      :key="record.id"
      class="patient-record-card"
      :class="{ 'patient-print-target': printId === record.id }"
    >
      <header>
        <div>
          <h3>{{ record.diagnosis || 'Prescription' }}</h3>
          <p>{{ patientName }} · Patient ID: {{ patientId }}</p>
          <p>
            {{ patientDate(record.prescribed_at) }} · {{ record.doctor_name }}
          </p>
        </div>
        <button class="patients-secondary-btn" @click="printRecord(record)">
          Print
        </button>
      </header>
      <dl class="patient-record-values">
        <div
          v-for="field in fields.filter((field) => record[field.key])"
          :key="field.key"
        >
          <dt>{{ field.label }}</dt>
          <dd>
            {{
              field.type === 'date'
                ? patientDate(record[field.key])
                : record[field.key]
            }}
          </dd>
        </div>
      </dl>
      <div
        v-for="(item, i) in (record.items as ClinicalRecord[]) || []"
        :key="i"
        class="patient-prescription-item"
      >
        <h4>{{ item.drug_name }} {{ item.strength }}</h4>
        <dl class="patient-record-values">
          <div
            v-for="field in medicineFields.filter(
              (field) => item[field.key] != null && item[field.key] !== '',
            )"
            :key="field.key"
          >
            <dt>{{ field.label }}</dt>
            <dd>
              {{
                typeof item[field.key] === 'boolean'
                  ? item[field.key]
                    ? 'Yes'
                    : 'No'
                  : item[field.key]
              }}
            </dd>
          </div>
        </dl>
      </div>
      <div
        v-for="(item, i) in (record.injections as ClinicalRecord[]) || []"
        :key="`injection-${i}`"
        class="patient-prescription-item"
      >
        <h4>Injection: {{ item.name }}</h4>
        <dl class="patient-record-values">
          <div
            v-for="field in injectionFields.filter((field) => item[field.key])"
            :key="field.key"
          >
            <dt>{{ field.label }}</dt>
            <dd>{{ item[field.key] }}</dd>
          </div>
        </dl>
      </div>
    </article>
  </section>
</template>
