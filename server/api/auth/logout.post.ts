import { getCookie } from 'h3'
import { backendBaseUrl, fetchBackend } from '../../utils/backend'
import { assertSessionOrigin, clearSessionCookies } from '../../utils/session'

export default defineEventHandler(async (event) => {
  assertSessionOrigin(event)
  const token = getCookie(event, 'cureflow_refresh')
  clearSessionCookies(event)
  // Current CureFlow sessions are access-token-only. If a future backend adds
  // refresh-token revocation, do not let an unavailable endpoint block logout.
  if (token) {
    try {
      await fetchBackend(`${backendBaseUrl(event)}/auth/logout`, { method: 'POST', body: { refresh_token: token }, retry: 0 })
    } catch { /* Local cookie removal is sufficient for stateless JWT sessions. */ }
  }
  return { ok: true }
})
