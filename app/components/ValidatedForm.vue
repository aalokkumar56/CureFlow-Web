<script setup lang="ts">
import { fieldLabel, normalizeApiError } from '~/utils/api/errors'
const props = defineProps<{ error?: unknown }>()
const emit = defineEmits<{ submit: [event: Event] }>()
const form = ref<HTMLFormElement>()
const id = useId()
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
const issues = shallowRef<{ control: Control; message: string; id: string; target: HTMLElement }[]>(
  [],
)
const controls = () =>
  Array.from(form.value?.querySelectorAll<Control>('input, select, textarea') || []).filter(
    (el) => el.willValidate,
  )
const label = (el: Control) => {
  const copy = el.labels?.[0]?.cloneNode(true) as HTMLElement | undefined
  copy
    ?.querySelectorAll('input, select, textarea, button, svg, .field-validation')
    .forEach((node) => node.remove())
  return (
    el.getAttribute('data-label') ||
    copy?.textContent
      ?.trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*\*$/, '') ||
    fieldLabel(el.name || 'This field')
  )
}
function message(el: Control) {
  const name = label(el)
  if (el.required && !el.value.trim()) return `${name} is required.`
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.value && el.minLength > 0 && el.value.length < el.minLength)
      return `${name} must contain at least ${el.minLength} characters.`
    if (el.maxLength > 0 && el.value.length > el.maxLength)
      return `${name} must contain no more than ${el.maxLength} characters.`
  }
  const value = el.value.trim()
  if (value && el.getAttribute('type') === 'tel') {
    if (!/^\+?[\d\s().-]+$/.test(value) || !/\d/.test(value))
      return `${name} must be a valid phone number.`
    const digits = value.replace(/\D/g, '').length
    const min = Number(el.dataset.minDigits || 0),
      max = Number(el.dataset.maxDigits || 0)
    if ((min && digits < min) || (max && digits > max))
      return `${name} must contain ${min} to ${max} digits including country code.`
  }
  if (value && el.dataset.containsAlphanumeric !== undefined && !/[a-z0-9]/i.test(value))
    return `${name} must contain at least one letter or number.`
  if (
    value &&
    el.dataset.future !== undefined &&
    new Date(value).getTime() < Date.now() - 5 * 60000
  )
    return `${name} must be in the future.`
  if (value && el.dataset.matches) {
    const other = controls().find((control) => control.name === el.dataset.matches)
    if (other && el.value !== other.value)
      return `${name} must match ${label(other).toLowerCase()}.`
  }
  if (value && el.dataset.after) {
    const other = controls().find((control) => control.name === el.dataset.after)
    if (other?.value && value <= other.value)
      return `${name} must be after ${label(other).toLowerCase()}.`
  }
  if (el.validity.typeMismatch)
    return `${name} must be a valid ${el.getAttribute('type') === 'email' ? 'email address' : 'URL'}.`
  if (el.validity.rangeUnderflow) return `${name} must be at least ${el.getAttribute('min')}.`
  if (el.validity.rangeOverflow) return `${name} must be no more than ${el.getAttribute('max')}.`
  if (el.validity.stepMismatch)
    return `${name} must use increments of ${el.getAttribute('step') || '1'}.`
  return el.validity.valid ? '' : `${name}: ${el.validationMessage}`
}
function clearIssue(el: Control) {
  const issue = issues.value.find((item) => item.control === el)
  if (!issue) return
  issue.target.remove()
  el.removeAttribute('aria-invalid')
  const describedBy = (el.getAttribute('aria-describedby') || '')
    .split(' ')
    .filter((value) => value !== `${issue.id}-field`)
    .join(' ')
  if (describedBy) el.setAttribute('aria-describedby', describedBy)
  else el.removeAttribute('aria-describedby')
  issues.value = issues.value.filter((item) => item.control !== el)
}
function addIssue(el: Control, text: string) {
  clearIssue(el)
  const issueId = `${id}-${controls().indexOf(el)}`
  el.setAttribute('aria-invalid', 'true')
  el.setAttribute(
    'aria-describedby',
    [el.getAttribute('aria-describedby'), `${issueId}-field`].filter(Boolean).join(' '),
  )
  const target = document.createElement('span')
  target.className = 'field-validation'
  const anchor = el.closest('.auth-input, .platform-input') || el
  anchor.insertAdjacentElement('afterend', target)
  issues.value = [...issues.value, { control: el, message: text, id: issueId, target }]
}
let submitting = false
function validate(event: Event) {
  if (event.target !== form.value || submitting) return
  const buttons = Array.from(
    form.value?.querySelectorAll<HTMLButtonElement>(
      'button[type="submit"], input[type="submit"]',
    ) || [],
  )
  if (buttons.length && buttons.every((button) => button.disabled)) return
  issues.value.slice().forEach((item) => clearIssue(item.control))
  for (const el of controls()) {
    const text = message(el)
    if (text) addIssue(el, text)
  }
  if (issues.value.length) {
    issues.value[0]?.control.focus()
    return
  }
  submitting = true
  try {
    emit('submit', event)
  } finally {
    void nextTick(() => {
      submitting = false
    })
  }
}
function update(event: Event) {
  const el = event.target as Control
  if (!controls().includes(el)) return
  // Validate nonempty values immediately, and empty required fields after blur.
  if (el.value || event.type === 'focusout' || issues.value.some((item) => item.control === el)) {
    clearIssue(el)
    const text = message(el)
    if (text) addIssue(el, text)
  }
  for (const dependent of controls().filter(
    (control) =>
      control !== el &&
      (control.dataset.matches === el.name || control.dataset.after === el.name) &&
      control.value,
  )) {
    clearIssue(dependent)
    const text = message(dependent)
    if (text) addIssue(dependent, text)
  }
}

watch(
  () => props.error,
  async (error) => {
    issues.value.slice().forEach((item) => clearIssue(item.control))
    if (!error) return
    await nextTick()
    const text = typeof error === 'string' ? error : normalizeApiError(error)
    const key = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/^admin(?=email|password)/, '')
    for (const el of controls()) {
      const lines = text
        .split('\n')
        .filter(
          (line) =>
            line.includes(':') &&
            [key(el.name), key(label(el))]
              .filter(Boolean)
              .includes(key(line.slice(0, line.indexOf(':')))),
        )
      if (lines.length) addIssue(el, lines.join('\n'))
    }
    issues.value[0]?.control.focus()
  },
)
onBeforeUnmount(() => issues.value.slice().forEach((item) => clearIssue(item.control)))
</script>
<template>
  <form
    ref="form"
    class="validated-form"
    novalidate
    @submit.stop.prevent="validate"
    @input="update"
    @focusout="update"
    @change="update">
    <div v-if="issues.length" class="validation-summary" role="alert">
      <strong>Please check the following fields:</strong>
      <ul>
        <li v-for="issue in issues" :id="issue.id" :key="issue.id">
          <button type="button" @click="issue.control.focus()">{{ issue.message }}</button>
        </li>
      </ul>
    </div>
    <FormError :error="error" />
    <slot />
    <Teleport v-for="issue in issues" :key="issue.id" :to="issue.target"
      ><span :id="`${issue.id}-field`" class="field-message">{{ issue.message }}</span></Teleport
    >
  </form>
</template>
