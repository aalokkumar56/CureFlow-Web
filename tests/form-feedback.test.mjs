import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'
import * as vue from 'vue'
import { Window } from 'happy-dom'

function moduleSource(path) {
  const exports = {}
  const source = ts.transpile(readFileSync(new URL('../' + path, import.meta.url), 'utf8'), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  })
  new Function('exports', source)(exports)
  return exports
}
const { normalizeApiError, getApiErrorDetails, fieldLabel } =
  moduleSource('app/utils/api/errors.ts')
test('ofetch login unwraps Nitro and preserves the actual credential error', () => {
  const error = Object.assign(new Error('[POST] /api/auth/login: 401'), {
    name: 'FetchError',
    statusCode: 401,
    data: { data: { error: 'Invalid email or password', detail: 'Invalid email or password' } },
  })
  assert.equal(normalizeApiError(error), 'Invalid email or password')
})
test('Axios validation retains all messages across all fields and aliases', () => {
  const error = {
    response: {
      status: 400,
      data: {
        data: {
          errors: {
            AdminEmail: ['Email is invalid.', 'Email is already registered.'],
            hospital_name: ['Hospital is required.'],
          },
        },
      },
    },
  }
  assert.equal(
    normalizeApiError(error),
    'Admin Email: Email is invalid.\nAdmin Email: Email is already registered.\nHospital name: Hospital is required.',
  )
  assert.equal(getApiErrorDetails(error).fieldErrors.AdminEmail.length, 2)
})
test('server, network, timeout and transport errors have safe readable fallbacks', () => {
  assert.equal(
    normalizeApiError({ response: { status: 500, data: { detail: 'SQL secret' } } }),
    'Something went wrong on our end. Please try again later.',
  )
  assert.match(normalizeApiError({ code: 'ERR_NETWORK' }), /connection/)
  assert.match(normalizeApiError({ code: 'ECONNABORTED' }), /timed out/)
  assert.equal(
    normalizeApiError(
      Object.assign(new Error('[POST] URL failed'), { name: 'FetchError' }),
      'Sign-in failed.',
    ),
    'Sign-in failed.',
  )
})
function setupForm() {
  const window = new Window()
  const props = vue.reactive({ error: '' })
  const emitted = []
  let source = readFileSync(new URL('../app/components/ValidatedForm.vue', import.meta.url), 'utf8')
    .match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*$/gm, '')
  source += '\nreturn { form, issues, validate, update }'
  const globals = {
    ref: vue.ref,
    shallowRef: vue.shallowRef,
    watch: vue.watch,
    nextTick: vue.nextTick,
    defineProps: () => props,
    defineEmits:
      () =>
      (...args) =>
        emitted.push(args),
    useId: () => 'test',
    onBeforeUnmount: () => {},
    document: window.document,
    HTMLInputElement: window.HTMLInputElement,
    HTMLTextAreaElement: window.HTMLTextAreaElement,
    fieldLabel,
    normalizeApiError,
  }
  const scope = vue.effectScope()
  const api = scope.run(() =>
    new Function(
      ...Object.keys(globals),
      ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }),
    )(...Object.values(globals)),
  )
  api.form.value = window.document.createElement('form')
  window.document.body.append(api.form.value)
  return {
    ...api,
    props,
    emitted,
    stop: () => {
      scope.stop()
      window.happyDOM.abort()
    },
  }
}
test('required whitespace and programmatic overlength input are blocked; corrections can submit', () => {
  const form = setupForm()
  form.form.value.innerHTML =
    '<label>Name<input name="name" required maxlength="5"></label><label>Department<select required name="department"><option value="">Select</option><option value="opd">Outpatient</option></select></label>'
  const input = form.form.value.querySelector('input')
  const select = form.form.value.querySelector('select')
  input.value = '   '
  form.validate({ target: form.form.value })
  assert.equal(form.emitted.length, 0)
  assert.equal(form.issues.value.length, 2)
  assert.equal(form.issues.value[1].message, 'Department is required.')
  assert.equal(input.getAttribute('aria-invalid'), 'true')
  input.value = '123456'
  form.update({ target: input })
  assert.match(form.issues.value.find((x) => x.control === input).message, /no more than 5/)
  input.value = 'Alex'
  select.value = 'opd'
  form.validate({ target: form.form.value })
  assert.equal(form.emitted.length, 1)
  assert.equal(input.hasAttribute('aria-invalid'), false)
  assert.equal(form.form.value.querySelectorAll('.field-validation').length, 0)
  form.stop()
})
test('server validation maps snake/Pascal field names and keeps unrelated messages visible', async () => {
  const form = setupForm()
  form.form.value.innerHTML =
    '<label>Email<input name="email" type="email" aria-describedby="hint"></label>'
  form.props.error = 'Admin Email: Email is already registered.\nUnknown field: Fix this too.'
  await vue.nextTick()
  await vue.nextTick()
  assert.equal(form.issues.value.length, 1)
  const input = form.form.value.querySelector('input')
  assert.match(input.getAttribute('aria-describedby'), /^hint test-0-field$/)
  input.value = 'other@example.com'
  form.update({ target: input })
  assert.equal(input.getAttribute('aria-describedby'), 'hint')
  form.stop()
})
test('backend vital and patient limits are shared', () => {
  const { vitalConstraints, patientConstraints } = moduleSource('app/utils/validation.ts')
  assert.deepEqual(vitalConstraints.temperature, { min: 90, max: 115, step: 'any' })
  assert.equal(patientConstraints.phone.maxlength, 20)
  assert.equal(patientConstraints.age.max, 150)
})

