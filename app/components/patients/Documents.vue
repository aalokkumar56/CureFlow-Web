<script setup lang="ts">
import type { ClinicalRecord } from '~/utils/patient-clinical'
import { patientDate, patientList } from '~/utils/patients'
import { normalizeApiError } from '~/utils/api/errors'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
const props = defineProps<{ patientId: string; visitId?: string }>()
const { $api } = useNuxtApp()
const auth = useTenantAuth()
const canEdit = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.ClinicalEdit),
)
const items = ref<ClinicalRecord[]>([])
const loading = ref(true)
const saving = ref(false)
const title = ref('')
const file = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const error = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = patientList<ClinicalRecord>(
      await $api.get(`/patients/${props.patientId}/documents`),
    )
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Documents could not be loaded.')
  } finally {
    loading.value = false
  }
}
async function upload() {
  if (!file.value || !canEdit.value || saving.value) return
  if (
    !/\.(pdf|jpe?g|png)$/i.test(file.value.name) ||
    file.value.size > 10 * 1024 * 1024
  ) {
    error.value = 'Choose a PDF, JPEG or PNG file up to 10 MB.'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const data = new FormData()
    data.append('file', file.value)
    data.append('title', title.value.trim())
    data.append('documentType', 'paper_note')
    if (props.visitId) data.append('visitId', props.visitId)
    await $api.post(`/patients/${props.patientId}/documents`, data)
    title.value = ''
    file.value = null
    if (fileInput.value) fileInput.value.value = ''
    await load()
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Document could not be uploaded.')
  } finally {
    saving.value = false
  }
}
async function download(item: ClinicalRecord) {
  try {
    const blob = await $api.download(`/patient-documents/${item.id}/download`)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = String(item.original_file_name || 'patient-document')
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Document could not be downloaded.')
  }
}
async function remove(item: ClinicalRecord) {
  if (
    !canEdit.value ||
    saving.value ||
    !window.confirm('Delete this patient document?')
  )
    return
  saving.value = true
  try {
    await $api.delete(`/patient-documents/${item.id}`)
    await load()
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Document could not be deleted.')
  } finally {
    saving.value = false
  }
}
onMounted(load)
</script>
<template>
  <section class="patient-clinical-panel">
    <h2>Documents & paper notes</h2>
    <p v-if="error" class="appointments-error" role="alert">
      {{ error }}
      <button class="patients-secondary-btn" @click="load">Retry</button>
    </p>
    <form v-if="canEdit" class="patient-record-form" @submit.prevent="upload">
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
        <button class="patients-primary-btn" :disabled="saving || !file">
          {{ saving ? 'Uploading…' : 'Upload document' }}
        </button>
      </footer>
    </form>
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
        </div>
        <button class="patients-secondary-btn" @click="download(item)">
          Download</button
        ><button
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
