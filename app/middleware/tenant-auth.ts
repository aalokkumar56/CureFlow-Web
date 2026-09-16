export default defineNuxtRouteMiddleware(async () => {
  const auth = useTenantAuth()

  try {
    await auth.refreshSession()
  } catch (error: any) {
    auth.token.value = null
    auth.user.value = null
    auth.tenant.value = null
    if (error.statusCode === 401 || error.status === 401) return navigateTo('/login')
    throw createError({ statusCode: 503, statusMessage: 'Unable to validate your session. Please retry.' })
  }
})
