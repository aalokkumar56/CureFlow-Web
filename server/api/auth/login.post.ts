import { readBody, createError, setResponseHeader } from 'h3'
import { assertSessionOrigin, setSessionCookies } from '../../utils/session'
import { backendBaseUrl, fetchBackend } from '../../utils/backend'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const body = await readBody(event)
  assertSessionOrigin(event)
  const response = await fetchBackend<{ access_token: string; refresh_token: string; refresh_expires_at: string; user: unknown; tenant: unknown }>(`${backendBaseUrl(event)}/auth/login`, { method: 'POST', body, retry: 0 })

  if (!response.access_token) {
    throw createError({ statusCode: 502, statusMessage: 'Authentication token was not returned' })
  }

  setSessionCookies(event, response)

  return { user: response.user, tenant: response.tenant }
})
