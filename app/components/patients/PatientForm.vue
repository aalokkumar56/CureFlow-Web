<script setup lang="ts">
import type { PatientRecord } from '~/composables/patients/usePatients'
import { patientStatuses, patientSources, patientList } from '~/utils/patients'
import { normalizeApiError } from '~/utils/api/errors'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
const props = defineProps<{
  patient?: PatientRecord
  saving?: boolean
  readonly?: boolean
}>()
const emit = defineEmits<{
  save: [payload: Record<string, unknown>]
  cancel: []
}>()
const { $api } = useNuxtApp()
const departments = ref<string[]>([])
const auth = useTenantAuth()
const doctors = ref<{ id: string; name: string }[]>([])
const lookupError = ref('')
const form = reactive<Record<string, string | number | boolean>>({})
const sections = [
  {
    title: 'Basic information',
    fields: [
      ['name', 'Full name', 'text'],
      ['phone', 'Phone', 'tel'],
      ['email', 'Email', 'email'],
      ['age', 'Age', 'number'],
      ['gender', 'Gender', 'gender'],
      ['blood_group', 'Blood group', 'blood'],
      ['department', 'Department', 'department'],
      ['occupation', 'Occupation', 'text'],
    ],
  },
  {
    title: 'Care & follow-up',
    fields: [
      ['status', 'Patient status', 'status'],
      ['inquiry_source', 'Inquiry source', 'source'],
      ['follow_up_date', 'Follow-up date', 'date'],
      ['tags', 'Tags (comma separated)', 'text'],
      ['notes', 'Care notes', 'textarea'],
    ],
  },
  {
    title: 'Personal details',
    fields: [
      ['date_of_birth', 'Date of birth', 'date'],
      ['marital_status', 'Marital status', 'text'],
      ['gov_id_type', 'Government ID type', 'text'],
      ['gov_id_number', 'Government ID number', 'text'],
    ],
  },
  {
    title: 'Address',
    fields: [
      ['address_line1', 'Address line 1', 'text'],
      ['address_line2', 'Address line 2', 'text'],
      ['city', 'City', 'text'],
      ['state', 'State', 'text'],
      ['pincode', 'Postal code', 'text'],
    ],
  },
  {
    title: 'Emergency contact',
    fields: [
      ['emergency_contact_name', 'Contact name', 'text'],
      ['emergency_contact_phone', 'Contact phone', 'tel'],
      ['emergency_contact_relation', 'Relationship', 'text'],
    ],
  },
]
const createFields = new Set([
  'name',
  'phone',
  'email',
  'age',
  'gender',
  'blood_group',
  'department',
  'occupation',
  'inquiry_source',
  'tags',
  'notes',
  'address_line1',
  'city',
  'state',
  'pincode',
  'referring_doctor_id',
])
watch(
  () => props.patient,
  (patient) => {
    for (const section of sections)
      for (const [key] of section.fields) {
        if (!key) continue
        const value = patient?.[key]
        form[key] =
          key === 'tags'
            ? (patient?.tags || []).join(', ')
            : key.includes('date') || key === 'date_of_birth'
              ? String(value || '').slice(0, 10)
              : String(value ?? '')
      }
    form.inquiry_source ||= 'manual'
    form.status ||= 'new_inquiry'
    form.referring_doctor_id = ''
    form.email_notifications_enabled = Boolean(
      patient?.email_notifications_enabled,
    )
  },
  { immediate: true },
)
const options = (type?: string): Record<string, string> => {
  if (type === 'status') return patientStatuses
  if (type === 'source') return patientSources
  if (type === 'gender')
    return {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      unknown: 'Unknown',
    }
  if (type === 'blood')
    return {
      a_pos: 'A+',
      a_neg: 'A-',
      b_pos: 'B+',
      b_neg: 'B-',
      ab_pos: 'AB+',
      ab_neg: 'AB-',
      o_pos: 'O+',
      o_neg: 'O-',
      unknown: 'Unknown',
    }
  return Object.fromEntries(
    [
      ...new Set(
        [...departments.value, String(form.department || '')].filter(Boolean),
      ),
    ].map((name) => [name, name]),
  )
}
const visible = (key?: string) =>
  Boolean(
    key && (props.patient ? key !== 'inquiry_source' : createFields.has(key)),
  )
