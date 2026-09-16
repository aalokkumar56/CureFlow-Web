import { authStorage } from '~/utils/auth/storage'
import type {
  TenantSession,
  TenantUser,
} from '~/types/auth'

export const useTenantAuth = () => {
  const token = useState<string | null>(
    'tenant-auth-token',
    () => null,
  )

  const user = useState<TenantUser | null>(
    'tenant-auth-user',
    () => null,
  )

  const tenant = useState<TenantSession['tenant'] | null>(
    'tenant-auth-tenant',
    () => null,
  )

  const loading = useState(
    'tenant-auth-loading',
    () => true,
  )

  const initialize = async () => {
    if (!import.meta.client) return

    authStorage.clear()
    try { await refreshSession() }
    catch { token.value = null; user.value = null; tenant.value = null }
    finally { loading.value = false }
  }

  const login = async (
    credentials: Record<string, unknown>,
  ) => {
    const response = await $fetch<TenantSession>('/api/auth/login', {
      method: 'POST',
      body: credentials,
      credentials: 'include',
    })

    token.value = 'cookie-session'
    user.value = response.user
    tenant.value = response.tenant

    authStorage.clear()
    loading.value = false

    return response
  }

  const refreshSession = async () => {
    const event = import.meta.server ? useRequestEvent() : undefined
    const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
    const response = await $fetch.raw<TenantSession>('/api/auth/session', { credentials: 'include', headers })
    if (import.meta.server && event) {
      const { appendResponseHeader } = await import('h3')
      for (const cookie of response.headers.getSetCookie()) appendResponseHeader(event, 'set-cookie', cookie)
    }
    const session = response._data!
    user.value = session.user
    tenant.value = session.tenant
    token.value = 'cookie-session'
    loading.value = false
    return session
  }

  const logout = async (redirect = true) => {
    if (import.meta.client) await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    token.value = null
    user.value = null
    tenant.value = null

    authStorage.clear()
    if (import.meta.client) {
      for (const key of ['dashboard-overview', 'tenant-patient-total', 'notifications-unread-count', 'notifications-items']) clearNuxtState(key)
    }

    if (redirect && import.meta.client) {
      navigateTo('/login')
    }
  }

  const isAuthenticated = computed(
    () => !!token.value,
  )

  return {
    token,
    user,
    tenant,
    loading,
    isAuthenticated,
    initialize,
    refreshSession,
    login,
    logout,
  }
}
