<script setup lang="ts">
import { PhMagnifyingGlass, PhPlus, PhUploadSimple } from '@phosphor-icons/vue'
import { useLeads, type Lead, type LeadImportResult } from '~/composables/leads/useLeads'
import { hasPermission, PERMISSIONS, type Permission } from '~/utils/permissions'
import { normalizeApiError } from '~/utils/api/errors'
import { validatePatientImport } from '~/utils/patient-import'
import { downloadPatientCsv, patientList } from '~/utils/patients'
import { formatCampaignDate } from '~/utils/campaigns'

definePageMeta({
  layout: 'tenant',
  middleware: ['tenant-auth', 'tenant-approval'],
})
useHead({ title: 'Leads | CureFlow' })
const auth = useTenantAuth()
const leadTotal = useState<number | null>('tenant-lead-total', () => null)
const allowed = (permission: Permission) => hasPermission(auth.user.value, permission)
const canView = computed(() => allowed(PERMISSIONS.LeadView))
const canBook = computed(
  () =>
    allowed(PERMISSIONS.LeadConvert) &&
    allowed(PERMISSIONS.PatientCreate) &&
    allowed(PERMISSIONS.AppointmentCreate),
)
const { $api, list, mutate, error, saving } = useLeads()
const search = ref('')
const query = ref('')
const status = ref('active')
const page = ref(1)
const pageSize = 20
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => {
    query.value = value
    page.value = 1
  }, 300)
})
watch(status, () => {
  page.value = 1
})
onScopeDispose(() => clearTimeout(timer))
const {
  data,
  status: loadStatus,
  error: loadError,
  refresh,
} = await useAsyncData(
  () => `leads-list-${auth.tenant.value?.id || 'current'}`,
  () =>
    canView.value
      ? list({
          q: query.value,
          status: status.value,
          page: page.value,
          page_size: pageSize,
        })
      : Promise.resolve(null),
  { watch: [query, status, page, canView], lazy: true },
)
const summary = computed(() => data.value?.summary ?? { total: 0, active: 0, converted: 0 })
watch(
  () => data.value?.total,
  (value) => {
    leadTotal.value = typeof value === 'number' ? value : null
  },
  { immediate: true },
)
const conversionRate = computed(() =>
  summary.value.total ? Math.round((summary.value.converted / summary.value.total) * 1000) / 10 : 0,
)
const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.total || 0) / pageSize)))
const editor = ref<HTMLDialogElement>()
const importDialog = ref<HTMLDialogElement>()
const historyDialog = ref<HTMLDialogElement>()
const deleteDialog = ref<HTMLDialogElement>()
const selected = ref<Lead | null>(null)
const form = reactive({
  phone: '',
  name: '',
  age: '' as string | number,
  gender: 'unknown',
})
const openEditor = (lead: Lead | null = null) => {
  selected.value = lead
  Object.assign(form, {
    phone: lead?.phone ?? '',
    name: lead?.name ?? '',
    age: lead?.age ?? '',
    gender: lead?.gender ?? 'unknown',
  })
  error.value = ''
  editor.value?.showModal()
}
const save = async () => {
  const payload = { ...form, age: form.age === '' ? null : Number(form.age) }
  if (
    await mutate(() =>
      selected.value
        ? $api.patch(`/leads/${selected.value.id}`, payload)
        : $api.post('/leads', payload),
    )
  ) {
    editor.value?.close()
    await refresh()
  }
}
const fileInput = ref<HTMLInputElement>()
const file = ref<File>()
const importResult = ref<LeadImportResult>()
const openImport = () => {
  file.value = undefined
  importResult.value = undefined
  error.value = ''
  if (fileInput.value) fileInput.value.value = ''
  importDialog.value?.showModal()
}
const chooseFile = (event: Event) => {
  file.value = (event.target as HTMLInputElement).files?.[0]
  error.value = file.value ? validatePatientImport(file.value) : ''
  importResult.value = undefined
  if (error.value) file.value = undefined
}
const upload = async () => {
  if (!file.value) return
  const body = new FormData()
  body.append('file', file.value)
  if (
    await mutate(async () => {
      importResult.value = await $api.post<LeadImportResult>('/leads/import-excel', body)
    })
  ) {
    file.value = undefined
    if (fileInput.value) fileInput.value.value = ''
    await refresh()
  }
}
const downloadTemplate = () =>
  downloadPatientCsv([['Phone Number', 'Name', 'Age', 'Gender']], 'leads-template.csv')
