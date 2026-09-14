<script setup lang="ts">
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
import {
  hospitalTimezone,
  hospitalDay,
  hospitalTime,
} from '~/utils/tenant-time'
import { normalizeApiError } from '~/utils/api/errors'
import type { Appointment } from '~/composables/appointments/useAppointments'
type Overview = {
  stats?: Record<string, number>
  doctors?: Array<{ user_id: string; name: string }>
  appointments_today?: Array<
    Appointment & { is_mine?: boolean; patient_phone?: string }
  >
}
const auth = useTenantAuth()
const { $api } = useNuxtApp()
const timezone = computed(() => hospitalTimezone(auth.tenant.value))
const date = ref('')
const scope = ref('mine')
const doctor = ref('')
const overview = ref<Overview>({})
const loading = ref(false)
const busy = ref('')
const error = ref('')
const canView = computed(() =>
  [
    PERMISSIONS.DashboardView,
    PERMISSIONS.AppointmentView,
    PERMISSIONS.ClinicalView,
  ].every((permission) => hasPermission(auth.user.value, permission)),
)
const canEdit = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.AppointmentEdit),
)
const canConsult = computed(
  () =>
    hasPermission(auth.user.value, PERMISSIONS.PatientView) &&
    hasPermission(auth.user.value, PERMISSIONS.ClinicalEdit),
)
let request = 0
async function load() {
  if (!canView.value || !date.value) return
  const current = ++request
  loading.value = true
  error.value = ''
  try {
    const result = await $api.get<Overview>('/dashboard/clinical-overview', {
      date: date.value,
      scope: scope.value,
      doctor_user_id:
        scope.value === 'all' ? doctor.value || undefined : undefined,
    })
    if (current === request) overview.value = result
  } catch (cause) {
    if (current === request)
      error.value = normalizeApiError(
        cause,
        'The clinical schedule could not be loaded.',
      )
  } finally {
    if (current === request) loading.value = false
  }
}
async function checkIn(id: string | number) {
  if (busy.value || !canEdit.value) return
  busy.value = String(id)
  error.value = ''
  try {
    await $api.patch(`/appointments/${id}/status`, { status: 'confirmed' })
    await load()
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Check-in failed.')
  } finally {
    busy.value = ''
  }
}
watch([date, scope, doctor], load)
onMounted(() => {
  date.value = hospitalDay(new Date().toISOString(), timezone.value)
})
onScopeDispose(() => {
  request++
})
</script>
<template>
  <section class="dashboard">
    <h1>Clinical schedule</h1>
    <p v-if="!canView" role="alert">
      You do not have permission to view the clinical dashboard.
    </p>
    <template v-else
      ><div class="patients-toolbar">
        <label>Date<input v-model="date" type="date" /></label
        ><label
          >Schedule<select v-model="scope">
            <option value="mine">My appointments</option>
            <option value="all">All doctors</option>
          </select></label
        ><label v-if="scope === 'all'"
          >Doctor<select v-model="doctor">
            <option value="">All doctors</option>
            <option
              v-for="item in overview.doctors"
              :key="item.user_id"
              :value="item.user_id"
            >
              {{ item.name }}
            </option>
          </select></label
        ><button
          class="patients-secondary-btn"
          :disabled="loading"
          @click="load"
        >
          Refresh
        </button>
      </div>
      <p v-if="error" role="alert" class="appointments-error">{{ error }}</p>
      <p v-if="loading" role="status">Loading schedule…</p>
      <template v-else-if="!error"
        ><div class="dashboard-cards">
          <article
            v-for="(label, key) in {
              appointments_today: 'Appointments',
              completed_today: 'Completed',
              waiting_check_in: 'Waiting check-in',
            }"
            :key="key"
            class="dashboard-card"
          >
            <p>{{ label }}</p>
            <strong>{{ overview.stats?.[key] ?? 0 }}</strong>
          </article>
        </div>
        <section class="dashboard-panel">
          <h2>Appointment queue</h2>
          <p
            v-if="!overview.appointments_today?.length"
            class="empty-state-box"
          >
            No appointments for this day.
          </p>
          <article
            v-for="item in overview.appointments_today"
            :key="item.id"
            class="patient-appointment-summary-row"
          >
            <strong>{{ hospitalTime(item.scheduled_at, timezone) }}</strong>
            <div>
              <strong>{{ item.patient_name }}</strong>
              <p>{{ item.doctor_name }} · {{ item.department }}</p>
              <small
                >{{
                  item.status === 'confirmed' ? 'Checked in' : item.status
                }}
                · {{ item.patient_phone }}</small
              >
            </div>
            <div class="patients-header-actions">
              <button
                v-if="canEdit && item.is_mine && item.status === 'scheduled'"
                class="patients-secondary-btn"
                :disabled="!!busy"
                @click="checkIn(item.id)"
              >
                {{ busy === String(item.id) ? 'Saving…' : 'Check in' }}</button
              ><NuxtLink
                v-if="
                  canConsult &&
                  (item.is_mine || canEdit) &&
                  ['scheduled', 'confirmed'].includes(item.status)
                "
                :to="`/patients/${item.patient_id}?appointment=${item.id}`"
                class="patients-primary-btn"
                >Start consultation</NuxtLink
              ><NuxtLink
                v-else-if="
                  hasPermission(auth.user.value, PERMISSIONS.PatientView)
                "
                :to="`/patients/${item.patient_id}`"
                class="patients-secondary-btn"
                >Open chart</NuxtLink
              >
            </div>
          </article>
        </section></template
      ></template
    >
  </section>
</template>
