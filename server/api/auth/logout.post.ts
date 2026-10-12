import { getCookie, setResponseHeader } from 'h3'
import { backendBaseUrl, fetchBackend } from '../../utils/backend'
import { assertSessionOrigin, clearSessionCookies } from '../../utils/session'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  assertSessionOrigin(event)
  const token = getCookie(event, 'cureflow_refresh')
  const access = getCookie(event, 'cureflow_session')
  clearSessionCookies(event)
  // Revoke the actual persisted refresh family; local cookie removal alone
  // cannot certify that a copied credential was revoked.
  if (token) {
    try {
      await fetchBackend(`${backendBaseUrl(event)}/auth/logout`, { method: 'POST', body: { refresh_token: token }, retry: 0, timeout: 15000, redirect: 'error' })
    } catch (error: any) {
      return { signedOut: true, revoked: (error.statusCode || error.status) === 401 }
    }
  }
  return { signedOut: true, revoked: Boolean(token) || !access }
})
