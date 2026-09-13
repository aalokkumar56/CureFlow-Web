// import { authStorage } from '~/utils/auth/storage'
// import type { TenantLoginResponse, TenantSession} from '~/types/auth'

// export const useTenantAuth = () => {

//   const token = useState<string | null>('tenant-auth-token', () => null)
//   const user = useState<any | null>('tenant-auth-user', () => null)
//   const tenant = useState<any | null>('tenant-auth-tenant', () => null)
//   const loading = useState('tenant-auth-loading', () => true)

//   const { $api } = useNuxtApp()

//   const initialize = async () => {
//     if (!import.meta.client) return

//     token.value = authStorage.getToken()
//     user.value = authStorage.getUser()
//     tenant.value = authStorage.getTenant()

//     if (!token.value) {
//       loading.value = false
//       return
//     }

//     try {
//       const session = await $api.get<TenantSession>('/auth/session')

//       if (session) {
//         user.value = session.user ?? session
//         tenant.value = session.tenant ?? tenant.value

//         authStorage.setSession(
//           token.value,
//           user.value,
//           tenant.value,
//         )
//       }
//     } catch {
//       logout(false)
//     } finally {
//       loading.value = false
//     }
//   }

//   const login = async (credentials: Record<string, unknown>) => {
//     const response = await $api.post<TenantLoginResponse>('/auth/login', credentials)

//     const sessionToken = response.access_token
//     const sessionUser = response.user
//     const sessionTenant = response.tenant

//     if (!sessionToken) {
//       throw new Error('Authentication token was not returned by the server')
//     }

//     token.value = sessionToken
//     user.value = sessionUser ?? null
//     tenant.value = sessionTenant ?? null

//     authStorage.setSession(
//       sessionToken,
//       sessionUser,
//       sessionTenant,
//     )

//     return response
//   }

//   const logout = (redirect = true) => {
//     token.value = null
//     user.value = null
//     tenant.value = null

//     authStorage.clear()

//     if (redirect && import.meta.client) {
//       navigateTo('/login')
//     }
//   }

//   const isAuthenticated = computed(() => !!token.value)

//   return {
//     token,
//     user,
//     tenant,
//     loading,
//     isAuthenticated,
//     initialize,
//     login,
//     logout,
//   }
// }

import { authStorage } from '~/utils/auth/storage'
import type {
  TenantLoginResponse,
  TenantSession,
  TenantUser,
} from '~/types/auth'

export const useTenantAuth = () => {
  const { $api } = useNuxtApp()

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

    // The current backend does not expose /auth/session. The legacy contract
    // stores the complete session locally during login, so use that cached
    // session instead of making a request that always returns 404.
    loading.value = false
  }

  const login = async (
    credentials: Record<string, unknown>,
  ) => {
    const response =
      await $api.post<TenantLoginResponse>(
        '/auth/login',
        credentials,
      )

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

  const logout = (redirect = true) => {
    token.value = null
    user.value = null
    tenant.value = null

    authStorage.clear()

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
    login,
    logout,
  }
}
