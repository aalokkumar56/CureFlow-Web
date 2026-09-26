import type { NoteLanguage } from '~/types/doctor-note'

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } }
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition
  webkitSpeechRecognition?: new () => Recognition
}

export function useClinicalSpeech(append: (text: string) => void) {
  const recording = ref(false)
  const interim = ref('')
  const speechError = ref('')
  const supported = ref(false)
  let recognition: Recognition | null = null
  let finishStop: (() => void) | null = null
  let stopTimer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  onMounted(() => {
    const host = window as SpeechWindow
    supported.value = !!(host.SpeechRecognition || host.webkitSpeechRecognition)
  })
  function start(language: NoteLanguage) {
    if (recognition || disposed) return
    const host = window as SpeechWindow
    const Engine = host.SpeechRecognition || host.webkitSpeechRecognition
    if (!Engine) { speechError.value = 'Voice input is unavailable in this browser. You can type your note.'; return }
    speechError.value = ''
    const engine = new Engine()
    recognition = engine
    engine.lang = language
    engine.continuous = true
    engine.interimResults = true
    engine.onresult = (event) => {
      if (disposed) return
      let pending = ''
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index]!
        if (result.isFinal) append(result[0].transcript)
        else pending += result[0].transcript
      }
      interim.value = pending
    }
    engine.onerror = (event) => {
      speechError.value = event.error === 'not-allowed'
        ? 'Microphone access was denied. Allow it in your browser or type your note.'
        : event.error === 'language-not-supported'
          ? 'This voice service does not support the selected language. You can type your note.'
          : event.error === 'no-speech' ? 'No speech was detected. Start voice input again when ready.'
            : 'Voice input stopped. Check your microphone and connection, then try again.'
    }
    engine.onend = () => {
      recording.value = false
      recognition = null
      // Some engines end without producing a final result. Keep the visible words.
      if (interim.value.trim() && !disposed) append(interim.value.trim())
      interim.value = ''
      clearTimeout(stopTimer)
      finishStop?.()
      finishStop = null
    }
    try { engine.start(); recording.value = true }
    catch { recognition = null; speechError.value = 'Microphone could not start. Try again or type your note.' }
  }
  async function stop() {
    if (!recognition) return
    await new Promise<void>((resolve) => {
      finishStop = resolve
      recognition!.stop()
      stopTimer = setTimeout(() => {
        if (interim.value.trim() && !disposed) append(interim.value.trim())
        interim.value = ''
        if (recognition) {
          recognition.onresult = null
          recognition.onend = null
          recognition.abort()
          recognition = null
        }
        recording.value = false
        finishStop = null
        resolve()
      }, 2000)
    })
  }
  onBeforeUnmount(() => {
    disposed = true
    clearTimeout(stopTimer)
    if (recognition) { recognition.onresult = null; recognition.onend = null; recognition.abort() }
    finishStop?.()
  })
  return { recording, interim, speechError, supported, start, stop }
}

export function useClinicalReadAloud() {
  const speaking = ref(false)
  const readError = ref('')
  const readNotice = ref('')
  let generation = 0
  function stop() {
    generation++
    if (import.meta.client && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    speaking.value = false
  }
  function listen(text: string, language: string) {
    stop()
    readError.value = ''
    readNotice.value = ''
    if (!('speechSynthesis' in window)) { readError.value = 'Read aloud is unavailable in this browser.'; return }
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find(v => v.lang.toLowerCase() === language.toLowerCase()) ||
      voices.find(v => v.lang.split('-')[0] === language.split('-')[0])
    if (!voice) readNotice.value = 'A matching voice is not installed. Using your browser’s default voice; pronunciation may be less accurate.'
    // Short utterances avoid browsers silently truncating long clinical notes.
    const chunks = text.match(/[\s\S]{1,180}(?:\s|$)|[\s\S]{1,180}/g) || []
    const current = generation
    function next(index: number) {
      if (current !== generation) return
      const chunk = chunks[index]
      if (!chunk) { speaking.value = false; return }
      const utterance = new SpeechSynthesisUtterance(chunk)
      utterance.lang = language
      if (voice) utterance.voice = voice
      utterance.onend = () => next(index + 1)
      utterance.onerror = () => {
        if (current !== generation) return
        speaking.value = false
        readError.value = 'Read aloud failed. Try again.'
      }
      speaking.value = true
      window.speechSynthesis.speak(utterance)
    }
    next(0)
  }
  onBeforeUnmount(stop)
  return { speaking, readError, readNotice, listen, stop }
}
