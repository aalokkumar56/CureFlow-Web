import { createHash } from 'node:crypto'
import { createError, deleteCookie, getCookie, getHeader, getRequestURL, setCookie, type H3Event } from 'h3'
import { backendBaseUrl, fetchBackend } from './backend'

// The current CureFlow API issues a JWT access token. Refresh-token fields are
// optional so the frontend also remains compatible if a future API adds them.
type Tokens = { access_token: string; refresh_token?: string; refresh_expires_at?: string }
const cookies = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' }
// Share one rotation across concurrent requests from the same browser.
const rotations = new Map<string, Promise<Tokens>>()
export function assertSessionOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')
  if (getHeader(event, 'sec-fetch-site') === 'cross-site' || (origin && origin !== getRequestURL(event).origin))
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request rejected' })
}
export function clearSessionCookies(event: H3Event) {
  deleteCookie(event, 'cureflow_session', { path: '/' })
  deleteCookie(event, 'cureflow_refresh', { path: '/' })
}
export function setSessionCookies(event: H3Event, tokens: Tokens) {
  if (!tokens.access_token)
    throw createError({ statusCode: 502, statusMessage: 'Invalid authentication response' })
  setCookie(event, 'cureflow_session', tokens.access_token, { ...cookies, maxAge: 3600 })
  if (tokens.refresh_token && tokens.refresh_expires_at && Number.isFinite(Date.parse(tokens.refresh_expires_at))) {
    setCookie(event, 'cureflow_refresh', tokens.refresh_token, { ...cookies, expires: new Date(tokens.refresh_expires_at) })
  } else {
    deleteCookie(event, 'cureflow_refresh', { path: '/' })
  }
}
export async function sessionAccessToken(event: H3Event): Promise<string | undefined> {
  const refresh = getCookie(event, 'cureflow_refresh')
  const access = getCookie(event, 'cureflow_session')
  if (access) {
    try {
      const claims = JSON.parse(Buffer.from(access.split('.')[1]!, 'base64url').toString())
      if (typeof claims.exp === 'number' && claims.exp * 1000 > Date.now() + 30000) return access
    } catch { /* Refresh malformed or expired access cookies. */ }
  }
  // This backend currently has no refresh endpoint. Expired sessions must sign in again.
  if (!refresh) {
    clearSessionCookies(event)
    return undefined
  }
  const key = createHash('sha256').update(refresh).digest('hex')
  let pending = rotations.get(key)
  if (!pending) {
    pending = fetchBackend<Tokens>(`${backendBaseUrl(event)}/auth/refresh`, {
      method: 'POST', body: { refresh_token: refresh }, retry: 0,
    })
    rotations.set(key, pending)
    void pending.finally(() => { setTimeout(() => rotations.delete(key), 5000).unref() }).catch(() => {})
  }
  try {
    const tokens = await pending
    setSessionCookies(event, tokens)
    return tokens.access_token
  } catch (error: any) {
    if (error.statusCode === 401 || error.status === 401) {
      clearSessionCookies(event)
      throw createError({ statusCode: 401, statusMessage: 'Session expired. Please sign in.' })
    }
    throw createError({ statusCode: 503, statusMessage: 'Session service unavailable' })
  }
}
