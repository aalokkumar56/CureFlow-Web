import { createError } from 'h3'
import { backendAuthHeaders, backendBaseUrl, fetchBackend } from '../../utils/backend'

export default defineEventHandler(async (event): Promise<unknown> => {
  const headers = backendAuthHeaders(event)
  if (!headers) throw createError({ statusCode: 401, statusMessage: 'Unauthenticated' })
  return await fetchBackend(`${backendBaseUrl(event)}/auth/session`, { headers })
})
