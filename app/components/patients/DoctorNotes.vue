<script setup lang="ts">
import { noteLanguages, noteText, type DoctorNote, type NoteLanguage } from '~/types/doctor-note'
import { useDoctorNoteEditor } from '~/composables/patients/useDoctorNoteEditor'
import { useClinicalReadAloud } from '~/composables/patients/useClinicalSpeech'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
import { normalizeApiError } from '~/utils/api/errors'

const props = defineProps<{ patientId: string; visitId?: string; appointmentId?: string }>()
const { $api } = useNuxtApp()
const auth = useTenantAuth()
const records = ref<DoctorNote[]>([])
const loading = ref(true)
const loadError = ref('')
const creating = ref(false)
const serverVersion = ref<DoctorNote | null>(null)
const readLanguage = reactive<Record<string, string>>({})
const translations = reactive<Record<string, { text: string; language: string; revision: number }>>({})
const translating = ref<string | null>(null)
const translationError = ref('')
const translationAvailable = ref(false)
const readingNote = ref<string | null>(null)
let alive = true
const observedAt = new Map<string, number>()
const tick = ref(0)
let clock: ReturnType<typeof setInterval>
function observe(record: DoctorNote) { observedAt.set(record.id, performance.now()) }
function windowOpen(record: DoctorNote) {
  tick.value
  return record.editable_until && Date.parse(record.editable_until) >
    Date.parse(record.server_time) + performance.now() - (observedAt.get(record.id) ?? performance.now())
}
const read = useClinicalReadAloud()
const { speaking, readError, readNotice } = read
const canCreate = computed(() => auth.user.value?.role?.toLowerCase() === 'doctor' &&
  hasPermission(auth.user.value, PERMISSIONS.ClinicalEdit))
const canTranslate = computed(() => hasPermission(auth.user.value, PERMISSIONS.ClinicalTranslate))
const editor = useDoctorNoteEditor((saved) => {
  observe(saved)
  records.value = [saved, ...records.value.filter(n => n.id !== saved.id)]
  delete translations[saved.id]
})
const { note, fields, language, dirty, saving, error, conflict, online, editable, lastSaved } = editor
const { recording, interim, speechError, supported } = editor.speech
const hasSignInError = computed(() => String(error.value || '').toLowerCase().includes('sign in'))
const currentVisitDraft = computed(() => records.value.find(record =>
  record.status === 'draft' && record.can_edit && record.visit_id === props.visitId &&
  record.appointment_id === (props.appointmentId || null),
))
const voiceNoteUnavailableReason = computed(() => {
  if (saving.value) return 'Please wait while your note is being saved.'
  if (!editable.value) return 'This note is no longer open for editing, so voice input is unavailable.'
  if (!supported.value) return 'Voice input is not available in this browser session. Open the page in the regular Chrome browser and refresh. If it is still unavailable, type your note instead.'
  return ''
})
const statusLabel = (n: DoctorNote) => n.status === 'draft' ? 'Draft / In Progress' :
  windowOpen(n) ? 'Final / Saved' : 'Final / Locked'
