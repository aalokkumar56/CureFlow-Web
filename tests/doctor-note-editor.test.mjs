import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { ref, reactive, computed, watch, nextTick } from 'vue'

const code = ts.transpileModule(readFileSync(new URL('../app/composables/patients/useDoctorNoteEditor.ts', import.meta.url), 'utf8')
  .replaceAll('import.meta.client', 'true'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

const fixture = () => ({
  id: 'note-a', patient_id: 'patient-a', visit_id: 'visit-a', appointment_id: 'appointment-a',
  author_user_id: 'doctor-a', author_name: 'Doctor A', note_type: 'progress',
  subjective: 'Original', objective: '', assessment: '', plan: '', original_language: 'en-IN',
  status: 'draft', created_at: '2026-09-20T10:00:00Z', updated_at: '2026-09-20T10:00:00Z',
  finalized_at: null, editable_until: null, last_auto_saved_at: null, revision: 1,
  can_edit: true, server_time: '2026-09-20T10:00:00Z',
})

function harness(overrides = {}) {
  const mounts = [], unmounts = [], intervals = [], events = {}
  const saved = [], requests = []
  let now = 100
  let server = fixture()
  let guard, logoutGuard
  const navigator = { onLine: true }
  const api = {
    async post(path, payload) { requests.push({ path, payload }); return { ...server, ...payload, revision: 1 } },
    async patch(path, payload) {
      requests.push({ path, payload })
      server = { ...server, ...payload, revision: payload.revision + 1 }
      if (payload.finalize) server = { ...server, status: 'final_editable', finalized_at: server.server_time,
        editable_until: '2026-09-21T10:00:00Z' }
      return server
    },
    ...overrides,
  }
  const module = { exports: {} }
  runInNewContext(code, {
    module, exports: module.exports, ref, reactive, computed, watch,
    require(name) {
      if (name.includes('clinical-navigation')) return { registerClinicalNavigation(fn) { logoutGuard = fn; return () => {} } }
      if (name.includes('api/errors')) return { normalizeApiError: (_, fallback) => fallback }
      if (name.includes('useClinicalSpeech')) return { useClinicalSpeech: () => ({
        recording: ref(false), stop: async () => {}, interim: ref(''),
      }) }
      throw new Error(name)
    },
    useNuxtApp: () => ({ $api: api }),
    useRouter: () => ({ beforeEach(fn) { guard = fn; return () => {} } }),
    onMounted: fn => mounts.push(fn), onBeforeUnmount: fn => unmounts.push(fn),
    performance: { now: () => now },
    crypto: { randomUUID: () => 'stable-note-id' },
    navigator,
    window: { confirm: () => true, addEventListener: (key, fn) => { events[key] = fn }, removeEventListener: () => {} },
    document: { visibilityState: 'visible', addEventListener: () => {}, removeEventListener: () => {} },
    setInterval: (fn, ms) => { intervals.push({ fn, ms }); return intervals.length },
    clearInterval: () => {}, fetch: async () => ({}), TextEncoder, Date, console,
  })
  const editor = module.exports.useDoctorNoteEditor(note => saved.push(note))
  mounts.forEach(fn => fn())
  return { editor, intervals, events, navigator, requests, saved,
    advance(ms) { now += ms; intervals.find(i => i.ms === 1000).fn() },
    guard: () => guard({ fullPath: '/patient-b' }, { fullPath: '/patient-a' }),
    logout: () => logoutGuard(),
    close: () => unmounts.forEach(fn => fn()),
  }
}

test('one-minute autosave keeps a note as draft', async () => {
  const h = harness()
  h.editor.open(fixture())
  h.editor.fields.subjective = 'Dictated words'
  assert.equal(h.intervals.filter(i => i.ms === 60000).length, 1)
  h.intervals.find(i => i.ms === 60000).fn()
  await h.editor.save()
  assert.equal(h.saved[0].status, 'draft')
  assert.equal(h.requests[0].payload.finalize, false)
  assert.equal(h.editor.dirty.value, false)
  h.close()
})

test('an empty new note stays in the browser until the doctor adds text', async () => {
  const h = harness()
  h.editor.create('patient-a', 'visit-a', 'appointment-a')
  h.intervals.find(i => i.ms === 60000).fn()
  assert.equal(h.requests.length, 0)
  assert.equal(await h.editor.finish(), false)
  assert.equal(h.requests.length, 0)
  assert.equal(h.editor.error.value, 'Write or dictate a note before saving it as finished.')
  assert.equal(await h.editor.prepareToLeave(), true)
  assert.equal(h.editor.note.value, null)
  h.close()
})

test('failed navigation save preserves original patient context and unsaved text', async () => {
  const h = harness({ patch: async () => { throw new Error('offline') } })
  h.editor.open(fixture())
  h.editor.fields.subjective = 'Unsaved Patient A'
  assert.equal(await h.guard(), false)
  assert.equal(h.editor.note.value.patient_id, 'patient-a')
  assert.equal(h.editor.fields.subjective, 'Unsaved Patient A')
  assert.equal(h.editor.dirty.value, true)
  h.close()
})

test('logout waits for a successful save before clearing the editor', async () => {
  const h = harness()
  h.editor.open(fixture())
  h.editor.fields.subjective = 'Save before logout'
  assert.equal(await h.logout(), true)
  assert.equal(h.saved[0].subjective, 'Save before logout')
  assert.equal(h.editor.note.value, null)
  h.close()
})

test('concurrent saves are serialized and newer typing is never discarded', async () => {
  let release
  const payloads = []
  const h = harness({ patch: async (_, payload) => {
    payloads.push(payload)
    if (payloads.length === 1) await new Promise(resolve => { release = resolve })
    return { ...fixture(), ...payload, revision: payload.revision + 1 }
  } })
  h.editor.open(fixture())
  h.editor.fields.subjective = 'First snapshot'
  const first = h.editor.save()
  h.editor.fields.subjective = 'New words typed during save'
  const second = h.editor.save()
  assert.equal(payloads.length, 1)
  release()
  await Promise.all([first, second])
  assert.equal(payloads.length, 2)
  assert.equal(payloads[1].revision, 2)
  assert.equal(payloads[1].subjective, 'New words typed during save')
  assert.equal(h.editor.dirty.value, false)
  h.close()
})

test('conflict blocks retry and preserves local text', async () => {
  let count = 0
  const h = harness({ patch: async () => { count++; throw { response: { status: 409 } } } })
  h.editor.open(fixture())
  h.editor.fields.subjective = 'Local correction'
  assert.equal(await h.editor.save(), false)
  assert.equal(await h.editor.save(), false)
  assert.equal(count, 1)
  assert.equal(h.editor.conflict.value, true)
  assert.equal(h.editor.fields.subjective, 'Local correction')
  h.close()
})

test('a server without the Doctor Notes save endpoint preserves text and explains the deployment issue', async () => {
  const h = harness({ patch: async () => { throw { response: { status: 405 } } } })
  h.editor.open(fixture())
  h.editor.fields.subjective = 'Keep this clinical text'
  assert.equal(await h.editor.save(), false)
  assert.equal(h.editor.fields.subjective, 'Keep this clinical text')
  assert.equal(h.editor.error.value, 'Saving Doctor Notes is not available on the server yet. Deploy the matching backend update, then try again. Your text is still here.')
  h.close()
})

test('offline edit synchronizes on reconnect without changing patient or visit', async () => {
  const h = harness()
  h.editor.open(fixture())
  h.navigator.onLine = false
  h.events.offline()
  h.editor.fields.subjective = 'Offline work'
  assert.equal(await h.editor.save(), false)
  assert.equal(h.requests.length, 0)
  h.navigator.onLine = true
  h.events.online()
  await h.editor.save()
  assert.equal(h.requests[0].payload.patient_id, 'patient-a')
  assert.equal(h.requests[0].payload.visit_id, 'visit-a')
  assert.equal(h.editor.dirty.value, false)
  h.close()
})

test('server deadline governs editability even when wall clock differs', async () => {
  const h = harness()
  h.editor.open({ ...fixture(), status: 'final_editable', finalized_at: '2026-09-19T10:00:01Z',
    editable_until: '2026-09-20T10:00:01Z' })
  assert.equal(h.editor.editable.value, true)
  h.advance(1000)
  await nextTick()
  assert.equal(h.editor.editable.value, false)
  h.editor.fields.subjective = 'Too late'
  assert.equal(await h.editor.save(), false)
  assert.equal(h.requests.length, 0)
  h.close()
})

test('save and finish uses a separate explicit finalization flag', async () => {
  const h = harness()
  h.editor.open(fixture())
  assert.equal(await h.editor.finish(), true)
  assert.equal(h.requests[0].payload.finalize, true)
  assert.equal(h.editor.note.value.status, 'final_editable')
  h.close()
})

test('reopening the last server draft recovers text and is initially synchronized', () => {
  const h = harness()
  h.editor.open({ ...fixture(), subjective: 'Recovered successful autosave', revision: 9 })
  assert.equal(h.editor.fields.subjective, 'Recovered successful autosave')
  assert.equal(h.editor.note.value.revision, 9)
  assert.equal(h.editor.dirty.value, false)
  h.close()
})
