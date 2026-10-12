import { prepareClinicalNavigation } from '~/utils/clinical-navigation'
import { useTenantModules } from '~/composables/tenant/useTenantModules'
import { tenantModuleForPath } from '~/utils/tenant-modules'

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.client && !(await prepareClinicalNavigation())) return abortNavigation()
  const auth = useTenantAuth()
  const modules = useTenantModules()

  try {
    await auth.refreshSession()
    await modules.load(true)
    const required = tenantModuleForPath(to.path)
    if (required && !modules.canAccess(required)) {
      return navigateTo(modules.firstAvailableRoute())
    }
  } catch {
    if (import.meta.client && auth.identity.value) return abortNavigation()
    auth.reset()
    return navigateTo('/login?session=unavailable')
  }
})
