import type { DoctorNote, NoteLanguage } from '~/types/doctor-note'
import { registerClinicalNavigation } from '~/utils/clinical-navigation'
import { normalizeApiError } from '~/utils/api/errors'
import { useClinicalSpeech } from './useClinicalSpeech'

export function useDoctorNoteEditor(onSaved: (note: DoctorNote) => void) {
  const { $api } = useNuxtApp()
  const router = useRouter()
  const note = ref<DoctorNote | null>(null)
  const fields = reactive({ subjective: '', objective: '', assessment: '', plan: '' })
  const language = ref<NoteLanguage>('en-IN')
  const savedSnapshot = ref('')
  const persisted = ref(false)
  const saving = ref(false)
  const error = ref('')
  const conflict = ref(false)
  const online = ref(true)
  const elapsed = ref(0)
  let serverAt = 0
  let measuredAt = 0
  let savedAt = 0
  let pending: Promise<boolean> | null = null
  let leavePending: Promise<boolean> | null = null
  let disposed = false
  let autoTimer: ReturnType<typeof setInterval>
  let clockTimer: ReturnType<typeof setInterval>
  const snapshot = () => JSON.stringify({ ...fields, original_language: language.value })
  const hasNoteText = computed(() => [fields.subjective, fields.objective, fields.assessment, fields.plan]
    .some(field => field.trim().length > 0))
  const dirty = computed(() => !!note.value && (persisted.value
    ? JSON.stringify({ ...fields, original_language: language.value }) !== savedSnapshot.value
    : hasNoteText.value))
  const editable = computed(() => {
    elapsed.value // Re-evaluate against monotonic elapsed time, independent of the browser clock.
    return !!note.value?.can_edit && (!note.value.editable_until ||
      Date.parse(note.value.editable_until) > serverAt + (performance.now() - measuredAt))
  })
  const lastSaved = computed(() => {
    elapsed.value
    if (!savedAt) return 'Not yet saved'
    const seconds = Math.max(0, Math.floor((performance.now() - savedAt) / 1000))
    return seconds < 60 ? `Saved ${seconds} seconds ago` : `Saved ${Math.floor(seconds / 60)} minutes ago`
  })
  const speech = useClinicalSpeech((text) => {
    if (!note.value || disposed) return
    fields.subjective += (fields.subjective.trim() ? ' ' : '') + text.trim()
  })
  watch(editable, (allowed) => {
    if (!allowed && speech.recording.value) void speech.stop()
  })
  function updateMetadata(value: DoctorNote) {
    note.value = value
    serverAt = Date.parse(value.server_time)
    measuredAt = performance.now()
    const previousAge = Math.max(0, serverAt - Date.parse(value.updated_at))
    savedAt = measuredAt - previousAge
  }
  function open(value: DoctorNote) {
    error.value = ''
    conflict.value = false
    persisted.value = true
    updateMetadata(value)
    Object.assign(fields, { subjective: value.subjective, objective: value.objective, assessment: value.assessment, plan: value.plan })
    language.value = value.original_language === 'und' ? 'en-IN' : value.original_language
    savedSnapshot.value = snapshot()
  }
  function create(patientId: string, visitId: string, appointmentId?: string) {
    error.value = ''
    conflict.value = false
    const now = new Date().toISOString()
    open({
      id: crypto.randomUUID(), patient_id: patientId, visit_id: visitId,
      appointment_id: appointmentId || null, author_user_id: '', author_name: '',
      note_type: 'progress', subjective: '', objective: '', assessment: '', plan: '',
      original_language: 'en-IN', status: 'draft', created_at: now, updated_at: now,
      finalized_at: null, editable_until: null, last_auto_saved_at: null,
      revision: 0, can_edit: true, server_time: now,
    })
    persisted.value = false
    savedAt = 0
  }
  async function save(finalize = false): Promise<boolean> {
    // Never overlap saves; a later save must capture the latest fields and revision.
    if (pending) {
      const previous = await pending
      if (!previous) return false
      return save(finalize)
    }
    if (!note.value) return true
    if (!dirty.value && !finalize) return true
    if (!editable.value || conflict.value) {
      error.value = conflict.value ? 'Review the server version before saving again.' : 'The editing window has ended. Your unsaved text remains visible.'
      return false
    }
    if (!online.value) { error.value = 'Offline — changes are not synchronized. Keep this page open.'; return false }
    const original = { ...note.value }
    const content = { ...fields, original_language: language.value }
    const captured = JSON.stringify(content)
    saving.value = true
    error.value = ''
    pending = (async () => {
      try {
        if (!persisted.value) {
          const created = await $api.post<DoctorNote>('/clinical/notes', {
            id: original.id, patient_id: original.patient_id, visit_id: original.visit_id,
            appointment_id: original.appointment_id, note_type: original.note_type, ...content,
          })
          if (disposed) return true
          updateMetadata(created)
          persisted.value = true
          // An ambiguous create retry can recover an older server draft, but must not overwrite it.
          if (created.revision !== 1 || created.status !== 'draft') {
            conflict.value = true
            error.value = 'This note was already changed in another session. Review the server version.'
            return false
          }
        }
        const current = note.value!
        // Always send the captured content after create, including a recovered create response.
        const saved = await $api.patch<DoctorNote>(`/clinical/notes/${current.id}`, {
          patient_id: original.patient_id, visit_id: original.visit_id, appointment_id: original.appointment_id,
          revision: current.revision, ...content, finalize,
        })
        if (disposed) return true
        updateMetadata(saved)
        savedAt = performance.now()
        savedSnapshot.value = captured
        onSaved(saved)
        return true
      } catch (cause: any) {
        conflict.value = cause?.response?.status === 409
        error.value = conflict.value
          ? 'Another session changed this note, or a previous save completed without a response. Your text is preserved; review the server version.'
          : cause?.response?.status === 405
            ? 'Saving Doctor Notes is not available on the server yet. Deploy the matching backend update, then try again. Your text is still here.'
            : normalizeApiError(cause, 'Could not save. Your text is still here. Keep this page open and retry.')
        return false
      } finally { saving.value = false; pending = null }
    })()
    return pending
  }
  async function stopAndSave() { await speech.stop(); return save() }
  async function finish() {
    if (!hasNoteText.value) {
      error.value = 'Write or dictate a note before saving it as finished.'
      return false
    }
    await speech.stop()
    return save(true)
  }
  async function prepareToLeave(): Promise<boolean> {
    if (leavePending) return leavePending
    leavePending = (async () => {
      if (!note.value) return true
      if (!persisted.value && !hasNoteText.value && !speech.recording.value) {
        note.value = null
        return true
      }
      if (!dirty.value && !speech.recording.value && note.value.status !== 'draft') return true
      if (!window.confirm('You have an in-progress Doctor Note. Save your changes and leave? Choose Cancel to continue editing.')) return false
      await speech.stop()
      if (!await save()) return false
      // Save text typed while the preceding request was in flight.
      if (dirty.value && !await save()) return false
      note.value = null
      return true
    })()
    try { return await leavePending } finally { leavePending = null }
  }
  function beforeUnload(event: BeforeUnloadEvent) {
    if (!dirty.value && !speech.recording.value) return
    event.preventDefault()
    event.returnValue = ''
  }
  function keepDraft() {
    // Best effort only. The regular timer is the primary durability mechanism.
    if (!note.value || !persisted.value || !dirty.value || saving.value || conflict.value || !editable.value) return
    const payload = JSON.stringify({
      patient_id: note.value.patient_id, visit_id: note.value.visit_id,
      appointment_id: note.value.appointment_id, revision: note.value.revision,
      ...fields, original_language: language.value, finalize: false,
    })
    if (new TextEncoder().encode(payload).length > 60000) return
    void fetch(`/api/bff/clinical/notes/${note.value.id}`, {
      method: 'PATCH', credentials: 'same-origin', keepalive: true,
      headers: { 'Content-Type': 'application/json' }, body: payload,
    }).catch(() => {})
  }
  function connectivity() {
    online.value = navigator.onLine
    if (online.value && dirty.value && !conflict.value) void save()
  }
  function visibility() {
    if (document.visibilityState === 'hidden' && dirty.value) void save()
  }
  let removeRoute: (() => void) | undefined
  let removeLogout: (() => void) | undefined
  onMounted(() => {
    online.value = navigator.onLine
    autoTimer = setInterval(() => { if (dirty.value && !conflict.value) void save() }, 60000)
    clockTimer = setInterval(() => { elapsed.value++ }, 1000)
    removeRoute = router.beforeEach(async (to, from) =>
      to.fullPath === from.fullPath || await prepareToLeave())
    removeLogout = registerClinicalNavigation(prepareToLeave, () => dirty.value || speech.recording.value)
    window.addEventListener('beforeunload', beforeUnload)
    window.addEventListener('pagehide', keepDraft)
    window.addEventListener('online', connectivity)
    window.addEventListener('offline', connectivity)
    document.addEventListener('visibilitychange', visibility)
  })
  onBeforeUnmount(() => {
    keepDraft()
    disposed = true
    clearInterval(autoTimer); clearInterval(clockTimer)
    removeRoute?.(); removeLogout?.()
    window.removeEventListener('beforeunload', beforeUnload)
    window.removeEventListener('pagehide', keepDraft)
    window.removeEventListener('online', connectivity)
    window.removeEventListener('offline', connectivity)
    document.removeEventListener('visibilitychange', visibility)
  })
  return { note, fields, language, dirty, saving, error, conflict, online, editable,
    lastSaved, speech, open, create, save, stopAndSave, finish, prepareToLeave }
}
