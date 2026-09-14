<script setup lang="ts">
import {
  PhMagnifyingGlass,
  PhPlus,
  PhDownloadSimple,
  PhUsersThree,
  PhEye,
} from '@phosphor-icons/vue'
import {
  usePatients,
  type PatientRecord,
} from '~/composables/patients/usePatients'
import {
  collectAppointments,
  nextPatientAppointments,
} from '~/utils/patient-appointments'
import { hospitalTimezone, hospitalTime } from '~/utils/tenant-time'
import type { Appointment } from '~/composables/appointments/useAppointments'
import {
  patientStatuses,
  patientSources,
  patientDate,
  patientInitials,
  patientList,
  downloadPatientCsv,
} from '~/utils/patients'
import { hasPermission, PERMISSIONS, isAdminRole } from '~/utils/permissions'
import { normalizeApiError } from '~/utils/api/errors'
definePageMeta({
  layout: 'tenant',
  middleware: ['tenant-auth', 'tenant-approval'],
})
useHead({ title: 'Patients | CureFlow' })
const auth = useTenantAuth()
const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const { patients, pagination, loading, error, load } = usePatients()
const patientTotal = useState<number | null>('tenant-patient-total', () => null)
const canView = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.PatientView),
)
const canCreate = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.PatientCreate),
)
const canImport = computed(() => isAdminRole(auth.user.value?.role))
const selected = ref<PatientRecord | null>(null)
const departments = ref<string[]>([])
const search = ref(String(route.query.q || ''))
const status = computed(() => String(route.query.status || 'all'))
const department = computed(() => String(route.query.department || 'all'))
const source = computed(() => String(route.query.source || 'all'))
const page = computed(() => {
  const value = Number(route.query.page)
  return Number.isSafeInteger(value) && value > 0 ? value : 1
})
const pageSize = computed(() =>
  [8, 20, 50].includes(Number(route.query.page_size))
    ? Number(route.query.page_size)
    : 8,
)
const nextAppointments = ref<Record<string, Appointment>>({})
const appointmentsLoading = ref(false)
const appointmentsError = ref('')
const canAppointments = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.AppointmentView),
)
const canEdit = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.PatientEdit),
)
const timezone = computed(() => hospitalTimezone(auth.tenant.value))
let timer: ReturnType<typeof setTimeout> | undefined
const refresh = async () => {
  selected.value = null
  if (!canView.value) return
  await load(
    String(route.query.q || ''),
    status.value,
    page.value,
    pageSize.value,
    department.value,
    source.value,
  )
  patientTotal.value = error.value ? null : pagination.value.total
  if (!error.value && page.value > pagination.value.totalPages)
    await filter('page', String(pagination.value.totalPages))
}
const loadUpcomingAppointments = async () => {
  if (!canView.value || !canAppointments.value || appointmentsLoading.value)
    return
  appointmentsLoading.value = true
  appointmentsError.value = ''
  try {
    const from = new Date().toISOString()
    const rows = await collectAppointments((page) =>
      $api.get('/appointments', { from, page, page_size: 100 }),
    )
    nextAppointments.value = nextPatientAppointments(rows)
  } catch (cause) {
    nextAppointments.value = {}
    appointmentsError.value = normalizeApiError(
      cause,
      'Upcoming appointments could not be loaded.',
    )
  } finally {
    appointmentsLoading.value = false
  }
}
const nextAppointmentDate = (patient: PatientRecord) =>
  patientDate(
    nextAppointments.value[String(patient.id)]?.scheduled_at,
    timezone.value,
  )
const nextAppointmentTime = (patient: PatientRecord) =>
  hospitalTime(
    nextAppointments.value[String(patient.id)]?.scheduled_at,
    timezone.value,
  )
const filter = (key: string, value: string) =>
  router.replace({
    query: {
      ...route.query,
      page: undefined,
      [key]: !value || value === 'all' ? undefined : value,
    },
  })
watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (value.trim() === String(route.query.q || '')) return
    void filter('q', value.trim())
  }, 300)
})
watch(
  () => route.query,
  () => {
    search.value = String(route.query.q || '')
    if (import.meta.client) void refresh()
  },
)
onBeforeUnmount(() => clearTimeout(timer))
const exportCsv = () =>
  downloadPatientCsv(
    [
      ['Name', 'Phone', 'Email', 'Department', 'Status', 'Source', 'Created'],
      ...patients.value.map((p) => [
        p.name,
        p.phone,
        p.email,
        p.department,
        patientStatuses[p.status || ''] || p.status,
        p.inquiry_source,
        p.created_at,
      ]),
    ],
    'patients-current-page.csv',
  )
