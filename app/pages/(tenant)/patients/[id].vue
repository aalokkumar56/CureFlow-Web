<script setup lang="ts">
import {
  usePatients,
  type PatientRecord,
} from '~/composables/patients/usePatients'
import {
  hospitalTimezone,
  hospitalDay,
  hospitalTime,
} from '~/utils/tenant-time'
import { collectAppointments } from '~/utils/patient-appointments'
import type { Appointment } from '~/composables/appointments/useAppointments'
import type { ClinicalRecord } from '~/utils/patient-clinical'
import {
  patientDate,
  patientInitials,
  patientLabel,
  patientList,
} from '~/utils/patients'
import {
  hasPermission,
  PERMISSIONS,
  type Permission,
} from '~/utils/permissions'
import { normalizeApiError } from '~/utils/api/errors'
definePageMeta({
  layout: 'tenant',
  middleware: ['tenant-auth', 'tenant-approval'],
  key: (route) => String(route.params.id),
})
useHead({ title: 'Patient profile | CureFlow' })
const route = useRoute()
const router = useRouter()
const auth = useTenantAuth()
const timezone = computed(() => hospitalTimezone(auth.tenant.value))
const { $api } = useNuxtApp()
const { getById, update } = usePatients()
const id = String(route.params.id)
const patient = ref<PatientRecord | null>(null)
const appointments = ref<Appointment[]>([])
const allergies = ref<ClinicalRecord[]>([])
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const error = ref('')
const success = ref('')
const visitId = ref<string>()
const appointmentId = ref<string>()
const consultationRequestHandled = ref(false)
const can = (permission: Permission) =>
  hasPermission(auth.user.value, permission)
const canClinical = computed(() => can(PERMISSIONS.ClinicalView))
const canView = computed(() => can(PERMISSIONS.PatientView))
const tabs = computed(() => [
  { key: 'today', label: 'Overview' },
  ...(can(PERMISSIONS.AppointmentView)
    ? [{ key: 'appointments', label: 'Appointments' }]
    : []),
  ...(canClinical.value
    ? [
        { key: 'visit-chart', label: 'Visit chart' },
        { key: 'allergies', label: 'Allergies' },
        { key: 'prescriptions', label: 'Prescriptions' },
        { key: 'vitals', label: 'Vitals' },
        { key: 'notes', label: 'Clinical notes' },
        { key: 'history', label: 'History' },
        { key: 'lifestyle', label: 'Lifestyle' },
        { key: 'documents', label: 'Documents' },
        { key: 'timeline', label: 'Timeline' },
      ]
    : []),
  { key: 'details', label: 'Patient details' },
  ...(can(PERMISSIONS.ConversationView)
    ? [{ key: 'messages', label: 'WhatsApp' }]
    : []),
])
const activeTab = computed(() =>
  route.query.edit === '1'
    ? 'details'
    : tabs.value.some((tab) => tab.key === route.query.tab)
      ? String(route.query.tab)
      : 'today',
)
const tab = (key: string) =>
  router.replace({
    query: {
      ...route.query,
      edit: undefined,
      tab: key === 'today' ? undefined : key,
    },
  })
