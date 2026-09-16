import { authStorage } from '~/utils/auth/storage'

export default defineNuxtPlugin((nuxtApp) => {
  authStorage.clear()
  const auth = useTenantAuth()
  let pending = false
  const check = async () => {
    if (pending || !auth.isAuthenticated.value || document.hidden) return
    pending = true
    try { await nuxtApp.runWithContext(() => auth.refreshSession()) }
    catch (error: any) {
      if (error.statusCode === 401 || error.status === 401) {
        auth.token.value = null
        auth.user.value = null
        auth.tenant.value = null
        await nuxtApp.runWithContext(() => navigateTo('/login'))
      }
    } finally { pending = false }
  }
  const timer = window.setInterval(check, 60000)
  window.addEventListener('focus', check)
  if (import.meta.hot) import.meta.hot.dispose(() => {
    clearInterval(timer)
    window.removeEventListener('focus', check)
  })
})