onMounted(async () => {
  if (route.query.new === '1' && canCreate.value) {
    await navigateTo('/patients/new')
    return
  }
  await Promise.allSettled([
    refresh(),
    loadUpcomingAppointments(),
    (async () => {
      if (!canView.value) return
      departments.value = patientList<string | { name: string }>(
        await $api.get('/hospital-profile/departments'),
      ).map((item) => (typeof item === 'string' ? item : item.name))
    })(),
  ])
})
</script>
<template>
  <section class="patients-page">
    <p v-if="!canView" class="appointments-error" role="alert">
      You do not have permission to view patients.
    </p>
    <template v-else>
      <div class="patients-directory">
        <div class="patients-toolbar">
          <label class="patients-search"
            ><PhMagnifyingGlass :size="18" /><input
              v-model="search"
              type="search"
              aria-label="Search patients"
              placeholder="Search name, phone or email…"
          /></label>
          <div class="patients-filter-selects">
            <select
              :value="status"
              aria-label="Patient status"
              @change="
                filter('status', ($event.target as HTMLSelectElement).value)
              "
            >
              <option value="all">All statuses</option>
              <option
                v-for="(label, value) in patientStatuses"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option></select
            ><select
              :value="department"
              aria-label="Department"
              @change="
                filter('department', ($event.target as HTMLSelectElement).value)
              "
            >
              <option value="all">All departments</option>
              <option v-for="name in departments" :key="name">
                {{ name }}
              </option></select
            ><select
              :value="source"
              aria-label="Inquiry source"
              @change="
                filter('source', ($event.target as HTMLSelectElement).value)
              "
            >
              <option value="all">All sources</option>
              <option
                v-for="(label, value) in patientSources"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </div>
          <div class="patients-filter-actions">
            <button
              class="patients-secondary-btn"
              :disabled="!patients.length || loading"
              @click="exportCsv"
            >
              <PhDownloadSimple :size="16" /> Export page
            </button>
            <PatientsPatientImport v-if="canImport" @imported="refresh" />
            <NuxtLink
              v-if="canCreate"
              to="/patients/new"
              class="patients-primary-btn"
            >
              <PhPlus :size="17" /> New patient
            </NuxtLink>
          </div>
        </div>
        <p v-if="error" class="appointments-error" role="alert">
          {{ error }}
          <button class="patients-secondary-btn" @click="refresh">Retry</button>
        </p>
        <p v-if="appointmentsError" class="appointments-error" role="alert">
          {{ appointmentsError }}
          <button @click="loadUpcomingAppointments">Retry appointments</button>
        </p>
        <div
          class="patients-workbench"
          :class="{ 'preview-visible': selected }"
          :aria-busy="loading"
        >
          <div class="patients-list-panel">
            <div v-if="loading" class="dashboard-state" role="status">
              Loading patients…
            </div>
            <div v-else-if="!error" class="patients-table-wrap">
              <table class="patients-table">
                <thead>
                  <tr>
                    <th scope="col">Patient</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Department</th>
                    <th scope="col">Status</th>
                    <th scope="col">Source</th>
                    <th scope="col">Last contact</th>
                    <th v-if="canAppointments" scope="col">Next appointment</th>
                    <th scope="col"><span class="sr-only">Preview</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="patient in patients" :key="patient.id">
                    <td>
                      <NuxtLink
                        :to="`/patients/${patient.id}`"
                        class="patient-identity patient-link"
                        ><span class="patient-avatar">{{
                          patientInitials(patient.name)
                        }}</span>
                        <div>
                          <strong>{{
                            patient.name || 'Unnamed patient'
                          }}</strong
                          ><small
                            >{{
                              patient.age != null
                                ? `${patient.age} years · `
                                : ''
                            }}{{ patient.gender || 'Not specified' }}</small
                          >
                        </div></NuxtLink
                      >
                    </td>
                    <td>
                      <div class="patient-contact">
                        <span>{{ patient.phone || '—' }}</span
                        ><small>{{
                          patient.email || 'No email recorded'
                        }}</small>
                      </div>
                    </td>
                    <td>{{ patient.department || 'Not assigned' }}</td>
                    <td><PatientsPatientStatus :status="patient.status" /></td>
                    <td>
                      {{
                        patientSources[patient.inquiry_source || ''] ||
                        patient.inquiry_source ||
                        '—'
                      }}
                    </td>
                    <td>{{ patientDate(patient.last_contact_at) }}</td>
                    <td v-if="canAppointments">
                      <span v-if="appointmentsLoading">Loading…</span>
                      <span v-else-if="appointmentsError">Unavailable</span>
                      <template
                        v-else-if="
                          nextAppointments[String(patient.id)]?.scheduled_at
                        "
                      >
                        <strong>{{ nextAppointmentDate(patient) }}</strong>
                        <small class="patient-table-subtext">{{
                          nextAppointmentTime(patient)
                        }}</small>
                      </template>
                      <span v-else>—</span>
                    </td>
                    <td>
                      <button
                        class="preview-btn"
                        :aria-label="`Preview ${patient.name}`"
                        @click="selected = patient"
                      >
                        <PhEye :size="18" />
                      </button>
                      <NuxtLink
                        v-if="canEdit"
                        :to="`/patients/${patient.id}?edit=1`"
                        class="preview-btn"
                        >Edit</NuxtLink
                      >
                    </td>
                  </tr>
                  <tr v-if="!patients.length">
                    <td :colspan="canAppointments ? 8 : 7">
                      <div class="patients-empty">
                        <PhUsersThree :size="32" />
                        <h3>No patients found</h3>
                        <p>Try a different search or clear your filters.</p>
                        <button
                          class="patients-secondary-btn"
                          @click="router.replace({ query: {} })"
                        >
                          Clear filters
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <footer class="patients-pagination">
              <label
                >Rows per page
                <select
                  :value="pageSize"
                  @change="
                    filter(
                      'page_size',
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                >
                  <option :value="8">8</option>
                  <option :value="20">20</option>
                  <option :value="50">50</option>
                </select></label
              ><span>Page {{ page }} of {{ pagination.totalPages }}</span
              ><button
                :disabled="loading || page <= 1"
                @click="filter('page', String(page - 1))"
              >
                Previous</button
              ><button
                :disabled="loading || page >= pagination.totalPages"
                @click="filter('page', String(page + 1))"
              >
                Next
              </button>
            </footer>
          </div>
          <PatientsPatientPreview
            v-if="selected"
            :key="selected.id"
            :patient="selected"
            @close="selected = null"
          />
        </div>
      </div>
    </template>
  </section>
</template>
