<script setup lang="ts">
import type {
  Appointment,
  BookingOptions,
} from '~/composables/appointments/useAppointments'
import { patientDate, patientLabel } from '~/utils/patients'
import { normalizeApiError } from '~/utils/api/errors'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
const props = defineProps<{ patientId: string; appointments: Appointment[] }>()
const emit = defineEmits<{ changed: []; consult: [appointment: Appointment] }>()
const auth = useTenantAuth()
const { $api } = useNuxtApp()
const canCreate = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.AppointmentCreate),
)
const canEdit = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.AppointmentEdit),
)
const canConsult = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.ClinicalEdit),
)
const options = ref<BookingOptions>({ doctors: [] })
const showing = ref(false)
const editingId = ref<Appointment['id']>()
const saving = ref(false)
const error = ref('')
const form = reactive({
  doctor_user_id: '',
  department: '',
  scheduled_at: '',
  chief_complaint: '',
  duration_minutes: 30,
  notes: '',
})
const resetForm = () => {
  editingId.value = undefined
  form.doctor_user_id = ''
  form.department = ''
  form.scheduled_at = ''
  form.chief_complaint = ''
  form.duration_minutes = 30
  form.notes = ''
}
async function open() {
  resetForm()
  showing.value = true
  try {
    options.value = await $api.get<BookingOptions>(
      '/appointments/booking-options',
    )
  } catch (cause) {
    error.value = normalizeApiError(
      cause,
      'Booking options could not be loaded.',
    )
  }
}
async function openEdit(appointment: Appointment) {
  editingId.value = appointment.id
  showing.value = true
  form.doctor_user_id = appointment.doctor_user_id ? String(appointment.doctor_user_id) : ''
  form.department = appointment.department || ''
  form.scheduled_at = appointment.scheduled_at
    ? new Date(appointment.scheduled_at).toISOString().slice(0, 16)
    : ''
  form.chief_complaint = appointment.chief_complaint || ''
  form.duration_minutes = appointment.duration_minutes || 30
  form.notes = appointment.notes || ''
  try {
    options.value = await $api.get<BookingOptions>('/appointments/booking-options')
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Booking options could not be loaded.')
  }
}
async function save() {
  if ((!editingId.value && !canCreate.value) || (editingId.value && !canEdit.value) || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const payload = {
      ...form,
      doctor_user_id: form.doctor_user_id || null,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_minutes: Number(form.duration_minutes) || 30,
    }
    if (editingId.value) {
      await $api.patch(`/appointments/${editingId.value}`, payload)
    } else {
      await $api.post('/appointments', { ...payload, patient_id: props.patientId })
    }
    showing.value = false
    resetForm()
    emit('changed')
  } catch (cause) {
    error.value = normalizeApiError(cause, editingId.value ? 'Appointment could not be updated.' : 'Appointment could not be booked.')
  } finally {
    saving.value = false
  }
}
async function status(appointment: Appointment, value: string) {
  if (!canEdit.value || saving.value) return
  saving.value = true
  error.value = ''
  try {
    await $api.patch(`/appointments/${appointment.id}/status`, {
      status: value,
    })
    emit('changed')
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Appointment could not be updated.')
  } finally {
    saving.value = false
  }
}
</script>
<template>
  <section class="patient-clinical-panel">
    <header class="patient-section-header">
      <h2>Appointments</h2>
      <button v-if="canCreate" class="patients-primary-btn" @click="open">
        + Book appointment
      </button>
    </header>
    <p v-if="error" class="appointments-error" role="alert">{{ error }}</p>
    <form v-if="showing" class="patient-record-form" @submit.prevent="save">
      <fieldset class="patient-form-grid patient-fields" :disabled="saving">
        <label
          ><span>Doctor</span
          ><select
            v-model="form.doctor_user_id"
            @change="
              form.department =
                options.doctors.find(
                  (d) => String(d.user_id) === form.doctor_user_id,
                )?.department || form.department
            "
          >
            <option value="">Not assigned</option>
            <option
              v-for="doctor in options.doctors"
              :key="doctor.user_id"
              :value="String(doctor.user_id)"
            >
              {{ doctor.name }}
            </option>
          </select></label
        ><label
          ><span>Department *</span
          ><input v-model="form.department" required /></label
        ><label
          ><span>Date & time (your local time) *</span
          ><input
            v-model="form.scheduled_at"
            type="datetime-local"
            required /></label
        ><label><span>Chief complaint</span><input v-model="form.chief_complaint" /></label
        ><label><span>Duration (minutes)</span><input v-model.number="form.duration_minutes" type="number" min="1" /></label
        ><label><span>Notes</span><textarea v-model="form.notes" /></label>
      </fieldset>
      <footer class="patient-form-actions">
        <button
          type="button"
          class="patients-secondary-btn"
          :disabled="saving"
          @click="showing = false"
        >
          Cancel</button
        ><button class="patients-primary-btn" :disabled="saving">
          {{ saving ? 'Saving…' : editingId ? 'Save changes' : 'Book appointment' }}
        </button>
      </footer>
    </form>
    <div v-if="!appointments.length" class="empty-state-box">
      No appointments recorded.
    </div>
    <article
      v-for="appointment in appointments"
      :key="appointment.id"
      class="patient-record-card"
    >
      <header>
        <div>
          <h3>
            {{ patientDate(appointment.scheduled_at) }}
            <span v-if="appointment.scheduled_at">{{
              new Date(appointment.scheduled_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            }}</span>
          </h3>
          <p>
            {{ appointment.doctor_name || 'Doctor not assigned' }} ·
            {{ appointment.department || 'No department' }}
          </p>
          <p v-if="appointment.chief_complaint || appointment.duration_minutes">
            {{ appointment.chief_complaint || 'Consultation' }} · {{ appointment.duration_minutes || 30 }} min
          </p>
        </div>
        <span class="patient-status">{{
          patientLabel(appointment.status)
        }}</span
        ><button
          v-if="canEdit"
          class="patients-secondary-btn"
          :disabled="saving"
          @click="openEdit(appointment)"
        >
          Edit
        </button><select
          v-if="canEdit"
          :value="appointment.status"
          aria-label="Appointment status"
          :disabled="saving"
          @change="
            status(appointment, ($event.target as HTMLSelectElement).value)
          "
        >
          <option
            v-for="value in [
              'scheduled',
              'confirmed',
              'completed',
              'cancelled',
              'no_show',
            ]"
            :key="value"
            :value="value"
          >
            {{ patientLabel(value) }}
          </option></select
        ><button
          v-if="
            canConsult &&
            ['scheduled', 'confirmed'].includes(appointment.status)
          "
          class="patients-primary-btn"
          @click="emit('consult', appointment)"
        >
          Start consultation
        </button>
      </header>
      <p v-if="appointment.notes">{{ appointment.notes }}</p>
    </article>
  </section>
</template>
