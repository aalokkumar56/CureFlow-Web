import { getCookie } from 'h3'
import { backendBaseUrl, fetchBackend } from '../../utils/backend'
import { assertSessionOrigin, clearSessionCookies } from '../../utils/session'

export default defineEventHandler(async (event) => {
  assertSessionOrigin(event)
  const token = getCookie(event, 'cureflow_refresh')
  if (token) await fetchBackend(`${backendBaseUrl(event)}/auth/logout`, { method: 'POST', body: { refresh_token: token }, retry: 0 })
  clearSessionCookies(event)
  return { ok: true }
})