type LeadHistory = {
  id: string
  campaign_id: string
  campaign_name: string
  status: number
  sent_at: string | null
  error_message: string | null
}
const history = ref<LeadHistory[]>([])
const historyLoading = ref(false)
const openHistory = async (lead: Lead) => {
  selected.value = lead
  history.value = []
  error.value = ''
  historyDialog.value?.showModal()
  historyLoading.value = true
  try {
    const result = await $api.get<{ history: LeadHistory[] }>(`/leads/${lead.id}`)
    history.value = result.history
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Campaign history could not be loaded.')
  } finally {
    historyLoading.value = false
  }
}
const requestDelete = (lead: Lead) => {
  selected.value = lead
  error.value = ''
  deleteDialog.value?.showModal()
}
const remove = async () => {
  if (!selected.value) return
  if (await mutate(() => $api.delete(`/leads/${selected.value!.id}`))) {
    deleteDialog.value?.close()
    await refresh()
    if (page.value > totalPages.value) page.value = totalPages.value
  }
}
const bookingLead = ref<Lead | null>(null)
const bookingName = ref('')
const existingPatientId = ref('')
const existingPatients = ref<{ id: string; name: string; phone: string }[]>([])
const matchesLoading = ref(false)
const matchesError = ref('')
const openBooking = async (lead: Lead) => {
  bookingLead.value = lead
  bookingName.value = lead.name || ''
  existingPatientId.value = ''
  existingPatients.value = []
  error.value = ''
  matchesError.value = ''
  if (!allowed(PERMISSIONS.PatientView)) return
  matchesLoading.value = true
  try {
    existingPatients.value = patientList(
      await $api.get('/patients', { q: lead.phone, page_size: 100 }),
    )
  } catch (cause) {
    matchesError.value = normalizeApiError(cause, 'Existing patients could not be checked.')
  } finally {
    matchesLoading.value = false
  }
}
const bookAppointment = async (payload: Record<string, unknown>) => {
  if (!bookingLead.value) return
  const id = bookingLead.value.id
  const request = {
    ...payload,
    name: bookingName.value.trim(),
    patient_id: existingPatientId.value || null,
    scheduled_at: new Date(String(payload.scheduled_at)).toISOString(),
  }
  if (await mutate(() => $api.post(`/leads/${id}/appointment`, request))) {
    bookingLead.value = null
    await refresh()
  }
}
</script>

