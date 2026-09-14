import { readBody, setCookie, createError } from 'h3'
import { backendBaseUrl, fetchBackend } from '../../utils/backend'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const response = await fetchBackend<{ access_token?: string }>(`${backendBaseUrl(event)}/auth/login`, { method: 'POST', body })

  if (!response.access_token) {
    throw createError({ statusCode: 502, statusMessage: 'Authentication token was not returned' })
  }

  setCookie(event, 'cureflow_session', response.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return response
})
