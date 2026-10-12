import { createError, setResponseHeader } from 'h3'
import { boundedRetryAfter, readBoundedBody } from '../../utils/transport'
import { assertSessionOrigin, setSessionCookies } from '../../utils/session'
import { backendBaseUrl, fetchBackend } from '../../utils/backend'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  assertSessionOrigin(event)
  let body: Record<string, unknown>
  try { body = JSON.parse((await readBoundedBody(event, 16 * 1024))?.toString() || '{}') }
  catch (error: any) { if (error.statusCode) throw error; throw createError({ statusCode: 400, statusMessage: 'Invalid sign-in details' }) }
  const response = await fetchBackend<{ access_token: string; refresh_token?: string; refresh_expires_at?: string; user: unknown; tenant: unknown }>(`${backendBaseUrl(event)}/auth/login`, { method: 'POST', body, retry: 0, timeout: 15000, redirect: 'error' }).catch((cause: unknown) => {
    const error = cause as { statusCode?: number; data?: unknown; response?: Response }
    const retryAfter = boundedRetryAfter(error.response?.headers.get('retry-after'))
    if (retryAfter) event.node.res.setHeader('Retry-After', retryAfter)
    const status = error.statusCode && error.statusCode >= 400 && error.statusCode < 600 ? error.statusCode : 502
    throw createError({ statusCode: status, statusMessage: 'Sign-in failed', data: status < 500 ? error.data : undefined })
  })

  if (!response.access_token) {
    throw createError({ statusCode: 502, statusMessage: 'Authentication token was not returned' })
  }

  setSessionCookies(event, response)

  return { user: response.user, tenant: response.tenant }
})
