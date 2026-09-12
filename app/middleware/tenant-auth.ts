export default defineNuxtRouteMiddleware(async () => {
  const auth = useTenantAuth()

  if (auth.loading.value) {
    await auth.initialize()
  }

  if (!auth.isAuthenticated.value) {
    return navigateTo('/login')
  }
})