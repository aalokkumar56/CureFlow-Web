import { createError, setResponseHeader } from 'h3'
import { backendAuthHeaders, backendBaseUrl, fetchBackend } from '../../utils/backend'
import { assertSessionOrigin, clearSessionCookies } from '../../utils/session'

export default defineEventHandler(async (event): Promise<unknown> => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  assertSessionOrigin(event)
  const headers = await backendAuthHeaders(event)
  if (!headers) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  try {
    return await fetchBackend(`${backendBaseUrl(event)}/auth/session`, { headers, retry: 0, timeout: 15000, redirect: 'error' })
  } catch (error: any) {
    if (error.statusCode === 401 || error.status === 401) {
      clearSessionCookies(event)
      throw createError({ statusCode: 401, statusMessage: 'Please sign in again' })
    }
    throw createError({ statusCode: 503, statusMessage: 'Session service unavailable' })
  }
})