test('disabled submit controls and events from another form cannot trigger a save', () => {
  const form = setupForm()
  form.form.value.innerHTML = '<button type="submit" disabled>Save</button>'
  form.validate({ target: form.form.value })
  assert.equal(form.emitted.length, 0)
  form.form.value.querySelector('button').disabled = false
  form.validate({ target: {} })
  assert.equal(form.emitted.length, 0)
  form.validate({ target: form.form.value })
  form.validate({ target: form.form.value })
  assert.equal(form.emitted.length, 1)
  form.stop()
})

test('field errors appear while typing and on blur before the first submission', () => {
  const form = setupForm()
  form.form.value.innerHTML =
    '<label>Email<input name="email" type="email" required></label><label>Phone<input name="phone" type="tel" data-min-digits="10" data-max-digits="15"></label>'
  const email = form.form.value.querySelector('[name=email]')
  const phone = form.form.value.querySelector('[name=phone]')
  form.update({ target: email, type: 'focusout' })
  assert.match(form.issues.value[0].message, /required/)
  email.value = 'bad-email'
  form.update({ target: email, type: 'input' })
  assert.match(form.issues.value[0].message, /valid email/)
  phone.value = '123'
  form.update({ target: phone, type: 'input' })
  assert.match(form.issues.value.find((item) => item.control === phone).message, /10 to 15 digits/)
  form.validate({ target: form.form.value })
  assert.equal(form.emitted.length, 0)
  phone.value = '+91 98765 43210'
  email.value = 'alex@example.com'
  form.update({ target: phone, type: 'input' })
  form.update({ target: email, type: 'input' })
  assert.equal(form.issues.value.length, 0)
  form.validate({ target: form.form.value })
  assert.equal(form.emitted.length, 1)
  form.stop()
})

test('confirmation, schedule ordering, and future dates block submission locally', () => {
  const form = setupForm()
  form.form.value.innerHTML =
    '<input name="password" value="correct"><input name="confirmation" value="wrong" data-matches="password"><input name="start" type="time" value="13:00"><input name="end" type="time" value="12:00" data-after="start"><input name="date" type="datetime-local" value="2000-01-01T10:00" data-future>'
  form.validate({ target: form.form.value })
  assert.equal(form.emitted.length, 0)
  assert.equal(form.issues.value.length, 3)
  const password = form.form.value.querySelector('[name=password]')
  password.value = 'wrong'
  form.update({ target: password, type: 'input' })
  assert.equal(form.issues.value.length, 2)
  form.stop()
})
