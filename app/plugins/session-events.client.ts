import { sessionEventChannel, sessionEventSender, type SessionKind } from '~/utils/auth/session-events'
import { clearPlatformState } from '~/utils/auth/platformClient'

export default defineNuxtPlugin(app => {
  if (typeof BroadcastChannel === 'undefined') return
  const auth = useTenantAuth()
  const platformUser = useState('platform-current-user')
  const channels = (['tenant', 'platform'] as SessionKind[]).map(kind => {
    const channel = new BroadcastChannel(sessionEventChannel(kind))
    channel.onmessage = event => {
      if (!event.data || typeof event.data.sender !== 'string' || event.data.sender === sessionEventSender) return
      if (kind === 'tenant' && auth.identity.value) {
        // Refresh also locks/aborts immediately. A new principal cannot inherit
        // this tab's retained work even when cookies changed in another tab.
        void app.runWithContext(auth.refreshSession).catch(() => {})
      } else if (kind === 'platform' && platformUser.value) {
        app.runWithContext(clearPlatformState)
        if (window.location.pathname.startsWith('/platform'))
          void app.runWithContext(() => navigateTo('/platform/login?session=changed'))
      }
    }
    return channel
  })
  const close = () => channels.forEach(channel => channel.close())
  app.vueApp.onUnmount(close)
  import.meta.hot?.dispose(close)
})
