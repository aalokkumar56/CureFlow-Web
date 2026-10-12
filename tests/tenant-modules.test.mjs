import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

function harness(fetch) {
  const states = new Map()
  const app = {}
  const module = { exports: {} }
  const code = ts.transpileModule(
    readFileSync(new URL('../app/composables/tenant/useTenantModules.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText
  runInNewContext(code, {
    module,
    exports: module.exports,
    require: () => ({
      tenantModuleLandingRoutes: { patients: '/patients', communications: '/inbox' },
    }),
    useNuxtApp: () => app,
    useRequestFetch: () => fetch,
    useState: (key, init) => {
      if (!states.has(key)) states.set(key, { value: init() })
      return states.get(key)
    },
  })
  return module.exports.useTenantModules
}

test('refresh uses authenticated request fetch and picks up newly enabled modules', async () => {
  let calls = 0
  const useModules = harness(async (url, options) => {
    assert.equal(url, '/api/bff/tenant/modules')
    assert.equal(options.credentials, 'include')
    return { enabled_keys: ++calls === 1 ? ['patients'] : ['patients', 'communications'] }
  })
  const modules = useModules()
  await modules.load()
  assert.equal(modules.canAccess('communications'), false)
  await modules.load(true)
  assert.equal(modules.canAccess('communications'), true)
})

test('concurrent callers wait for the same access request', async () => {
  let complete
  let calls = 0
  const useModules = harness(() => {
    calls++
    return new Promise((resolve) => {
      complete = resolve
    })
  })
  const first = useModules()
  const second = useModules()
  const a = first.load()
  let finished = false
  const b = second.load().then(() => {
    finished = true
  })
  await Promise.resolve()
  assert.equal(finished, false)
  assert.equal(calls, 1)
  complete({ enabled_keys: ['communications'] })
  await Promise.all([a, b])
  assert.equal(second.canAccess('communications'), true)
})

test('account reset discards cached access and ignores the previous session response', async () => {
  const completions = []
  const useModules = harness(() => new Promise((resolve) => completions.push(resolve)))
  const modules = useModules()
  const oldRequest = modules.load()
  modules.reset()
  const newRequest = modules.load()
  completions[1]({ enabled_keys: ['communications'] })
  await newRequest
  completions[0]({ enabled_keys: ['patients'] })
  await oldRequest
  assert.equal(modules.canAccess('communications'), true)
  assert.equal(modules.canAccess('patients'), false)
  modules.reset()
  assert.equal(modules.loaded.value, false)
  assert.equal(modules.enabled.value.length, 0)
})

test('failed access requests can be retried', async () => {
  let calls = 0
  const modules = harness(async () => {
    if (++calls === 1) throw new Error('Unavailable')
    return { enabledKeys: ['communications'] }
  })()
  await assert.rejects(modules.load(), /Unavailable/)
  await modules.load()
  assert.equal(modules.canAccess('communications'), true)
})
