<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import type { Appointment } from '~/composables/appointments/useAppointments'
import { useAppointments } from '~/composables/appointments/useAppointments'

type PatientOption = {
  id: string | number
  name?: string
  phone?: string
}

const props = defineProps<{
  open: boolean
  patientId?: string | number
  defaultPatientId?: string | number
  patients?: PatientOption[]
  appointment?: Appointment | null
  saving?: boolean
  error?: string
}>()

const emit = defineEmits<{
  close: []
  save: [payload: Record<string, unknown>]
  addPatient: []
}>()

const { options, loadOptions } = useAppointments()
const patientSearch = ref('')
const patientPickerOpen = ref(false)
const form = reactive({
  patientId: '',
  doctorUserId: '',
  department: '',
  scheduledAt: '',
  chiefComplaint: '',
  durationMinutes: 30,
  notes: '',
})

const mode = computed(() => props.appointment ? 'edit' : 'create')
const needsPatient = computed(() => !props.patientId)
const sortedPatients = computed(() =>
  [...(props.patients || [])].sort((a, b) =>
    String(a.name || '').localeCompare(String(b.name || ''), undefined, {
      sensitivity: 'base',
    }),
  ),
)
const filteredPatients = computed(() => {
  const query = patientSearch.value.trim().toLowerCase()
  if (!query) return sortedPatients.value
  return sortedPatients.value.filter((patient) =>
    [patient.name, patient.phone].some((value) =>
      String(value || '').toLowerCase().includes(query),
    ),
  )
})
const selectedPatient = computed(() =>
  sortedPatients.value.find((patient) => String(patient.id) === form.patientId),
)
const title = computed(() =>
  mode.value === 'edit' ? 'Edit appointment' : 'New appointment',
)
const submitLabel = computed(() =>
  props.saving
    ? 'Saving...'
    : mode.value === 'edit'
      ? 'Save changes'
      : 'Save appointment',
)

const reset = () => {
  form.patientId = props.patientId
    ? String(props.patientId)
    : props.defaultPatientId
      ? String(props.defaultPatientId)
      : ''
  form.doctorUserId = props.appointment?.doctor_user_id
    ? String(props.appointment.doctor_user_id)
    : ''
  form.department = props.appointment?.department || ''
  form.scheduledAt = props.appointment?.scheduled_at
    ? new Date(props.appointment.scheduled_at).toISOString().slice(0, 16)
    : ''
  form.chiefComplaint = props.appointment?.chief_complaint || ''
  form.durationMinutes = props.appointment?.duration_minutes || 30
  form.notes = props.appointment?.notes || ''
  patientSearch.value = ''
  patientPickerOpen.value = false
}

const close = () => {
  emit('close')
}

const selectDoctor = () => {
  form.department =
    options.value.doctors.find(
      (doctor) => String(doctor.user_id) === form.doctorUserId,
    )?.department || form.department
}

const save = () => {
  emit('save', {
    patient_id: props.patientId || form.patientId,
    doctor_user_id: form.doctorUserId,
    department: form.department,
    scheduled_at: form.scheduledAt,
    chief_complaint: form.chiefComplaint,
    duration_minutes: Number(form.durationMinutes) || 30,
    notes: form.notes,
  })
}

watch(
  () => [props.open, props.appointment, props.patientId, props.defaultPatientId],
  async () => {
    if (!props.open) return
    reset()
    await loadOptions()
  },
  { immediate: true },
)
</script>

<template>
  <section v-if="open" class="appointments-modal" role="dialog" aria-modal="true" aria-labelledby="appointment-form-title">
    <div class="appointments-modal-panel appointment-form-modal">
      <header>
        <h3 id="appointment-form-title">{{ title }}</h3>
        <button type="button" class="appointments-modal-close" aria-label="Close" @click="close">
          <PhX :size="18" />
        </button>
      </header>

      <form @submit.prevent="save">
        <label v-if="needsPatient">
          Patient
          <div class="appointment-patient-picker">
            <button type="button" class="appointment-picker-trigger" @click="patientPickerOpen = !patientPickerOpen">
              {{ selectedPatient?.name || 'Select patient' }}
            </button>
            <div v-if="patientPickerOpen" class="appointment-picker-menu">
              <input v-model="patientSearch" type="search" placeholder="Search name or phone..." />
              <button v-for="patient in filteredPatients" :key="patient.id" type="button" @click="form.patientId = String(patient.id); patientPickerOpen = false">
                <strong>{{ patient.name || 'Unnamed patient' }}</strong>
                <small>{{ patient.phone || 'No phone recorded' }}</small>
              </button>
              <p v-if="!filteredPatients.length">No matching patients.</p>
            </div>
          </div>
          <button type="button" class="appointment-add-patient" @click="emit('addPatient')">+ Add patient</button>
        </label>

        <div class="appointment-form-grid">
          <label>
            Doctor
            <select v-model="form.doctorUserId" required @change="selectDoctor">
              <option value="">Select doctor</option>
              <option v-for="doctor in options.doctors" :key="doctor.user_id" :value="String(doctor.user_id)">
                {{ doctor.name }}
              </option>
            </select>
          </label>

          <label>
            Department
            <select v-model="form.department" required>
              <option value="">Select department</option>
              <option v-for="department in options.departments" :key="department" :value="department">
                {{ department }}
              </option>
            </select>
          </label>

          <label>
            Date & time
            <input v-model="form.scheduledAt" type="datetime-local" required />
          </label>

          <label>
            Duration (minutes)
            <input v-model.number="form.durationMinutes" type="number" min="1" required />
          </label>
        </div>

        <label>
          Chief complaint
          <input v-model="form.chiefComplaint" />
        </label>

        <label>
          Notes
          <textarea v-model="form.notes" rows="3" placeholder="Notes" />
        </label>

        <p v-if="error" class="appointments-form-error">{{ error }}</p>

        <div class="appointments-modal-actions">
          <button type="button" class="secondary" @click="close">Cancel</button>
          <button type="submit" :disabled="saving">
            {{ submitLabel }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>
