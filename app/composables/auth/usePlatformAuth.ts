import { clearPlatformState, fetchPlatformSetupStatus, platformBootstrap, platformLogin, platformLogout, platformSession } from '../../utils/auth/platformClient'
import type { PlatformUser } from '~/utils/platform'

export const usePlatformAuth = () => {
  const user = useState<PlatformUser | null>('platform-current-user', () => null)
  const initialize = async () => {
    if (!import.meta.client) return
    localStorage.removeItem('cureflow_platform_token')
    sessionStorage.removeItem('cureflow_platform_token')
    try { user.value = (await platformSession()).user }
    catch (error: any) {
      clearPlatformState()
      if (error.response?.status !== 401) throw error
    }
  }
  const login = async (email: string, password: string) => {
    const response = await platformLogin(email, password)
    user.value = response.user
    return response
  }
  const bootstrap = async (data: { name: string; email: string; password: string }) => {
    const response = await platformBootstrap(data)
    user.value = response.user
    return response
  }
  return { user, isAuthenticated: computed(() => !!user.value), initialize, login, bootstrap,
    setupStatus: fetchPlatformSetupStatus, logout: platformLogout }
}
