export default defineNuxtRouteMiddleware(async () => {
  const auth = useTenantAuth()

  if (import.meta.server) {
    const cookieHeader = useRequestHeaders(['cookie']).cookie || ''
    if (!cookieHeader.includes('cureflow_session=')) return
    try { await auth.refreshSession(); auth.token.value = 'cookie-session' } catch { return navigateTo('/login') }
    return
  }

  if (auth.loading.value) {
    await auth.initialize()
  }

  if (!auth.isAuthenticated.value) {
    return navigateTo('/login')
  }
})
