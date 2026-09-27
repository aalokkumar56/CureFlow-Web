import { usePlatformAccess } from '~/composables/platform/usePlatformAccess'
export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  const auth = usePlatformAuth()
  auth.initialize()
  if (!auth.isAuthenticated.value) return navigateTo('/platform/login')
  const access = usePlatformAccess()
  try {
    await access.refresh()
  } catch {
    access.user.value = null
    return navigateTo('/platform/login')
  }
})
