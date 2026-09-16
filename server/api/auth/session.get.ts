import { createError, setResponseHeader } from 'h3'
import { backendAuthHeaders, backendBaseUrl, fetchBackend } from '../../utils/backend'
import { clearSessionCookies } from '../../utils/session'

export default defineEventHandler(async (event): Promise<unknown> => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const headers = await backendAuthHeaders(event)
  if (!headers) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  try {
    return await fetchBackend(`${backendBaseUrl(event)}/auth/session`, { headers })
  } catch (error: any) {
    if (error.statusCode === 401 || error.status === 401) {
      clearSessionCookies(event)
      throw createError({ statusCode: 401, statusMessage: 'Please sign in again' })
    }
    throw createError({ statusCode: 503, statusMessage: 'Session service unavailable' })
  }
})
