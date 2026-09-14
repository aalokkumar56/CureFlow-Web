<script setup lang="ts">
import { downloadPatientCsv } from '~/utils/patients'
import {
  patientImportTemplate,
  validatePatientImport,
  importSkippedRow,
  type PatientImportResult,
} from '~/utils/patient-import'
import { normalizeApiError } from '~/utils/api/errors'
import { isAdminRole } from '~/utils/permissions'
const emit = defineEmits<{ imported: [] }>()
const auth = useTenantAuth()
const { $api } = useNuxtApp()
const dialog = ref<HTMLDialogElement>()
const input = ref<HTMLInputElement>()
const file = ref<File>()
const busy = ref(false)
const error = ref('')
const result = ref<PatientImportResult>()
const skipped = computed(() =>
  (result.value?.skipLog || result.value?.skip_log || []).map(importSkippedRow),
)
function choose(event: Event) {
  const target = event.target as HTMLInputElement
  file.value = undefined
  result.value = undefined
  error.value = ''
  const selected = target.files?.[0]
  if (!selected) return
  error.value = validatePatientImport(selected)
  if (!error.value) file.value = selected
  else target.value = ''
}
function open() {
  error.value = ''
  result.value = undefined
  file.value = undefined
  if (input.value) input.value.value = ''
  dialog.value?.showModal()
}
async function upload() {
  if (busy.value || !file.value || !isAdminRole(auth.user.value?.role)) return
  error.value = validatePatientImport(file.value)
  if (error.value) return
  busy.value = true
  result.value = undefined
  try {
    const data = new FormData()
    data.append('file', file.value)
    result.value = await $api.post<PatientImportResult>(
      '/patients/import-excel',
      data,
    )
    file.value = undefined
    if (input.value) input.value.value = ''
    emit('imported')
  } catch (cause) {
    error.value = normalizeApiError(
      cause,
      'Import failed. You can retry this file.',
    )
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <button class="patients-secondary-btn" @click="open">Import patients</button>
  <dialog
    ref="dialog"
    class="patient-import-dialog"
    aria-labelledby="patient-import-title"
    @cancel="busy && $event.preventDefault()"
  >
    <form @submit.prevent="upload">
      <h2 id="patient-import-title">Import patients from Excel or CSV</h2>
      <p>
        Use a Name column (Patient Name, Full Name) and a Phone column (Mobile
        Number, Contact, Mob). Email, Age, Gender, Department, Source, Tags and
        Notes are optional.
      </p>
      <p>
        Only the first Excel worksheet is imported. Put the headers in the first
        five rows. Use semicolons between tags. Maximum file size: 10 MB.
      </p>
      <button
        type="button"
        class="patients-secondary-btn"
        @click="
          downloadPatientCsv(patientImportTemplate, 'sample_patient_import.csv')
        "
      >
        Download template
      </button>
      <p>Replace the sample patient before uploading.</p>
      <label class="patient-import-file"
        >Choose file<input
          ref="input"
          type="file"
          accept=".csv,.xlsx,.xls"
          :disabled="busy"
          @change="choose"
      /></label>
      <p v-if="file">
        Selected: <strong>{{ file.name }}</strong> ({{
          (file.size / 1024).toFixed(1)
        }}
        KB). Select Upload &amp; Import to continue.
      </p>
      <p v-if="error" class="appointments-error" role="alert">{{ error }}</p>
      <section v-if="result" role="status">
        <p>
          <strong>{{ result.inserted || 0 }} inserted</strong> ·
          {{ result.skipped || 0 }} skipped ·
          {{ result.blankRows ?? result.blank_rows ?? 0 }} blank rows.
        </p>
        <p v-if="!result.inserted && !result.skipped">
          No patient records found. Check the headers and worksheet.
        </p>
        <details v-if="skipped.length" open>
          <summary>Skipped rows — correct these and upload again</summary>
          <ul>
            <li v-for="(row, i) in skipped" :key="i">{{ row }}</li>
          </ul>
        </details>
      </section>
      <footer class="patients-header-actions">
        <button
          type="button"
          class="patients-secondary-btn"
          :disabled="busy"
          @click="dialog?.close()"
        >
          {{ result ? 'Close' : 'Cancel' }}</button
        ><button class="patients-primary-btn" :disabled="busy || !file">
          {{ busy ? 'Importing…' : 'Upload & Import' }}
        </button>
      </footer>
    </form>
  </dialog>
</template>
