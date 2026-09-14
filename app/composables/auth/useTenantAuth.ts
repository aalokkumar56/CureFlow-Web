import { authStorage } from '~/utils/auth/storage'
import type {
  TenantLoginResponse,
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

    token.value = authStorage.getToken()
    user.value = authStorage.getUser()
    tenant.value = authStorage.getTenant()

    if (!token.value) {
      loading.value = false
      return
    }

    // Restore the cached session immediately; lifecycle pages explicitly refresh server state.
    loading.value = false
  }

  const login = async (
    credentials: Record<string, unknown>,
  ) => {
    const response = await $fetch<TenantLoginResponse>('/api/auth/login', {
      method: 'POST',
      body: credentials,
      credentials: 'include',
    })

    if (!response.access_token) {
      throw new Error(
        'Authentication token was not returned by the server',
      )
    }

    token.value = response.access_token
    user.value = response.user
    tenant.value = response.tenant

    authStorage.setSession(
      response.access_token,
      response.user,
      response.tenant,
    )

    return response
  }

  const refreshSession = async () => {
    const session = await $fetch<TenantSession>('/api/auth/session', { credentials: 'include' })
    user.value = session.user
    tenant.value = session.tenant
    if (token.value && token.value !== 'cookie-session') authStorage.setSession(token.value, session.user, session.tenant)
    return session
  }

  const logout = async (redirect = true) => {
    token.value = null
    user.value = null
    tenant.value = null

    authStorage.clear()
    if (import.meta.client) {
      await $fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => undefined)
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
