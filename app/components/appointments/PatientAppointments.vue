<script setup lang="ts">
import type {
  Appointment,
} from '~/composables/appointments/useAppointments'
import AppointmentFormModal from '~/components/appointments/AppointmentFormModal.vue'
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
const showing = ref(false)
const editingId = ref<Appointment['id']>()
const saving = ref(false)
const error = ref('')
const activeAppointment = computed(() =>
  props.appointments.find((appointment) => appointment.id === editingId.value) || null,
)
const resetForm = () => {
  editingId.value = undefined
}
async function open() {
  resetForm()
  showing.value = true
}
async function openEdit(appointment: Appointment) {
  editingId.value = appointment.id
  showing.value = true
}
async function save(payload: Record<string, unknown>) {
  if ((!editingId.value && !canCreate.value) || (editingId.value && !canEdit.value) || saving.value) return
  saving.value = true
  error.value = ''
  try {
    const appointmentPayload = {
      ...payload,
      patient_id: props.patientId,
      scheduled_at: new Date(String(payload.scheduled_at)).toISOString(),
      doctor_user_id: payload.doctor_user_id || null,
      duration_minutes: Number(payload.duration_minutes) || 30,
    }
    if (editingId.value) {
      await $api.patch(`/appointments/${editingId.value}`, appointmentPayload)
    } else {
      await $api.post('/appointments', appointmentPayload)
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
    <AppointmentFormModal
      :open="showing"
      :patient-id="patientId"
      :appointment="activeAppointment"
      :saving="saving"
      :error="error"
      @close="showing = false"
      @save="save"
    />
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
