import { platformGet } from '../../utils/auth/platformClient'
import type { PlatformUser } from '~/utils/platform'
export const usePlatformAccess = () => {
  const user = useState<PlatformUser | null>('platform-current-user', () => null)
  const can = (permission: string) => Boolean(user.value?.permissions.includes(permission))
  const refresh = async () => {
    user.value = await platformGet<PlatformUser>('/platform/me')
    return user.value
  }
  return { user, can, refresh }
}
