<script setup lang="ts">
import {
  PhCaretLeft,
  PhCaretRight,
  PhMagnifyingGlass,
  PhPlus,
} from '@phosphor-icons/vue'
import { useAppointments } from '~/composables/appointments/useAppointments'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'

definePageMeta({
  layout: 'tenant',
  middleware: ['tenant-auth', 'tenant-approval'],
})

useHead({
  title: 'Appointments',
})

type PatientOption = {
  id: string | number
  name?: string
  phone?: string
}

type AppointmentStatusKey = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

type AppointmentColumn = {
  status: AppointmentStatusKey
  label: string
  items: Array<{
    id: string | number
    patient_name?: string
    doctor_name?: string
    department?: string
    scheduled_at?: string
    status: string
    notes?: string
  }>
}

const appointmentStatuses: AppointmentStatusKey[] = [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show',
]

const statusLabels: Record<AppointmentStatusKey, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
}

const auth = useTenantAuth()
const route = useRoute()
const {
  appointments,
  options,
  loading,
  error,
  load,
  loadOptions,
  updateStatus,
  create,
} = useAppointments()

const patients = ref<PatientOption[]>([])
const search = ref('')
const createOpen = ref(false)
const saving = ref(false)
const formError = ref('')
const activeDrag = ref<{ id: string | number, status: string } | null>(null)
const form = reactive({
  patientId: '',
  doctorUserId: '',
  department: '',
  scheduledAt: '',
  notes: '',
})

