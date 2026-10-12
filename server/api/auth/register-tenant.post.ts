import { createError, getHeader, setResponseHeader } from 'h3'
import { backendBaseUrl, fetchBackendRaw } from '../../utils/backend'
import { assertSessionOrigin } from '../../utils/session'
import { boundedRetryAfter, readBoundedBody, validationBody } from '../../utils/transport'

export default defineEventHandler(async event => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  assertSessionOrigin(event)
  if (!/^application\/json(?:\s*;|$)/i.test(getHeader(event, 'content-type') || ''))
    throw createError({ statusCode: 415, statusMessage: 'JSON registration details required' })
  const body = await readBoundedBody(event, 16 * 1024)
  try { JSON.parse(body?.toString() || '') }
  catch { throw createError({ statusCode: 400, statusMessage: 'Invalid registration details' }) }
  let response
  try {
    // Registration is explicitly anonymous in AuthController; never forward a
    // tenant/platform cookie, browser bearer credential or caller-selected host.
    response = await fetchBackendRaw(`${backendBaseUrl(event)}/auth/register-tenant`, {
      method: 'POST', body, headers: { 'content-type': 'application/json' }, timeout: 30000,
    })
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Registration service unavailable' })
  }
  if (response.status >= 400 && response.status < 500) {
    const data = await validationBody(response._data)
    const retryAfter = boundedRetryAfter(response.headers.get('retry-after'))
    if (retryAfter) event.node.res.setHeader('Retry-After', retryAfter)
    throw createError({ statusCode: response.status, statusMessage: 'Registration failed', data })
  }
  await response._data?.cancel().catch(() => {})
  if (response.status < 200 || response.status >= 300)
    throw createError({ statusCode: 503, statusMessage: 'Registration service unavailable' })
  // No automatic session or backend response fields are exposed by signup.
  return { registered: true }
})
