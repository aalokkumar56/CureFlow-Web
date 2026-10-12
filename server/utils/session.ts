import { createHash } from 'node:crypto'
import { createError, deleteCookie, getCookie, getHeader, getMethod, setCookie, type H3Event } from 'h3'
import { backendBaseUrl, fetchBackend } from './backend'

// Credentials remain in server-controlled cookies, including refresh families.
type Tokens = { access_token: string; refresh_token?: string; refresh_expires_at?: string }
const cookies = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' }
// Share one rotation across concurrent requests from the same browser.
const rotations = new Map<string, Promise<Tokens>>()
export function assertSessionOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')
  const safe = ['GET', 'HEAD', 'OPTIONS'].includes(getMethod(event))
  if (getHeader(event, 'sec-fetch-site') === 'cross-site' || origin === 'null' || (!safe && !origin))
    throw createError({ statusCode: 403, statusMessage: 'Cross-site request rejected' })
  // Read-only internal SSR requests need no browser Origin. Public mutations
  // never receive an exemption based on Fetch Metadata or an internal header.
  if (safe && !origin) return
  let expected = String(useRuntimeConfig(event).publicOrigin || '')
  if (!expected && process.env.NODE_ENV !== 'production') {
    // Development only: use the direct connection, never forwarding headers.
    const encrypted = 'encrypted' in event.node.req.socket && event.node.req.socket.encrypted
    expected = `${encrypted ? 'https' : 'http'}://${getHeader(event, 'host') || ''}`
  }
  try {
    const parsed = new URL(expected)
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.origin !== expected || parsed.username || parsed.password)
      throw new Error('Invalid origin')
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Public request origin is not configured' })
  }
  if (origin !== expected)
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
  if (!refresh) {
    clearSessionCookies(event)
    return undefined
  }
  const key = createHash('sha256').update(refresh).digest('hex')
  let pending = rotations.get(key)
  if (!pending) {
    pending = fetchBackend<Tokens>(`${backendBaseUrl(event)}/auth/refresh`, {
      method: 'POST', body: { refresh_token: refresh }, retry: 0, timeout: 15000, redirect: 'error',
    })
    rotations.set(key, pending)
    void pending.finally(() => { setTimeout(() => rotations.delete(key), 5000).unref() }).catch(() => {})
  }
  try {
    const tokens = await pending
    setSessionCookies(event, tokens)
    return tokens.access_token
  } catch (error: any) {
    // A lost rotation acknowledgement may already have consumed this token.
    // Never resend it after a timeout/outage: the backend's explicit recovery
    // contract requires sign-in on ambiguity, including a concurrent loser.
    clearSessionCookies(event)
    throw createError({ statusCode: 401, statusMessage: 'Session recovery requires sign-in. Your local work remains protected.' })
  }
}