const severeAllergies = computed(() =>
  allergies.value.filter((item) =>
    ['severe', 'life_threatening'].includes(String(item.severity)),
  ),
)
const todayAppointments = computed(() => {
  const today = hospitalDay(new Date().toISOString(), timezone.value)
  return appointments.value.filter(
    (item) =>
      item.scheduled_at &&
      hospitalDay(item.scheduled_at, timezone.value) === today,
  )
})
const upcomingAppointments = computed(() => {
  const now = Date.now()
  const end = now + 7 * 24 * 60 * 60 * 1000
  return appointments.value
    .filter((item) => {
      const time = item.scheduled_at ? new Date(item.scheduled_at).getTime() : 0
      return (
        time > now &&
        time <= end &&
        !['cancelled', 'completed'].includes(item.status)
      )
    })
    .sort(
      (a, b) =>
        new Date(a.scheduled_at || 0).getTime() -
        new Date(b.scheduled_at || 0).getTime(),
    )
    .slice(0, 5)
})
async function loadAppointments() {
  const rows = await collectAppointments((page) =>
    $api.get('/appointments', { page, page_size: 100 }),
  )
  return rows.filter((item) => String(item.patient_id) === id)
}
async function load(initial = false) {
  if (!canView.value) {
    loading.value = false
    return
  }
  if (initial) loading.value = true
  loadError.value = ''
  error.value = ''
  try {
    patient.value = await getById(id)
    if (!patient.value?.id) throw new Error('Patient not found.')
    const results = await Promise.allSettled([
      canClinical.value
        ? (import.meta.client ? $api.get(`/allergies/patient/${id}`) : Promise.resolve([]))
        : Promise.resolve([]),
      can(PERMISSIONS.AppointmentView)
        ? (import.meta.client ? loadAppointments() : Promise.resolve([]))
        : Promise.resolve([]),
    ])
    const allergyResult = results[0]!
    const appointmentResult = results[1]!
    if (allergyResult.status === 'fulfilled')
      allergies.value = patientList<ClinicalRecord>(allergyResult.value)
    if (appointmentResult.status === 'fulfilled')
      appointments.value = patientList<Appointment>(
        appointmentResult.value,
      ).filter((item) => String(item.patient_id) === id)
    if (
      route.query.visit &&
      !consultationRequestHandled.value &&
      can(PERMISSIONS.ClinicalEdit)
    ) {
      consultationRequestHandled.value = true
      try {
        const visit = await $api.get<{
          id: string
          patient_id: string
          appointment_id?: string
          status: string
        }>(`/visits/${encodeURIComponent(String(route.query.visit))}`)
        if (String(visit.patient_id) !== id)
          throw new Error('This consultation belongs to another patient.')
        if (visit.status === 'in_progress') {
          visitId.value = visit.id
          appointmentId.value = visit.appointment_id
        } else {
          await router.replace({
            query: { ...route.query, visit: undefined, appointment: undefined },
          })
        }
      } catch (cause) {
        error.value = normalizeApiError(
          cause,
          'Consultation could not be resumed.',
        )
      }
    }
    if (
      import.meta.client &&
      !consultationRequestHandled.value &&
      route.query.appointment &&
      canClinical.value
    ) {
      const requested = appointments.value.find(
        (item) => String(item.id) === String(route.query.appointment),
      )
      if (requested) {
        consultationRequestHandled.value = true
        await startConsultation(requested)
      }
    }
    if (results.some((result) => result.status === 'rejected'))
      error.value =
        'Some care information could not be loaded. Refresh to try again.'
  } catch (cause) {
    loadError.value = normalizeApiError(
      cause,
      'Patient details could not be loaded.',
    )
  } finally {
    loading.value = false
  }
}
async function save(payload: Record<string, unknown>) {
  if (!can(PERMISSIONS.PatientEdit) || saving.value) return
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    await update(id, payload)
    patient.value = await getById(id)
    success.value = 'Patient details saved.'
  } catch (cause) {
    error.value = normalizeApiError(
      cause,
      'Patient details could not be saved.',
    )
  } finally {
    saving.value = false
  }
}
async function startConsultation(appointment: Appointment) {
  if (!can(PERMISSIONS.ClinicalEdit) || saving.value || visitId.value) return
  if (!['scheduled', 'confirmed'].includes(appointment.status)) {
    error.value =
      'Only scheduled or checked-in appointments can start a consultation.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    if (
      appointment.status === 'scheduled' &&
      can(PERMISSIONS.AppointmentEdit)
    ) {
      await $api.patch(`/appointments/${appointment.id}/status`, {
        status: 'confirmed',
      })
    }
    const result = await $api.post<{ id: string }>(`/patients/${id}/visits`, {
      patient_id: id,
      appointment_id: appointment.id,
      doctor_user_id: appointment.doctor_user_id || null,
      department: appointment.department,
      symptoms: appointment.chief_complaint || appointment.notes,
      visit_type: 'outpatient',
    })
    visitId.value = result.id
    appointmentId.value = String(appointment.id)
    consultationRequestHandled.value = true
    await router.replace({
      query: {
        ...route.query,
        tab: 'notes',
        edit: undefined,
        visit: result.id,
        appointment: String(appointment.id),
      },
    })
    success.value =
      'Consultation started. New records will be linked to this visit.'
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Consultation could not be started.')
  } finally {
    saving.value = false
  }
}
async function completeConsultation() {
  if (!visitId.value || saving.value || !can(PERMISSIONS.ClinicalEdit)) return
  saving.value = true
  error.value = ''
  try {
    await $api.post(`/visits/${visitId.value}/complete`)
    if (appointmentId.value && can(PERMISSIONS.AppointmentEdit))
      await $api.patch(`/appointments/${appointmentId.value}/status`, {
        status: 'completed',
      })
    visitId.value = undefined
    appointmentId.value = undefined
    await router.replace({
      query: { ...route.query, visit: undefined, appointment: undefined },
    })
    success.value = 'Consultation completed.'
    await load()
  } catch (cause) {
    error.value = normalizeApiError(
      cause,
      'Consultation could not be completed.',
    )
  } finally {
    saving.value = false
  }
}
await useAsyncData(
  `patient-profile-${auth.tenant.value?.id || 'current'}-${id}`,
  async () => { await load(true); return patient.value },
  { lazy: true },
)
</script>
<template>
  <section class="patients-page">
    <NuxtLink to="/patients" class="back-link"
      >&larr; Patients
      <span class="patients-muted">/ Patient profile</span></NuxtLink
    >
    <p v-if="!canView" class="appointments-error" role="alert">
      You do not have permission to view this patient.
    </p>
    <div v-else-if="loading" class="dashboard-state" role="status">
      Loading patient profile…
    </div>
    <div v-else-if="loadError" class="appointments-error" role="alert">
      {{ loadError }}
      <button class="patients-secondary-btn" @click="load(true)">Retry</button>
    </div>
    <template v-else-if="patient"
      ><header class="patient-profile-hero">
        <div class="patient-profile-identity">
          <span class="patient-avatar large-avatar">{{
            patientInitials(patient.name)
          }}</span>
          <div>
            <p class="patients-kicker">PATIENT PROFILE</p>
            <h1>{{ patient.name }}</h1>
            <p>
              {{ patient.age != null ? `${patient.age} years · ` : ''
              }}{{ patient.gender || 'Not specified' }} ·
              {{ patient.department || 'Department not assigned' }}
            </p>
          </div>
        </div>
        <div class="patients-header-actions">
          <PatientsPatientStatus :status="patient.status" /><button
            class="patients-secondary-btn"
            @click="load()"
          >
            Refresh</button
          ><button
            v-if="can(PERMISSIONS.PatientEdit)"
            class="patients-primary-btn"
            @click="tab('details')"
          >
            Edit details
          </button>
        </div>
        <div class="patient-profile-facts">
          <div>
            <small>Phone</small><strong>{{ patient.phone || '—' }}</strong>
          </div>
          <div>
            <small>Email</small
            ><strong>{{ patient.email || 'Not recorded' }}</strong>
          </div>
          <div>
            <small>Registered</small
            ><strong>{{ patientDate(patient.created_at) }}</strong>
          </div>
          <div>
            <small>Follow-up</small
            ><strong>{{ patientDate(patient.follow_up_date) }}</strong>
          </div>
        </div>
      </header>
      <p v-if="severeAllergies.length" class="appointments-error" role="alert">
        <strong>Allergy alert:</strong>
        {{
          severeAllergies
            .map((item) => `${item.allergen} (${item.severity})`)
            .join(', ')
        }}
      </p>
      <p v-if="error" class="appointments-error" role="alert">{{ error }}</p>
      <p v-if="success" class="patients-success" role="status">{{ success }}</p>
      <div v-if="visitId" class="patients-consultation">
        <div>
          <strong>Consultation in progress</strong>
          <p>
            Notes, vitals, prescriptions and uploads are linked to this visit.
          </p>
        </div>
        <button
          class="patients-primary-btn"
          :disabled="saving"
          @click="completeConsultation"
        >
          {{ saving ? 'Completing…' : 'Complete consultation' }}
        </button>
      </div>
      <nav class="patient-tabs" aria-label="Patient sections">
        <NuxtLink
          v-for="item in tabs"
          :key="item.key"
          :to="{ query: { ...route.query, edit: undefined, tab: item.key } }"
          :class="{ active: activeTab === item.key }"
          :aria-current="activeTab === item.key ? 'page' : undefined"
          >{{ item.label }}</NuxtLink
        >
      </nav>
      <template v-if="activeTab === 'today'"
        ><div
          v-if="can(PERMISSIONS.AppointmentView)"
          class="patient-appointment-summary"
        >
          <article class="patient-clinical-panel">
            <header class="patient-section-header">
              <h2>Today’s appointments</h2>
              <button
                class="patients-secondary-btn"
                @click="tab('appointments')"
              >
                View all
              </button>
            </header>
            <div
              v-if="todayAppointments.length"
              class="patient-appointment-list"
            >
              <div
                v-for="appointment in todayAppointments"
                :key="appointment.id"
                class="patient-appointment-summary-row"
              >
                <strong>{{
                  hospitalTime(appointment.scheduled_at, timezone)
                }}</strong>
                <span
                  >{{ appointment.doctor_name || 'Doctor not assigned' }} ·
                  {{ appointment.department || 'No department' }}</span
                >
                <em>{{ patientLabel(appointment.status) }}</em>
              </div>
            </div>
            <p v-else class="empty-state-box">
              No appointment scheduled for today.
            </p>
          </article>
          <article
            v-if="upcomingAppointments.length"
            class="patient-clinical-panel"
          >
            <header class="patient-section-header">
              <h2>Upcoming appointments</h2>
              <button
                class="patients-secondary-btn"
                @click="tab('appointments')"
              >
                View all
              </button>
            </header>
            <div class="patient-appointment-list">
              <div
                v-for="appointment in upcomingAppointments"
                :key="appointment.id"
                class="patient-appointment-summary-row"
              >
                <strong>{{
                  patientDate(appointment.scheduled_at, timezone)
                }}</strong>
                <span
                  >{{ appointment.doctor_name || 'Doctor not assigned' }} ·
                  {{ appointment.department || 'No department' }}</span
                >
                <em>{{ appointment.duration_minutes || 30 }} min</em>
              </div>
            </div>
          </article>
        </div>
        <PatientsTodayOverview
          v-if="canClinical"
          :patient-id="id"
          :timezone="timezone"
          @navigate="tab" />
        <div class="patient-overview-grid">
          <article class="patient-clinical-panel">
            <h2>Care summary</h2>
            <dl class="detail-list">
              <div>
                <dt>Department</dt>
                <dd>{{ patient.department || 'Not assigned' }}</dd>
              </div>
              <div>
                <dt>Last contact</dt>
                <dd>{{ patientDate(patient.last_contact_at) }}</dd>
              </div>
              <div>
                <dt>Next follow-up</dt>
                <dd>{{ patientDate(patient.follow_up_date) }}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{{ patient.source_lead_id ? 'Converted from lead' : patient.inquiry_source || '—' }}</dd>
              </div>
            </dl>
            <h3>Care notes</h3>
            <p class="patient-preserve-text">
              {{ patient.notes || 'No care notes recorded.' }}
            </p>
            <template v-if="canClinical && patient.ai_summary">
              <h3>AI-generated summary</h3>
              <p class="patient-preserve-text">{{ patient.ai_summary }}</p>
            </template>
            <div v-if="patient.tags?.length" class="patient-tag-list">
              <span
                v-for="tag in patient.tags"
                :key="tag"
                class="patient-status"
                >{{ tag }}</span
              >
            </div>
          </article>
          <article class="patient-clinical-panel">
            <h2>Contact & emergency</h2>
            <dl class="detail-list">
              <div>
                <dt>Address</dt>
                <dd>
                  {{
                    [
                      patient.address_line1,
                      patient.address_line2,
                      patient.city,
                      patient.state,
                      patient.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Not recorded'
                  }}
                </dd>
              </div>
              <div>
                <dt>Emergency contact</dt>
                <dd>{{ patient.emergency_contact_name || 'Not recorded' }}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{{ patient.emergency_contact_phone || '—' }}</dd>
              </div>
              <div>
                <dt>Relationship</dt>
                <dd>{{ patient.emergency_contact_relation || '—' }}</dd>
              </div>
            </dl>
          </article>
        </div>
        <AppointmentsPatientAppointments
          v-if="can(PERMISSIONS.AppointmentView)"
          :patient-id="id"
          :appointments="appointments"
          @changed="load()"
          @consult="startConsultation"
      /></template>
      <PatientsPatientForm
        v-else-if="activeTab === 'details'"
        :patient="patient"
        :saving="saving"
        :readonly="!can(PERMISSIONS.PatientEdit)"
        @save="save"
        @cancel="tab('today')"
      />
      <AppointmentsPatientAppointments
        v-else-if="activeTab === 'appointments'"
        :patient-id="id"
        :appointments="appointments"
        @changed="load()"
        @consult="startConsultation"
      />
      <PatientsClinicalRecords
        v-else-if="
          ['allergies', 'vitals', 'notes'].includes(activeTab) && canClinical
        "
        :key="activeTab"
        :patient-id="id"
        :kind="activeTab"
        :visit-id="visitId"
        :appointment-id="appointmentId"
        @changed="load()"
      />
      <PatientsPrescriptions
        v-else-if="activeTab === 'prescriptions' && canClinical"
        :patient-id="id"
        :patient-name="patient.name"
        :visit-id="visitId"
        :appointment-id="appointmentId"
      />
      <div
        v-else-if="activeTab === 'history' && canClinical"
        class="patient-history-grid"
      >
        <PatientsClinicalRecords
          :patient-id="id"
          kind="medical-history"
        /><PatientsClinicalRecords :patient-id="id" kind="family-history" />
      </div>
      <PatientsLifestyle
        v-else-if="activeTab === 'lifestyle' && canClinical"
        :patient-id="id"
      />
      <PatientsDocuments
        v-else-if="activeTab === 'documents' && canClinical"
        :patient-id="id"
        :visit-id="visitId"
      />
      <PatientsConversation
        v-else-if="
          activeTab === 'messages' && can(PERMISSIONS.ConversationView)
        "
        :patient-id="id"
        :patient-name="patient.name"
      />
      <PatientsVisitHistory
        v-else-if="
          (activeTab === 'timeline' || activeTab === 'visit-chart') &&
          canClinical
        "
        :key="activeTab"
        :patient-id="id"
        :kind="activeTab"
      />
    </template>
  </section>
</template>
