import { platformSession } from '../../utils/auth/platformClient'
import type { PlatformUser } from '~/utils/platform'
export const usePlatformAccess = () => {
  const user = useState<PlatformUser | null>('platform-current-user', () => null)
  const can = (permission: string) => Boolean(user.value?.permissions.includes(permission))
  const refresh = async () => {
    user.value = (await platformSession()).user
    return user.value
  }
  return { user, can, refresh }
}
