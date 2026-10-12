import { usePlatformAccess } from '~/composables/platform/usePlatformAccess'
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  const auth = usePlatformAuth()
  const access = usePlatformAccess()
  try {
    await auth.initialize()
    if (!auth.isAuthenticated.value) return navigateTo('/platform/login')
  } catch {
    access.user.value = null
    return navigateTo('/platform/login?session=unavailable')
  }
})
