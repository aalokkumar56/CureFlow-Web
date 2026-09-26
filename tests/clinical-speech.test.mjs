import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'
import { ref } from 'vue'

const code = ts.transpileModule(readFileSync(new URL('../app/composables/patients/useClinicalSpeech.ts', import.meta.url), 'utf8')
  .replaceAll('import.meta.client', 'true'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
function harness({ supported = true, voices = [] } = {}) {
  const mounts = [], unmounts = [], spoken = [], words = []
  let engine
  class Recognition {
    constructor() { engine = this }
    start() {}
    stop() { queueMicrotask(() => this.onend?.()) }
    abort() {}
  }
  const module = { exports: {} }
  runInNewContext(code, {
    module, exports: module.exports, ref, setTimeout, clearTimeout,
    onMounted: fn => mounts.push(fn), onBeforeUnmount: fn => unmounts.push(fn),
    window: {
      SpeechRecognition: supported ? Recognition : undefined,
      speechSynthesis: { getVoices: () => voices, cancel() {}, speak: utterance => spoken.push(utterance) },
    },
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text } },
  })
  const speech = module.exports.useClinicalSpeech(text => words.push(text))
  const read = module.exports.useClinicalReadAloud()
  mounts.forEach(fn => fn())
  return { speech, read, words, spoken, engine: () => engine, close: () => unmounts.forEach(fn => fn()) }
}
test('unsupported browser keeps typed-note fallback available', () => {
  const h = harness({ supported: false })
  assert.equal(h.speech.supported.value, false)
  h.speech.start('gu-IN')
  assert.match(h.speech.speechError.value, /type your note/)
  h.close()
})
test('recognition uses the chosen language and appends finalized results exactly once', () => {
  const h = harness()
  h.speech.start('mr-IN')
  assert.equal(h.engine().lang, 'mr-IN')
  h.engine().onresult({ resultIndex: 0, results: [
    { isFinal: true, 0: { transcript: 'पहिले वाक्य' } },
    { isFinal: false, 0: { transcript: 'पुढील' } },
  ] })
  h.engine().onresult({ resultIndex: 1, results: [
    { isFinal: true, 0: { transcript: 'पहिले वाक्य' } },
    { isFinal: true, 0: { transcript: 'पुढील वाक्य' } },
  ] })
  assert.deepEqual(h.words, ['पहिले वाक्य', 'पुढील वाक्य'])
  h.close()
})
test('stop preserves interim words and completes before the save can continue', async () => {
  const h = harness()
  h.speech.start('hi-IN')
  h.engine().onresult({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: 'अधूरा पाठ' } }] })
  await h.speech.stop()
  assert.deepEqual(h.words, ['अधूरा पाठ'])
  assert.equal(h.speech.recording.value, false)
  h.close()
})
test('microphone denial presents a recoverable error', () => {
  const h = harness()
  h.speech.start('en-IN')
  h.engine().onerror({ error: 'not-allowed' })
  assert.match(h.speech.speechError.value, /denied/)
  h.close()
})
test('speech callbacks cannot append to a different patient after unmount', () => {
  const h = harness()
  h.speech.start('en-IN')
  const lateCallback = h.engine().onresult
  h.close()
  lateCallback({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: 'Late words' } }] })
  assert.equal(h.words.length, 0)
})
test('read aloud falls back to the browser default voice when a matching voice is unavailable', () => {
  const h = harness({ voices: [{ lang: 'en-US', name: 'English' }] })
  h.read.listen('ગુજરાતી', 'gu-IN')
  assert.equal(h.spoken.length, 1)
  assert.equal(h.spoken[0].voice, undefined)
  assert.equal(h.spoken[0].lang, 'gu-IN')
  assert.match(h.read.readNotice.value, /default voice/)
  h.close()
})
test('read aloud uses the selected voice and reports service errors', () => {
  const voice = { lang: 'gu-IN', name: 'Gujarati' }
  const h = harness({ voices: [voice] })
  h.read.listen('ગુજરાતી', 'gu-IN')
  assert.equal(h.spoken[0].voice, voice)
  assert.equal(h.spoken[0].lang, 'gu-IN')
  h.spoken[0].onerror()
  assert.match(h.read.readError.value, /failed/)
  assert.equal(h.read.speaking.value, false)
  h.close()
})
