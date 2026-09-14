import {
  createError,
  getHeader,
  getMethod,
  getQuery,
  getRouterParam,
  readRawBody,
  setResponseStatus,
} from 'h3'
import { backendAuthHeaders, backendBaseUrl, fetchBackend } from '../../utils/backend'

const forwardedHeaders = (event: Parameters<typeof getHeader>[0]) => {
  const headers: Record<string, string> = {}
  for (const name of ['accept', 'content-type', 'x-request-id']) {
    const value = getHeader(event, name)
    if (value) headers[name] = value
  }
  const auth = backendAuthHeaders(event)
  if (auth?.Authorization) headers.Authorization = auth.Authorization
  return headers
}

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path')
  if (!path) throw createError({ statusCode: 400, statusMessage: 'API path is required' })

  const method = getMethod(event)
  const url = `${backendBaseUrl(event)}/${path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`
  const body = ['GET', 'HEAD', 'DELETE'].includes(method) ? undefined : await readRawBody(event, false)

  try {
    const response = await fetchBackend<unknown>(url, {
      method,
      headers: forwardedHeaders(event),
      query: getQuery(event),
      body,
    })
    setResponseStatus(event, 200)
    return response
  } catch (cause: unknown) {
    const status = (cause as { statusCode?: number; status?: number; response?: { status?: number } })?.statusCode
      || (cause as { status?: number })?.status
      || (cause as { response?: { status?: number } })?.response?.status
    throw createError({
      statusCode: status && status >= 400 && status < 600 ? status : 502,
      statusMessage: 'Backend request failed',
      cause,
    })
  }
})
