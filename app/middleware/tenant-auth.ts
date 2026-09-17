export default defineNuxtRouteMiddleware(async () => {
  const auth = useTenantAuth()

  try {
    await auth.refreshSession()
  } catch {
    auth.token.value = null
    auth.user.value = null
    auth.tenant.value = null
      // Any failed session validation must end in the login flow. This avoids
      // exposing an internal validation error page for expired or unavailable
      // sessions and guarantees a clean authentication state.
      return navigateTo('/login')
  }
})
