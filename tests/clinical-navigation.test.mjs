import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import assert from 'node:assert/strict'
import ts from 'typescript'

function loadNavigationModule() {
  const code = ts.transpileModule(
    readFileSync(new URL('../app/utils/clinical-navigation.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText
  const module = { exports: {} }
  runInNewContext(code, { module, exports: module.exports })
  return module.exports
}

test('registered clinical navigation handlers block when a save fails', async () => {
  const nav = loadNavigationModule()
  const unregister = nav.registerClinicalNavigation(async () => false, () => true)

  assert.equal(nav.hasUnsavedClinicalWork(), true)
  assert.equal(await nav.prepareClinicalNavigation(), false)

  unregister()
  assert.equal(nav.hasUnsavedClinicalWork(), false)
  assert.equal(await nav.prepareClinicalNavigation(), true)
})

test('clinical navigation waits for every registered save handler', async () => {
  const nav = loadNavigationModule()
  const calls = []
  nav.registerClinicalNavigation(async () => { calls.push('first'); return true }, () => true)
  nav.registerClinicalNavigation(async () => { calls.push('second'); return true }, () => false)

  assert.equal(await nav.prepareClinicalNavigation(), true)
  assert.deepEqual(calls, ['first', 'second'])
  assert.equal(nav.hasUnsavedClinicalWork(), true)
})