const date = (value: string | null) => value ? new Date(value).toLocaleString() : '—'
const languageLabel = (value: string) => noteLanguages.find(l => l.value === value)?.label || 'Language not recorded'
async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await $api.get<DoctorNote[]>(`/clinical/notes/patient/${props.patientId}`)
    if (alive) {
      // A completed note is never valid without text. These are placeholders
      // created by older releases and must not be presented as clinical records.
      const visibleRecords = result.filter(record => record.status === 'draft' || noteText(record).trim())
      visibleRecords.forEach(observe)
      records.value = visibleRecords
    }
  } catch (cause) { if (alive) loadError.value = normalizeApiError(cause, 'Doctor Notes could not be loaded.') }
  finally { if (alive) loading.value = false }
}
async function loadTranslationAvailability() {
  if (!canTranslate.value) return
  try {
    const status = await $api.get<{ available?: boolean }>('/clinical/notes/translation/status')
    if (alive) translationAvailable.value = status.available === true
  } catch {
    // Treat a missing or unavailable service as disabled. This prevents users
    // from being offered an action that cannot complete.
    if (alive) translationAvailable.value = false
  }
}
async function startNote() {
  if (!props.visitId || creating.value || !canCreate.value) return
  if (note.value && !await editor.prepareToLeave()) return
  if (currentVisitDraft.value) {
    await edit(currentVisitDraft.value)
    return
  }
  creating.value = true
  try {
    editor.create(props.patientId, props.visitId, props.appointmentId)
    serverVersion.value = null
  } finally { creating.value = false }
}
async function edit(record: DoctorNote) {
  if (note.value && !await editor.prepareToLeave()) return
  try {
    const fresh = await $api.get<DoctorNote>(`/clinical/notes/${record.id}`)
    if (fresh.patient_id !== props.patientId) throw new Error('Patient association did not match.')
    editor.open(fresh)
    observe(fresh)
    serverVersion.value = null
    read.stop()
  } catch (cause) { loadError.value = normalizeApiError(cause, 'The note could not be opened.') }
}
async function finish() {
  if (saving.value) return
  if (await editor.finish()) {
    if (!dirty.value) note.value = null
  }
}
async function reviewConflict() {
  if (!note.value) return
  try { serverVersion.value = await $api.get<DoctorNote>(`/clinical/notes/${note.value.id}`) }
  catch (cause) { error.value = normalizeApiError(cause, 'Could not retrieve the server version.') }
}
function useServerVersion() {
  if (!serverVersion.value) return
  if (!window.confirm('Replace the unsaved editor text with the server version? Copy any text you want to keep before continuing.')) return
  editor.open(serverVersion.value)
  serverVersion.value = null
}
function selectedLanguage(record: DoctorNote) {
  return readLanguage[record.id] || record.original_language
}
async function translate(record: DoctorNote) {
  if (translating.value) return null
  const target = selectedLanguage(record)
  if (target === 'und') { translationError.value = 'Select a reading language first.'; return null }
  if (target === record.original_language) return noteText(record)
  const cached = translations[record.id]
  if (cached?.language === target && cached.revision === record.revision) return cached.text
  translationError.value = ''
  translating.value = record.id
  try {
    const result = await $api.post<{ text: string; language: string; revision: number }>(
      `/clinical/notes/${record.id}/translation`, { language: target, revision: record.revision })
    if (!alive || result.revision !== record.revision || selectedLanguage(record) !== target) return null
    translations[record.id] = result
    return result.text
  } catch (cause: any) {
    if (alive) translationError.value = cause?.response?.status === 503
      ? (cause.response.data?.data?.message || 'Translation is unavailable. Ask your administrator to check the translation service configuration.')
      : normalizeApiError(cause, 'Translation failed. The original note is unchanged.')
    return null
  } finally { if (alive) translating.value = null }
}
async function listen(record: DoctorNote) {
  read.stop()
  const text = await translate(record)
  if (text && alive) {
    readingNote.value = record.id
    read.listen(text, selectedLanguage(record))
  }
}
function listenOriginal(record: DoctorNote) {
  read.stop()
  readingNote.value = record.id
  read.listen(noteText(record), record.original_language)
}
function changeReadLanguage(record: DoctorNote, event: Event) {
  read.stop()
  readLanguage[record.id] = (event.target as HTMLSelectElement).value
  delete translations[record.id]
}
onMounted(() => { void load(); void loadTranslationAvailability(); clock = setInterval(() => { tick.value++ }, 1000) })
onBeforeUnmount(() => { alive = false; clearInterval(clock) })
</script>

