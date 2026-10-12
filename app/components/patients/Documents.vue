<script setup lang="ts">
import type { PatientDocument, DocumentUploadResult } from '~/types/patient-documents'
import { patientDate, patientList } from '~/utils/patients'
import { normalizeApiError } from '~/utils/api/errors'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
const props = defineProps<{ patientId: string; visitId?: string }>()
const { $api } = useNuxtApp()
const auth = useTenantAuth()
const canEdit = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.ClinicalEdit),
)
const canRead = computed(() => hasPermission(auth.user.value, PERMISSIONS.ClinicalView))
const items = ref<PatientDocument[]>([])
const loading = ref(true)
const saving = ref(false)
const title = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const error = ref('')
const notice = ref('')
const pollingStopped = ref(false)
let generation = 0
let loadSequence = 0
let pollCount = 0
let timer: ReturnType<typeof setTimeout> | undefined
let readController: AbortController | undefined
let mounted = false
const pending = computed(() => items.value.some(item => item.status === 'quarantined'))
const statusText = (status: string) => ({
  quarantined: 'Awaiting safety checks', available: 'Available', rejected: 'Rejected by safety checks',
  failed: 'Safety checks unavailable', unresolved: 'Requires document review',
})[status] || 'Requires document review'
function stopPolling() { clearTimeout(timer); timer = undefined }
function schedulePoll() {
  stopPolling()
  if (!mounted || !canRead.value || !pending.value || document.hidden || pollingStopped.value) return
  if (pollCount >= 30) { pollingStopped.value = true; return }
  timer = setTimeout(() => { pollCount++; void load(true) }, 5000)
}
async function load(background = false) {
  readController?.abort()
  const controller = new AbortController()
  readController = controller
  const current = generation
  const sequence = ++loadSequence
  const patientId = props.patientId
  if (!background) { loading.value = true; error.value = ''; pollCount = 0; pollingStopped.value = false }
  try {
    if (!canRead.value) { items.value = []; return }
    const result = patientList<PatientDocument>(await $api.get(`/patients/${patientId}/documents`, undefined, { signal: controller.signal }))
    if (current === generation && sequence === loadSequence && canRead.value) items.value = result
  } catch (cause) {
    if (!controller.signal.aborted && current === generation && sequence === loadSequence) {
      error.value = normalizeApiError(cause, 'Documents could not be loaded.')
      pollingStopped.value = true
    }
  } finally {
    if (current === generation && sequence === loadSequence) { loading.value = false; schedulePoll() }
  }
}
async function upload() {
  if (!file.value || !canEdit.value || saving.value) return
  if (
    !/\.(pdf|jpe?g|png)$/i.test(file.value.name) ||
    file.value.size === 0 ||
    file.value.size > 10 * 1024 * 1024
  ) {
    error.value = 'Choose a PDF, JPEG or PNG file up to 10 MB.'
    return
  }
  saving.value = true
  error.value = ''
  notice.value = ''
  const current = generation
  const patientId = props.patientId
  try {
    const data = new FormData()
    data.append('file', file.value)
    data.append('title', title.value.trim())
    data.append('documentType', 'paper_note')
    if (props.visitId) data.append('visitId', props.visitId)
    const result = await $api.post<DocumentUploadResult>(`/patients/${patientId}/documents`, data)
    if (current !== generation || !canRead.value) return
    notice.value = result.status === 'available'
      ? 'Document is available.' : 'Upload received. The document remains unavailable until safety checks pass.'
    title.value = ''
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
    await load()
  } catch (cause) {
    if (current === generation) error.value = normalizeApiError(cause, 'Upload could not be confirmed. Refresh the document list before trying again.')
  } finally {
    if (current === generation) saving.value = false
  }
}
async function download(item: PatientDocument) {
  if (!canRead.value || item.status !== 'available') return
  const current = generation
  try {
    const blob = await $api.download(`/patient-documents/${item.id}/download`)
    if (current !== generation || !canRead.value) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = String(item.original_file_name || 'patient-document')
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (cause) {
    if (current === generation) error.value = normalizeApiError(cause, 'Document could not be downloaded.')
  }
}
async function remove(item: PatientDocument) {
  if (
    !canEdit.value ||
    saving.value ||
    !window.confirm('Delete this patient document?')
  )
    return
  saving.value = true
  const current = generation
  try {
    await $api.delete(`/patient-documents/${item.id}`)
    if (current !== generation) return
    await load()
  } catch (cause) {
    if (current === generation) error.value = normalizeApiError(cause, 'Document could not be deleted.')
  } finally {
    if (current === generation) saving.value = false
  }
}
function resetContext() {
  generation++; loadSequence++; stopPolling(); readController?.abort()
  items.value = []; file.value = null; title.value = ''; error.value = ''; notice.value = ''; saving.value = false
  if (fileInput.value) fileInput.value.value = ''
  if (mounted) void load()
}
function visibilityChanged() { if (document.hidden) stopPolling(); else schedulePoll() }
watch(() => [props.patientId, props.visitId], resetContext, { flush: 'sync' })
watch(canRead, resetContext, { flush: 'sync' })
onMounted(() => { mounted = true; document.addEventListener('visibilitychange', visibilityChanged); void load() })
onBeforeUnmount(() => { mounted = false; generation++; stopPolling(); readController?.abort(); document.removeEventListener('visibilitychange', visibilityChanged) })
</script>
<template>
  <section class="patient-clinical-panel">
    <h2>Documents & paper notes</h2>
    <p v-if="error" class="appointments-error" role="alert">
      {{ error }}
      <button type="button" class="patients-secondary-btn" @click="load()">Refresh documents</button>
    </p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="pollingStopped && pending" role="status">Automatic checks paused. Refresh documents to check again.</p>
    <button v-if="pending || items.some(item => item.status !== 'available')" type="button" class="patients-secondary-btn" :disabled="loading" @click="load()">Check document status</button>
    <ValidatedForm :error="error" v-if="canEdit" class="patient-record-form" @submit.prevent="upload">
      <div class="patient-form-grid">
        <label
          ><span>Document title</span
          ><input v-model="title" maxlength="200" :disabled="saving" /></label
        ><label
          ><span>PDF or image</span
          ><input
            ref="fileInput"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            required
            :disabled="saving"
            @change="
              file = ($event.target as HTMLInputElement).files?.[0] || null
            "
        /></label>
      </div>
      <footer class="patient-form-actions">
        <button type="submit" class="patients-primary-btn" :disabled="saving || !file">
          {{ saving ? 'Uploading…' : 'Upload document' }}
        </button>
      </footer>
    </ValidatedForm>
    <div v-if="loading" class="dashboard-state">Loading documents…</div>
    <div v-else-if="!items.length && !error" class="empty-state-box">
      No documents uploaded.
    </div>
    <article v-for="item in items" :key="item.id" class="patient-record-card">
      <header>
        <div>
          <h3>{{ item.title || item.original_file_name }}</h3>
          <p>
            {{ patientDate(item.created_at) }} · {{ item.uploaded_by_name }}
          </p>
          <p role="status">{{ statusText(item.status) }}</p>
          <p v-if="item.status === 'failed'">Safety checks could not finish. Contact your administrator; do not upload the same file again.</p>
          <p v-else-if="item.status === 'rejected'">This file cannot be opened. Choose a different valid document.</p>
          <p v-else-if="item.status !== 'available' && item.status !== 'quarantined'">An administrator must review this document before it can be opened.</p>
        </div>
        <button type="button" class="patients-secondary-btn" :disabled="!canRead || item.status !== 'available'" @click="download(item)">
          Download</button
        ><button type="button"
          v-if="canEdit"
          class="patients-secondary-btn"
          :disabled="saving"
          @click="remove(item)"
        >
          Delete
        </button>
      </header>
    </article>
  </section>
</template>
