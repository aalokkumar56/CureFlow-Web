import { createError, deleteCookie, getCookie, setCookie, setResponseHeader, type H3Event } from 'h3'
import { backendBaseUrl, fetchBackend } from './backend'
import { assertSessionOrigin } from './session'
import { boundedRetryAfter } from './transport'

const cookie = 'cureflow_platform_session'
const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/platform' }
type Operator = { id: string; email: string; name: string; role: string; permissions: string[]; expiresAt: string }
export function clearPlatformCookie(event: H3Event) {
  deleteCookie(event, cookie, cookieOptions)
}
export function platformRequest(event: H3Event) {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  assertSessionOrigin(event)
}
export function platformAccessToken(event: H3Event) {
  const token = getCookie(event, cookie)
  if (!token) return undefined
  try {
    const claims = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString())
    if (typeof claims.exp === 'number' && claims.exp * 1000 > Date.now()) return token
  } catch { /* The backend validates signatures and the platform audience. */ }
  clearPlatformCookie(event)
  return undefined
}
export function platformFailure(event: H3Event, error: unknown): never {
  const cause = error as { statusCode?: number; status?: number; response?: Response }
  const retryAfter = boundedRetryAfter(cause.response?.headers.get('retry-after'))
  if (retryAfter) event.node.res.setHeader('Retry-After', retryAfter)
  const status = cause.statusCode || cause.status || 502
  if (status === 401) clearPlatformCookie(event)
  const messages: Record<number, string> = {
    400: 'Check the sign-in details and try again.', 401: 'Sign in again to continue.',
    403: 'Platform access is not permitted.', 409: 'A platform owner already exists. Sign in instead.',
    413: 'The submitted details are too large. Reduce the input and try again.',
    422: 'Check the sign-in details and try again.', 429: 'Too many attempts. Wait before trying again.',
  }
  const message = messages[status] || 'Platform service unavailable. Please try again.'
  throw createError({ statusCode: messages[status] ? status : 503, statusMessage: message, data: { message } })
}
export async function platformOperator(event: H3Event, token: string): Promise<Operator> {
  try {
    const result = await fetchBackend<Record<string, unknown>>(`${backendBaseUrl(event)}/platform/auth/session`, {
      headers: { Authorization: `Bearer ${token}` }, retry: 0, timeout: 15000, redirect: 'error',
    })
    const expiresAt = result.expires_at
    if (typeof result.id !== 'string' || typeof result.email !== 'string' || typeof result.name !== 'string' ||
        typeof result.role !== 'string' || !Array.isArray(result.permissions) ||
        !result.permissions.every(p => typeof p === 'string') || typeof expiresAt !== 'string' ||
        !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= Date.now())
      throw createError({ statusCode: 502 })
    // Explicit projection prevents new backend credential fields from leaking.
    return { id: result.id, email: result.email, name: result.name, role: result.role,
      permissions: result.permissions as string[], expiresAt }
  } catch (error) { return platformFailure(event, error) }
}
export async function authenticatePlatform(event: H3Event, action: 'login' | 'bootstrap', body: unknown) {
  platformRequest(event)
  try {
    const response = await fetchBackend<{ access_token?: string }>(`${backendBaseUrl(event)}/platform/auth/${action}`, {
      method: 'POST', body: body as Record<string, unknown>, retry: 0, timeout: 15000, redirect: 'error',
    })
    if (!response.access_token) throw createError({ statusCode: 502 })
    const user = await platformOperator(event, response.access_token)
    setCookie(event, cookie, response.access_token, { ...cookieOptions, expires: new Date(user.expiresAt) })
    return { user }
  } catch (error) { return platformFailure(event, error) }
}
