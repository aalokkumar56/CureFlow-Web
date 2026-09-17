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
import { assertSessionOrigin } from '../../utils/session'

const forwardedHeaders = async (event: Parameters<typeof getHeader>[0]) => {
  const headers: Record<string, string> = {}
  for (const name of ['accept', 'content-type', 'x-request-id']) {
    const value = getHeader(event, name)
    if (value) headers[name] = value
  }
  const auth = await backendAuthHeaders(event)
  if (auth?.Authorization) headers.Authorization = auth.Authorization
  return headers
}

export default defineEventHandler(async (event) => {
  const path = getRouterParam(event, 'path')
  if (!path) throw createError({ statusCode: 400, statusMessage: 'API path is required' })
  if (/^auth\/(login|refresh|logout)\/?$/i.test(path)) throw createError({ statusCode: 404 })
  assertSessionOrigin(event)

  const method = getMethod(event)
  const url = `${backendBaseUrl(event)}/${path.split('/').map(segment => encodeURIComponent(segment)).join('/')}`
  const body = ['GET', 'HEAD', 'DELETE'].includes(method) ? undefined : await readRawBody(event, false)

  try {
    const response = await fetchBackend<unknown>(url, {
      method,
      headers: await forwardedHeaders(event),
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
      // Preserve validation feedback (such as duplicate lead phones) for the form.
      data: status && status >= 400 && status < 500
        ? (cause as { data?: unknown }).data
        : undefined,
      cause,
    })
  }
})