const isoDate = (date: Date) => date.toISOString().slice(0, 10)

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`)
  value.setDate(value.getDate() + days)
  return isoDate(value)
}

const startOfWeek = () => {
  const date = new Date()
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return isoDate(date)
}

const selectedDate = ref(
  route.query.date === 'today' ? isoDate(new Date()) : startOfWeek(),
)

const range = computed(() => ({
  from: `${selectedDate.value}T00:00:00.000Z`,
  to: `${addDays(selectedDate.value, route.query.date === 'today' ? 1 : 7)}T00:00:00.000Z`,
}))

const weekEnd = computed(() => addDays(selectedDate.value, route.query.date === 'today' ? 0 : 6))

const filteredAppointments = computed(() => {
  const query = search.value.trim().toLowerCase()

  if (!query) {
    return appointments.value
  }

  return appointments.value.filter((item) => {
    const fields = [item.patient_name, item.doctor_name, item.department, item.status]
    return fields.some((field) => String(field || '').toLowerCase().includes(query))
  })
})

const appointmentColumns = computed<AppointmentColumn[]>(() =>
  appointmentStatuses.map((status) => ({
    status,
    label: statusLabels[status],
    items: filteredAppointments.value.filter((item) => (item.status || 'scheduled') === status),
  })),
)

const canCreate = computed(() => hasPermission(auth.user.value, PERMISSIONS.AppointmentCreate))

const refreshAppointments = async () => {
  await load(range.value)
}

const loadPatients = async () => {
  try {
    const { $api } = useNuxtApp()
    const response = await $api.get<unknown>('/patients', { page: 1, page_size: 300 })

    patients.value = Array.isArray(response)
      ? (response as PatientOption[])
      : Array.isArray((response as { items?: unknown[] }).items)
        ? ((response as { items: PatientOption[] }).items)
        : []
  } catch {
    patients.value = []
  }
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))

const formatTime = (value?: string) =>
  value
    ? new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
    : '—'

const resetForm = () => {
  form.patientId = ''
  form.doctorUserId = ''
  form.department = ''
  form.scheduledAt = ''
  form.notes = ''
}

const save = async () => {
  formError.value = ''

  if (!form.patientId || !form.doctorUserId || !form.department || !form.scheduledAt) {
    formError.value = 'Complete all required fields.'
    return
  }

  saving.value = true

  try {
    await create({
      ...form,
      patient_id: form.patientId,
      doctor_user_id: form.doctorUserId,
      scheduled_at: form.scheduledAt,
    })

    createOpen.value = false
    resetForm()
    await refreshAppointments()
  } catch {
    formError.value = 'Appointment could not be scheduled.'
  } finally {
    saving.value = false
  }
}

const setStatus = async (id: string | number, status: string) => {
  try {
    await updateStatus(id, status)
    await refreshAppointments()
  } catch {
    error.value = 'Appointment status could not be updated.'
  }
}

const onDragStart = (event: DragEvent, appointment: { id: string | number, status: string }) => {
  activeDrag.value = { id: appointment.id, status: appointment.status }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(appointment.id))
  }
}

const onDragEnd = () => {
  activeDrag.value = null
}

const onDrop = async (event: DragEvent, targetStatus: string) => {
  event.preventDefault()
  const data = event.dataTransfer?.getData('text/plain')
  const appointmentId = activeDrag.value?.id ?? (data ? Number(data) || data : null)

  if (!appointmentId || !targetStatus) {
    activeDrag.value = null
    return
  }

  if (activeDrag.value?.status !== targetStatus) {
    await setStatus(String(appointmentId), targetStatus)
  }

  activeDrag.value = null
}

watch(
  () => route.query.date,
  (date) => {
    selectedDate.value = date === 'today' ? isoDate(new Date()) : startOfWeek()
  },
  { immediate: true },
)

watch(range, async () => {
  await refreshAppointments()
}, { immediate: true })

onMounted(async () => {
  await Promise.all([loadOptions(), loadPatients()])
})
</script>

<template>
  <section class="appointments-page">
    <header class="appointments-header">
      <div class="appointments-range-controls">
        <div class="appointments-toolbar">
          <button type="button" @click="selectedDate = isoDate(new Date())">Today</button>
          <button type="button" aria-label="Previous period" @click="selectedDate = addDays(selectedDate, route.query.date === 'today' ? -1 : -7)">
            <PhCaretLeft />
          </button>
          <button type="button" aria-label="Next period" @click="selectedDate = addDays(selectedDate, route.query.date === 'today' ? 1 : 7)">
            <PhCaretRight />
          </button>
        </div>
        <div class="appointments-range">
          <span>{{ formatDate(selectedDate) }} — {{ formatDate(weekEnd) }}</span>
        </div>
      </div>

      <div class="appointments-actions">
        <label class="appointments-search">
          <PhMagnifyingGlass :size="17" />
          <input v-model="search" type="search" placeholder="Search appointments" />
        </label>

        <button v-if="canCreate" class="dashboard-retry" type="button" @click="createOpen = true">
          <PhPlus :size="17" />
          New appointment
        </button>
      </div>
    </header>

    <p v-if="error" class="appointments-error">{{ error }}</p>

    <div v-if="loading" class="appointments-state">Loading appointments…</div>
    <div v-else class="appointment-board-wrap">
      <div class="appointment-board">
        <article
          v-for="column in appointmentColumns"
          :key="column.status"
          class="appointment-column"
          :class="`status-${column.status}`"
          @dragover.prevent
          @drop="onDrop($event, column.status)"
        >
          <header class="appointment-column-header">
            <strong>{{ column.label }}</strong>
            <span>{{ column.items.length }}</span>
          </header>

          <div v-if="!column.items.length" class="appointment-column-empty">No appointments</div>

          <button
            v-for="appointment in column.items"
            :key="appointment.id"
            type="button"
            class="appointment-card"
            :class="[
              { 'is-dragging': activeDrag?.id === appointment.id },
              `status-${appointment.status || 'scheduled'}`,
            ]"
            draggable="true"
            @dragstart="onDragStart($event, appointment)"
            @dragend="onDragEnd()"
          >
            <div class="appointment-card-top">
              <strong>{{ appointment.patient_name || 'Patient' }}</strong>
              <small>{{ appointment.department || 'General medicine' }}</small>
            </div>
            <time>{{ formatTime(appointment.scheduled_at) }}</time>
            <div class="appointment-card-meta">
              <span>{{ appointment.doctor_name || 'Doctor not assigned' }}</span>
              <span v-if="appointment.notes">{{ appointment.notes }}</span>
            </div>
          </button>
        </article>
      </div>
    </div>

    <section v-if="createOpen" class="appointments-modal">
      <div class="appointments-modal-panel">
        <header>
          <h3>New appointment</h3>
          <button type="button" @click="createOpen = false">Close</button>
        </header>

        <form @submit.prevent="save">
          <label>
            Patient
            <select v-model="form.patientId">
              <option value="">Select patient</option>
              <option v-for="patient in patients" :key="patient.id" :value="patient.id">
                {{ patient.name || 'Unnamed patient' }}
              </option>
            </select>
          </label>

          <label>
            Doctor
            <select v-model="form.doctorUserId">
              <option value="">Select doctor</option>
              <option v-for="doctor in options.doctors" :key="doctor.user_id" :value="doctor.user_id">
                {{ doctor.name }}
              </option>
            </select>
          </label>

          <label>
            Department
            <input v-model="form.department" type="text" placeholder="Department" />
          </label>

          <label>
            Date & time
            <input v-model="form.scheduledAt" type="datetime-local" />
          </label>

          <label>
            Notes
            <textarea v-model="form.notes" rows="3" placeholder="Notes" />
          </label>

          <p v-if="formError" class="appointments-form-error">{{ formError }}</p>

          <div class="appointments-modal-actions">
            <button type="button" class="secondary" @click="createOpen = false">Cancel</button>
            <button type="submit" :disabled="saving">
              {{ saving ? 'Saving…' : 'Save appointment' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  </section>
</template>