<template>
  <section class="doctor-notes patient-clinical-panel" aria-label="Doctor Notes">
    <header class="patient-section-header">
      <div><h2>Doctor Notes</h2><p class="patients-muted">Drafts auto-save every minute. Finished notes can be corrected by their author for 24 hours.</p></div>
      <button v-if="canCreate && visitId && !note" class="patients-primary-btn" :disabled="creating || loading" @click="startNote">New Doctor Note</button>
    </header>
    <p v-if="canCreate && !visitId" class="patients-muted">Start a consultation from the patient's appointment to create a note for that visit.</p>
    <p v-if="loadError" class="appointments-error" role="alert">{{ loadError }} <button @click="load">Retry</button></p>
    <section v-if="note" class="note-editor patient-record-card">
      <header><h3>{{ statusLabel(note) }}</h3><span>{{ note.author_name || auth.user.value?.name }}</span></header>
      <p class="patients-muted">Patient ID: {{ note.patient_id }} · Visit: {{ note.visit_id }}<span v-if="note.appointment_id"> · Appointment: {{ note.appointment_id }}</span></p>
      <p v-if="note.editable_until">Editable until {{ date(note.editable_until) }}</p>
      <section class="voice-note-help" aria-label="How to add a voice note">
        <h4>Add a note by voice</h4>
        <ol>
          <li>Choose the language you will speak.</li>
          <li>Select <strong>Start Voice Note</strong>.</li>
          <li>If Chrome asks, select <strong>Allow</strong> to use your microphone.</li>
          <li>Speak normally, then select <strong>Stop &amp; Save Progress</strong>.</li>
        </ol>
        <p class="patients-muted">Choose the language before recording so your words are recognised correctly.</p>
      </section>
      <label>Language you will speak
        <select v-model="language" :disabled="recording || !editable">
          <option v-for="item in noteLanguages" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <div class="note-actions">
        <button v-if="!recording" class="patients-secondary-btn" :disabled="!supported || !editable || saving" :title="voiceNoteUnavailableReason" @click="editor.speech.start(language)">Start Voice Note</button>
        <button v-else class="patients-secondary-btn" @click="editor.stopAndSave()">Stop &amp; Save Progress</button>
        <span v-if="recording" role="status">● Recording in {{ languageLabel(language) }}</span>
      </div>
      <p v-if="voiceNoteUnavailableReason" class="appointments-error" role="status">{{ voiceNoteUnavailableReason }}</p>
      <p v-if="speechError" class="appointments-error" role="alert">{{ speechError }}</p>
      <label>Doctor note / Subjective
        <textarea v-model="fields.subjective" rows="9" :readonly="!editable" maxlength="20000" placeholder="Type or dictate your note…" />
      </label>
      <p v-if="interim" class="note-interim" aria-live="polite">{{ interim }}</p>
      <details :open="!!(fields.objective || fields.assessment || fields.plan)">
        <summary>Additional SOAP sections</summary>
        <label v-for="field in (['objective', 'assessment', 'plan'] as const)" :key="field">
          {{ field.charAt(0).toUpperCase() + field.slice(1) }}
          <textarea v-model="fields[field]" rows="3" :readonly="!editable" maxlength="20000" />
        </label>
      </details>
      <p role="status">{{ !online ? 'Offline — ' : '' }}{{ saving ? 'Saving…' : lastSaved }}{{ dirty ? ' · Unsynchronized changes' : '' }}</p>
      <p v-if="!editable" class="appointments-error">This note is read-only. Any unsaved text is still visible for review.</p>
      <p v-if="error" class="appointments-error" role="alert">{{ error }}</p>
      <p v-if="hasSignInError">
        <a href="/login" target="_blank" rel="noopener">Sign in in a new tab</a>, then return here and save again.
      </p>
      <button v-if="conflict" class="patients-secondary-btn" @click="reviewConflict">Review server version</button>
      <article v-if="serverVersion" class="patient-record-card">
        <h4>Server version · {{ date(serverVersion.updated_at) }}</h4>
        <pre class="note-text">{{ noteText(serverVersion) }}</pre>
        <p>Your unsaved text remains in the editor above. Compare and copy any changes you need before loading this version.</p>
        <button class="patients-secondary-btn" @click="useServerVersion">Load server version</button>
      </article>
      <footer class="note-actions">
        <button class="patients-secondary-btn" :disabled="saving || !editable || conflict" @click="editor.stopAndSave()">Save progress</button>
        <button class="patients-primary-btn" :disabled="saving || !editable || conflict || !noteText(fields).trim()" @click="finish">{{ note.finalized_at ? 'Save corrections' : 'Save & Finish' }}</button>
        <button class="patients-secondary-btn" :disabled="saving" @click="editor.prepareToLeave()">Close editor</button>
      </footer>
    </section>
    <p v-if="loading" role="status">Loading Doctor Notes…</p>
      <p v-else-if="!records.length && !loadError" class="patients-muted">No Doctor Notes recorded.</p>
      <p v-if="translationError || readError" class="appointments-error" role="alert">{{ translationError || readError }}</p>
      <p v-if="readNotice" class="patients-muted" role="status">{{ readNotice }}</p>
    <article v-for="record in records.filter(n => n.id !== note?.id)" :key="record.id" class="patient-record-card">
      <header><div><h3>{{ statusLabel(record) }}</h3><p>{{ record.author_name }} · {{ date(record.created_at) }}</p></div>
        <button v-if="record.can_edit && canCreate && (record.status === 'draft' || windowOpen(record))" class="patients-secondary-btn" @click="edit(record)">{{ record.status === 'draft' ? 'Continue draft' : 'Edit' }}</button>
      </header>
      <p class="patients-muted">Visit: {{ record.visit_id || 'Legacy record' }} · {{ languageLabel(record.original_language) }}</p>
      <p v-if="record.finalized_at">Finished {{ date(record.finalized_at) }} · Editing ends {{ date(record.editable_until) }}</p>
      <pre class="note-text">{{ noteText(record) }}</pre>
      <div v-if="record.status !== 'draft' && canTranslate && translationAvailable" class="note-actions">
        <label>Read / translate in
          <select :value="selectedLanguage(record)" :disabled="!!translating" @change="changeReadLanguage(record, $event)">
            <option v-if="record.original_language === 'und'" value="und" disabled>Select language</option>
            <option v-for="item in noteLanguages" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
        <button class="patients-secondary-btn" :disabled="!!translating" @click="translate(record)">{{ translating === record.id ? 'Translating…' : 'Translate' }}</button>
        <button v-if="speaking && readingNote === record.id" class="patients-secondary-btn" @click="read.stop()">Stop listening</button>
        <button v-else class="patients-secondary-btn" :disabled="!!translating" @click="listen(record)">Listen</button>
      </div>
      <div v-else-if="record.status !== 'draft'" class="note-actions">
        <span class="patients-muted">Read aloud</span>
        <button v-if="speaking && readingNote === record.id" class="patients-secondary-btn" @click="read.stop()">Stop listening</button>
        <button v-else class="patients-secondary-btn" @click="listenOriginal(record)">Listen</button>
      </div>
      <section v-if="translations[record.id]" class="note-translation">
        <h4>Translation · {{ languageLabel(translations[record.id]!.language) }}</h4>
        <p class="patients-muted">Machine translation for reading. The original note above remains the clinical record.</p>
        <pre class="note-text">{{ translations[record.id]!.text }}</pre>
      </section>
    </article>
  </section>
