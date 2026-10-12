import { authStorage } from '~/utils/auth/storage'
import { useTenantModules } from '~/composables/tenant/useTenantModules'
import { hasUnsavedClinicalWork, prepareClinicalNavigation } from '~/utils/clinical-navigation'
import type { TenantSession, TenantUser } from '~/types/auth'
import { requestFeedback } from '~/utils/api/retry-feedback'
import { notifySessionChange } from '~/utils/auth/session-events'

export type TenantAuthority = 'checking' | 'verified' | 'expired' | 'unavailable' | 'changed' | 'restricted'
const requests = new WeakMap<object, { pending?: Promise<TenantSession> }>()
export const useTenantAuth = () => {
  const app = useNuxtApp()
  const feedback = requestFeedback(app)
  const modules = useTenantModules()
  if (!requests.has(app)) requests.set(app, {})
  const request = requests.get(app)!
  const token = useState<string | null>('tenant-auth-token', () => null)
  const user = useState<TenantUser | null>('tenant-auth-user', () => null)
  const tenant = useState<TenantSession['tenant'] | null>('tenant-auth-tenant', () => null)
  const loading = useState('tenant-auth-loading', () => true)
  const authority = useState<TenantAuthority>('tenant-auth-authority', () => 'checking')
  const identity = useState<string | null>('tenant-auth-identity', () => null)
  const epoch = useState('tenant-auth-epoch', () => 0)
  const viewGeneration = useState('tenant-auth-view-generation', () => 0)
  const lock = (reason: Exclude<TenantAuthority, 'verified'>) => {
    authority.value = reason
    epoch.value++
  }
  const clearProtectedViews = () => app.runWithContext(() => {
    for (const [key, value] of Object.entries({
      'dashboard-overview': null, 'dashboard-loading': false, 'dashboard-error': null,
      'tenant-appointments': [], 'tenant-appointment-options': { doctors: [], departments: [] },
      'tenant-appointments-loading': false, 'tenant-appointments-error': null,
      'tenant-patient-total': 0, 'tenant-lead-total': 0,
      'notifications-unread-count': 0, 'notifications-items': [], 'notifications-loading': false,
      'app-toasts': [],
    })) useState(key).value = value
    clearNuxtData(key => !key.startsWith('platform'))
  })
  const reset = () => {
    lock('expired')
    token.value = null; user.value = null; tenant.value = null; identity.value = null
    modules.reset(); authStorage.clear(); viewGeneration.value++
    clearProtectedViews()
  }
  const apply = (session: TenantSession) => {
    if (!session?.user?.id || typeof session.tenant?.id !== 'string' || !Array.isArray(session.user.permissions))
      throw new Error('Session verification returned incomplete authority. Please try again.')
    const next = `${session.tenant.id}:${session.user.id}`
    if (identity.value && identity.value !== next) {
      lock('changed')
      modules.reset()
      clearProtectedViews()
      if (!import.meta.client || !hasUnsavedClinicalWork()) viewGeneration.value++
      throw new Error('A different user or hospital signed in. Discard local work and sign out before continuing.')
    }
    if (import.meta.client && hasUnsavedClinicalWork() &&
        user.value?.permissions?.some(permission => !session.user.permissions!.includes(permission))) {
      lock('restricted')
      throw new Error('Your permissions changed. Local work remains locked until access is restored or you discard it.')
    }
    identity.value = next; user.value = session.user; tenant.value = session.tenant
    token.value = 'cookie-session'; authority.value = 'verified'; loading.value = false
    authStorage.clear()
    return session
  }
  const refreshSession = async () => {
    if (request.pending) return request.pending
    const event = import.meta.server ? useRequestEvent() : undefined
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    lock('checking')
    const current = epoch.value
    request.pending = (async () => {
      try {
        const response = await $fetch.raw<TenantSession>('/api/auth/session', { credentials: 'include', headers, retry: 0, timeout: 15000 })
        if (import.meta.server && event) {
          const { appendResponseHeader } = await import('h3')
          for (const cookie of response.headers.getSetCookie()) appendResponseHeader(event, 'set-cookie', cookie)
        }
        if (epoch.value !== current) throw new Error('Session changed while verification was in progress.')
        return apply(response._data!)
      } catch (error: any) {
        if (authority.value === 'checking' && epoch.value === current)
          lock((error.statusCode || error.status) === 401 ? 'expired' : 'unavailable')
        throw error
      } finally { request.pending = undefined; loading.value = false }
    })()
    return request.pending
  }
  const initialize = async () => {
    if (!import.meta.client) return
    authStorage.clear()
    try { await refreshSession() } catch { /* The guarded view presents recovery without discarding text. */ }
  }
  const login = async (credentials: Record<string, unknown>) => {
    feedback.check('tenant:login')
    let response: TenantSession
    try {
      response = await $fetch<TenantSession>('/api/auth/login', {
        method: 'POST', body: credentials, credentials: 'include', retry: 0, timeout: 15000,
      })
    } catch (error) { feedback.record('tenant:login', error); throw error }
    notifySessionChange('tenant')
    modules.reset()
    return apply(response)
  }
  const logout = async (redirect = true, discard = false) => {
    if (!discard && import.meta.client && !await prepareClinicalNavigation()) return
    const result = import.meta.client
      ? await $fetch<{ signedOut: boolean; revoked: boolean }>('/api/auth/logout', { method: 'POST', credentials: 'include', retry: 0, timeout: 20000 })
      : { signedOut: true, revoked: true }
    if (!result.signedOut) throw new Error('Sign-out could not be confirmed. Please try again.')
    reset()
    notifySessionChange('tenant')
    if (redirect && import.meta.client) await navigateTo(result.revoked ? '/login' : '/login?logout=local-only')
    return result
  }
  return { token, user, tenant, loading, authority, identity, epoch, viewGeneration, lock, reset,
    isAuthenticated: computed(() => authority.value === 'verified' && !!token.value), initialize, refreshSession, login, logout }
}