const submit = () => {
  if (props.saving || props.readonly) return
  const payload: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(form)) {
    if (!props.patient && !createFields.has(key)) continue
    if (
      props.patient &&
      ['inquiry_source', 'referring_doctor_id'].includes(key)
    )
      continue
    payload[key] =
      key === 'tags'
        ? String(value)
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean)
        : key === 'age'
          ? value === ''
            ? null
            : Number(value)
          : typeof value === 'string'
            ? value.trim() || null
            : value
  }
  emit('save', payload)
}
onMounted(async () => {
  if (
    !props.patient &&
    hasPermission(auth.user.value, PERMISSIONS.ReferralView)
  ) {
    try {
      doctors.value = patientList(await $api.get('/doctors'))
    } catch (cause) {
      lookupError.value = normalizeApiError(
        cause,
        'Referring doctors could not be loaded.',
      )
    }
  }
  try {
    departments.value = patientList<string | { name: string }>(
      await $api.get('/hospital-profile/departments'),
    ).map((item) => (typeof item === 'string' ? item : item.name))
  } catch (cause) {
    lookupError.value = normalizeApiError(
      cause,
      'Departments could not be loaded.',
    )
  }
})
</script>
<template>
  <form class="patient-editor" @submit.prevent="submit">
    <p v-if="lookupError" class="patients-notice" role="status">
      {{ lookupError }}
    </p>
    <fieldset
      v-for="section in sections.filter((s) =>
        s.fields.some((f) => visible(f[0])),
      )"
      :key="section.title"
      :disabled="saving || readonly"
      class="patient-form-section"
    >
      <legend>{{ section.title }}</legend>
      <div class="patient-form-grid">
        <label
          v-if="
            !patient && section.title === 'Care & follow-up' && doctors.length
          "
        >
          <span>Referring doctor</span>
          <select v-model="form.referring_doctor_id">
            <option value="">Not referred</option>
            <option
              v-for="doctor in doctors"
              :key="doctor.id"
              :value="doctor.id"
            >
              {{ doctor.name }}
            </option>
          </select>
        </label>
        <template v-for="[key, label, type] in section.fields" :key="key">
          <label
            v-if="key && visible(key)"
            :class="{ 'full-width': type === 'textarea' }"
          >
            <span
              >{{ label
              }}{{ ['name', 'phone'].includes(key) ? ' *' : '' }}</span
            >
            <textarea
              v-if="type === 'textarea'"
              v-model="form[key] as string"
              rows="3"
              maxlength="10000"
            />
            <select
              v-else-if="
                ['gender', 'blood', 'department', 'status', 'source'].includes(
                  type || '',
                )
              "
              v-model="form[key]"
            >
              <option value="">Not specified</option>
              <option
                v-for="(text, value) in options(type)"
                :key="value"
                :value="value"
              >
                {{ text }}
              </option>
            </select>
            <input
              v-else
              v-model="form[key]"
              :type="type"
              :required="['name', 'phone'].includes(key)"
              :min="type === 'number' ? 0 : undefined"
              :max="
                type === 'number'
                  ? 150
                  : key === 'date_of_birth'
                    ? new Date().toISOString().slice(0, 10)
                    : undefined
              "
              :maxlength="key.includes('phone') ? 20 : 200"
            />
          </label>
        </template>
        <label
          v-if="patient && section.title === 'Care & follow-up'"
          class="patient-checkbox"
          ><input v-model="form.email_notifications_enabled" type="checkbox" />
          Email notifications enabled</label
        >
      </div>
    </fieldset>
    <footer v-if="!readonly" class="patient-form-actions">
      <button
        type="button"
        class="patients-secondary-btn"
        :disabled="saving"
        @click="emit('cancel')"
      >
        Cancel</button
      ><button class="patients-primary-btn" :disabled="saving">
        {{ saving ? 'Saving…' : patient ? 'Save changes' : 'Create patient' }}
      </button>
    </footer>
  </form>
</template>
