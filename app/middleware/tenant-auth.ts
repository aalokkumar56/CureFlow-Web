export default defineNuxtRouteMiddleware(async () => {
  // Tenant sessions intentionally live in localStorage to preserve the legacy
  // auth contract. They are unavailable during SSR, so enforcing this guard on
  // the server would redirect a valid browser session before hydration.
  if (import.meta.server) {
    return
  }

  const auth = useTenantAuth()

  if (auth.loading.value) {
    await auth.initialize()
  }

  if (!auth.isAuthenticated.value) {
    return navigateTo('/login')
  }
})
