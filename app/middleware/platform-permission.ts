export default defineNuxtRouteMiddleware(() => {
  const auth = usePlatformAuth()

  auth.initialize()

  if (!auth.isAuthenticated.value) {
    return navigateTo('/platform/login')
  }
})