<template>
  <section class="patients-page leads-page">
    <p v-if="!canView" role="alert">You do not have permission to view leads.</p>
    <template v-else>
      <div class="lead-stats">
        <article>
          <span>Total leads</span><strong>{{ summary.total }}</strong>
        </article>
        <article>
          <span>Active leads</span><strong>{{ summary.active }}</strong>
        </article>
        <article>
          <span>Converted to patients</span><strong>{{ summary.converted }}</strong>
        </article>
        <article>
          <span>Conversion rate</span><strong>{{ conversionRate }}%</strong>
        </article>
      </div>
      <section class="patients-directory lead-card">
        <div class="patients-toolbar lead-toolbar">
          <label class="patients-search"
            ><PhMagnifyingGlass :size="18" /><input
              v-model="search"
              type="search"
              placeholder="Search name or phone"
              aria-label="Search leads" /></label
          ><select v-model="status" aria-label="Lead status">
            <option value="active">Active leads</option>
            <option value="converted">Converted leads</option>
            <option value="all">All leads</option></select
          ><button
            type="button"
            v-if="allowed(PERMISSIONS.LeadCreate)"
            class="patients-secondary-btn lead-secondary"
            @click="openImport">
            <PhUploadSimple :size="18" /> Import Excel</button
          ><button
            type="button"
            v-if="allowed(PERMISSIONS.LeadCreate)"
            class="patients-primary-btn lead-primary"
            @click="openEditor()">
            <PhPlus :size="18" /> Add lead
          </button>
        </div>
        <p v-if="loadError" class="lead-error" role="alert">
          {{ normalizeApiError(loadError, 'Leads could not be loaded.') }}
          <button type="button" @click="refresh()">Retry</button>
        </p>
        <div class="patients-table-wrap lead-table-wrap" :aria-busy="loadStatus === 'pending'">
          <table class="patients-table">
            <thead>
              <tr>
                <th>Name / Phone</th>
                <th>Age</th>
                <th>Gender</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Sent / Failed</th>
                <th>Last sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="lead in data?.items || []" :key="lead.id">
                <td>
                  <strong>{{ lead.name || 'Unnamed lead' }}</strong
                  ><small>{{ lead.phone }}</small>
                </td>
                <td>{{ lead.age ?? '—' }}</td>
                <td class="lead-capitalize">{{ lead.gender }}</td>
                <td>
                  <span class="lead-badge" :class="{ converted: lead.converted_at }">{{
                    lead.converted_at ? 'Converted' : 'Active'
                  }}</span
                  ><small v-if="lead.converted_at">{{
                    formatCampaignDate(lead.converted_at)
                  }}</small>
                </td>
                <td>{{ lead.scheduled_count }}</td>
                <td>{{ lead.sent_count }} / {{ lead.failed_count }}</td>
                <td>
                  {{ lead.last_sent_at ? formatCampaignDate(lead.last_sent_at) : '—' }}
                </td>
                <td>
                  <div class="lead-row-actions">
                    <button type="button" @click="openHistory(lead)">History</button
                    ><template v-if="!lead.converted_at"
                      ><button
                        type="button"
                        v-if="allowed(PERMISSIONS.LeadEdit)"
                        @click="openEditor(lead)">
                        Edit</button
                      ><button type="button" v-if="canBook" @click="openBooking(lead)">
                        Book appointment</button
                      ><button
                        type="button"
                        v-if="allowed(PERMISSIONS.LeadDelete)"
                        class="lead-danger"
                        @click="requestDelete(lead)">
                        Delete
                      </button></template
                    ><NuxtLink
                      v-else-if="allowed(PERMISSIONS.PatientView)"
                      :to="`/patients/${lead.converted_patient_id}`"
                      >View patient</NuxtLink
                    >
                  </div>
                </td>
              </tr>
              <tr v-if="!data?.items.length">
                <td colspan="8" class="lead-empty">
                  {{
                    loadStatus === 'pending'
                      ? 'Loading leads…'
                      : 'No leads found. Import an Excel file or add a lead to get started.'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="patients-pagination lead-pagination">
          <span>{{ data?.total || 0 }} leads · Page {{ page }} of {{ totalPages }}</span>
          <div class="lead-actions">
            <button
              type="button"
              class="patients-secondary-btn"
              :disabled="page <= 1 || loadStatus === 'pending'"
              @click="page--">
              Previous</button
            ><button
              type="button"
              class="patients-secondary-btn"
              :disabled="page >= totalPages || loadStatus === 'pending'"
              @click="page++">
              Next
            </button>
          </div>
        </footer>
      </section>
      <dialog ref="editor" class="lead-dialog" @cancel="saving && $event.preventDefault()">
        <ValidatedForm :error="error" @submit.prevent="save">
          <h2>{{ selected ? 'Edit lead' : 'Add lead' }}</h2>
          <label
            >Phone number *<input
              v-model="form.phone"
              name="phone"
              data-min-digits="10"
              data-max-digits="15"
              required
              type="tel"
              maxlength="30"
              placeholder="9876543210 or +91 9876543210" /></label
          ><label>Name<input v-model="form.name" name="name" maxlength="200" /></label
          ><label
            >Age<input
              v-model="form.age"
              name="age"
              type="number"
              min="0"
              max="130"
              step="1" /></label
          ><label
            >Gender<select v-model="form.gender" name="gender">
              <option value="unknown">Unknown</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select></label
          >

          <footer>
            <button type="button" :disabled="saving" @click="editor?.close()">Cancel</button
            ><button type="submit" class="lead-primary" :disabled="saving">
              {{ saving ? 'Saving…' : 'Save lead' }}
            </button>
          </footer>
        </ValidatedForm>
      </dialog>
      <dialog ref="importDialog" class="lead-dialog" @cancel="saving && $event.preventDefault()">
        <h2>Import leads</h2>
        <p>
          Phone Number is required. Name, Age and Gender are optional. Use the first sheet with
          column headings in the first row.
        </p>
        <p>
          Excel (.xlsx, .xls) and CSV · Up to 10 MB and 10,000 rows. Existing numbers are skipped;
          edit their details in the table.
        </p>
        <button type="button" class="lead-secondary" @click="downloadTemplate">
          Download template</button
        ><label
          >Choose file<input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls,.csv"
            :disabled="saving"
            @change="chooseFile"
        /></label>
        <FormError v-if="error" :error="error" role="alert" />
        <div v-if="importResult" role="status">
          <strong>{{ importResult.inserted }} imported · {{ importResult.skipped }} skipped</strong>
          <details v-if="importResult.errors.length">
            <summary>View skipped rows</summary>
            <ul>
              <li v-for="(reason, index) in importResult.errors" :key="index">
                {{ reason }}
              </li>
            </ul>
          </details>
        </div>
        <footer>
          <button type="button" :disabled="saving" @click="importDialog?.close()">Close</button
          ><button type="button" class="lead-primary" :disabled="!file || saving" @click="upload">
            {{ saving ? 'Importing…' : 'Import leads' }}
          </button>
        </footer>
      </dialog>
      <dialog ref="historyDialog" class="lead-dialog">
        <h2>Campaign history</h2>
        <p>{{ selected?.name || 'Unnamed lead' }} ({{ selected?.phone }})</p>
        <p v-if="error" role="alert" class="lead-error">{{ error }}</p>
        <p v-if="historyLoading">Loading history…</p>
        <p v-else-if="!history.length">No campaign messages sent yet.</p>
        <ul v-else class="lead-history">
          <li v-for="item in history" :key="item.id">
            <NuxtLink
              v-if="allowed(PERMISSIONS.CampaignView)"
              :to="`/campaigns/${item.campaign_id}`"
              >{{ item.campaign_name }}</NuxtLink
            ><strong v-else>{{ item.campaign_name }}</strong
            ><small
              >{{ formatCampaignDate(item.sent_at || '') }} ·
              {{ item.error_message ? 'Failed' : 'Sent' }}</small
            ><small v-if="item.error_message">{{ item.error_message }}</small>
          </li>
        </ul>
        <footer><button type="button" @click="historyDialog?.close()">Close</button></footer>
      </dialog>
      <dialog ref="deleteDialog" class="lead-dialog">
        <h2>Delete lead?</h2>
        <p>
          {{ selected?.name || 'Unnamed lead' }} ({{ selected?.phone }}) will be removed from active
          leads and future campaign sends.
        </p>
        <p v-if="error" role="alert" class="lead-error">{{ error }}</p>
        <footer>
          <button type="button" :disabled="saving" @click="deleteDialog?.close()">Cancel</button
          ><button type="button" class="lead-danger" :disabled="saving" @click="remove">
            Delete lead
          </button>
        </footer>
      </dialog>
      <AppointmentsAppointmentFormModal
        :open="!!bookingLead"
        :patient-id="bookingLead?.id"
        :saving="saving"
        :error="error"
        @close="!saving && (bookingLead = null)"
        @save="bookAppointment"
        ><template #before-fields
          ><p>
            Confirm the person becoming a patient. This appointment will convert the lead and
            preserve their campaign history.
          </p>
          <label>Patient name *<input v-model="bookingName" required maxlength="200" /></label>
          <p v-if="matchesLoading">Checking existing patients…</p>
          <p v-if="matchesError" role="alert">{{ matchesError }}</p>
          <label v-if="existingPatients.length"
            >Patient record<select
              v-model="existingPatientId"
              @change="
                bookingName =
                  existingPatients.find((p) => p.id === existingPatientId)?.name || bookingName
              ">
              <option value="">Create a new patient</option>
              <option v-for="patient in existingPatients" :key="patient.id" :value="patient.id">
                {{ patient.name }} ({{ patient.phone }})
              </option>
            </select></label
          ></template
        ></AppointmentsAppointmentFormModal
      >
    </template>
  </section>
</template>

