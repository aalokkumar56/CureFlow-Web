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