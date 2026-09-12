// import { authStorage } from '~/utils/auth/storage'
// import { apiPost } from '~/utils/api/client'

// export const usePlatformAuth = () => {
//   const token = useState<string | null>('platform-auth-token', () => null)
//   const user = useState<any | null>('platform-auth-user', () => null)

//   const initialize = () => {
//     if (!import.meta.client) return

//     token.value = localStorage.getItem('cureflow_platform_token')

//     const storedUser = localStorage.getItem('cureflow_platform_user')

//     if (storedUser) {
//       try {
//         user.value = JSON.parse(storedUser)
//       } catch {
//         user.value = null
//       }
//     }
//   }

//   const login = async (credentials: Record<string, unknown>) => {
//     const response = await apiPost<any>(
//       '/platform/auth/login',
//       credentials,
//     )

//     const sessionToken = response.token ?? response.access_token

//     if (!sessionToken) {
//       throw new Error('Platform authentication token was not returned')
//     }

//     token.value = sessionToken
//     user.value = response.user ?? null

//     if (import.meta.client) {
//       localStorage.setItem('cureflow_platform_token', sessionToken)

//       if (response.user) {
//         localStorage.setItem(
//           'cureflow_platform_user',
//           JSON.stringify(response.user),
//         )
//       }
//     }

//     return response
//   }

//   const logout = (redirect = true) => {
//     token.value = null
//     user.value = null

//     if (import.meta.client) {
//       localStorage.removeItem('cureflow_platform_token')
//       localStorage.removeItem('cureflow_platform_user')
//     }

//     if (redirect && import.meta.client) {
//       navigateTo('/platform/login')
//     }
//   }

//   const isAuthenticated = computed(() => !!token.value)

//   return {
//     token,
//     user,
//     loading: ref(false),
//     isAuthenticated,
//     initialize,
//     login,
//     logout,
//   }
// }

import {
  fetchPlatformSetupStatus,
  platformBootstrap,
  platformLogin,
  platformLogout,
} from '~/utils/auth/platformClient'

export const usePlatformAuth = () => {
  const token = useState<string | null>(
    'platform-auth-token',
    () => null,
  )

  const user = useState<any | null>(
    'platform-auth-user',
    () => null,
  )

  const initialize = () => {
    if (!import.meta.client) return

    token.value = localStorage.getItem(
      'cureflow_platform_token',
    )
  }

  const login = async (
    email: string,
    password: string,
  ) => {
    const response = await platformLogin(email, password)

    token.value = response.access_token

    return response
  }

  const bootstrap = async (data: {
    name: string
    email: string
    password: string
  }) => {
    const response = await platformBootstrap(data)

    token.value = response.access_token

    return response
  }

  const setupStatus = () =>
    fetchPlatformSetupStatus()

  const logout = () => {
    token.value = null
    user.value = null
    platformLogout()
  }

  const isAuthenticated = computed(
    () => !!token.value,
  )

  return {
    token,
    user,
    isAuthenticated,
    initialize,
    login,
    bootstrap,
    setupStatus,
    logout,
  }
}