</template>

<style scoped>
.doctor-notes { margin-block: 1rem 2rem; }
.doctor-notes label { display: grid; gap: .4rem; font-weight: 600; margin-block: .8rem; }
.doctor-notes textarea, .doctor-notes select { font: inherit; border: 1px solid #ccd4df; border-radius: 8px; padding: .7rem; background: white; color: #172033; }
.doctor-notes textarea { width: 100%; box-sizing: border-box; resize: vertical; line-height: 1.65; }
.note-editor { border-left: 4px solid #228477; }
.note-actions { display: flex; flex-wrap: wrap; gap: .65rem; align-items: center; }
.voice-note-help { margin: .8rem 0; padding: .8rem 1rem; border-radius: .5rem; background: #f1f8f7; }
.voice-note-help h4 { margin: 0 0 .35rem; }
.voice-note-help ol { margin: 0; padding-left: 1.25rem; }
.voice-note-help p { margin: .45rem 0 0; }
.note-text { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; line-height: 1.7; }
.note-interim { color: #52667b; font-style: italic; }
.note-translation { padding: 1rem; border-radius: 8px; background: #f2f7fa; margin-top: 1rem; }
.patients-muted { overflow-wrap: anywhere; }
button:disabled { opacity: .55; cursor: not-allowed; }
</style>
