<script setup lang="ts">
import { hasUnsavedClinicalWork } from '~/utils/clinical-navigation'
import { normalizeApiError } from '~/utils/api/errors'
import { useTenantModules } from '~/composables/tenant/useTenantModules'
const auth = useTenantAuth()
const modules = useTenantModules()
const locked = computed(() => auth.authority.value !== 'verified')
const busy = ref(false)
const error = ref('')
const form = reactive({ email: '', password: '' })
const message = computed(() => ({
  checking: 'Checking your session…', expired: 'Your session ended. Sign in again to continue.',
  unavailable: 'Session verification is temporarily unavailable. Protected work is paused.',
  changed: 'A different user or hospital signed in. Local work cannot be transferred to that session.',
  restricted: 'Your permissions changed. Local work remains locked until access is restored or you discard it.',
  verified: '',
})[auth.authority.value])
async function verify() {
  busy.value = true; error.value = ''
  try { await auth.refreshSession(); await modules.load(true) }
  catch (cause) { if (auth.authority.value === 'verified') auth.lock('unavailable'); error.value = normalizeApiError(cause, 'Could not verify this session. Try again.') }
  finally { busy.value = false }
}
async function signIn() {
  busy.value = true; error.value = ''
  try { await auth.login({ email: form.email, password: form.password }); await modules.load(true) }
  catch (cause) { if (auth.authority.value === 'verified') auth.lock('unavailable'); error.value = normalizeApiError(cause, 'Sign-in failed. Your local work remains locked.') }
  finally { busy.value = false; form.password = '' }
}
async function discardAndSignOut() {
  if (hasUnsavedClinicalWork() && !window.confirm('Discard unsynchronized local clinical work and sign out? This cannot be undone.')) return
  busy.value = true; error.value = ''
  try { await auth.logout(true, true) }
  catch { error.value = 'Sign-out could not be confirmed. Check your connection and try again.' }
  finally { busy.value = false }
}
function checkOnReturn() {
  if (!document.hidden && auth.authority.value === 'verified') void verify()
}
onMounted(() => document.addEventListener('visibilitychange', checkOnReturn))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', checkOnReturn))
</script>
<template>
  <section v-if="locked" class="auth-card" role="alert" aria-live="polite">
    <h1>Workspace locked</h1>
    <p>{{ message }}</p>
    <p>Unsynchronized work stays in memory on this page. It can resume only for the same verified user, hospital and patient.</p>
    <p v-if="error">{{ error }}</p>
    <ValidatedForm v-if="auth.authority.value === 'expired'" class="auth-form" :error="error" @submit.prevent="signIn">
      <label>Email address<input v-model.trim="form.email" name="email" type="email" autocomplete="username" required :disabled="busy" /></label>
      <label>Password<input v-model="form.password" name="password" type="password" autocomplete="current-password" required :disabled="busy" /></label>
      <button type="submit" class="auth-submit" :disabled="busy">Sign in and recover work</button>
    </ValidatedForm>
    <button type="button" class="patients-secondary-btn" :disabled="busy || auth.authority.value === 'checking'" @click="verify">Check session again</button>
    <button type="button" class="patients-secondary-btn" :disabled="busy" @click="discardAndSignOut">Discard local work and sign out</button>
  </section>
  <div :key="auth.viewGeneration.value" v-show="!locked" :inert="locked" :aria-hidden="locked || undefined"><slot /></div>
</template>
