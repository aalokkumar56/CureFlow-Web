import { createError, getHeader, getMethod, getQuery, sendStream, setResponseStatus, setResponseHeader, type H3Event } from 'h3'
import { Readable } from 'node:stream'
import { backendAuthHeaders, backendBaseUrl, fetchBackend, fetchBackendRaw } from './backend'
import { assertSessionOrigin, clearSessionCookies } from './session'
import { clearPlatformCookie, platformRequest } from './platform-session'
import { bffLocation, boundedRetryAfter, readBoundedBody, requestBodyLimit, requestTimeout, safeDisposition, validationBody } from './transport'

export async function proxyBackend(event: H3Event, path: string, platform = false) {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseHeader(event, 'X-Content-Type-Options', 'nosniff')
  setResponseHeader(event, 'Referrer-Policy', 'no-referrer')
  if (!path || path.split('/').some(segment => !segment || segment === '.' || segment === '..'))
    throw createError({ statusCode: 400, statusMessage: 'Valid API path is required' })
  if (/^auth\/(login|refresh|logout)\/?$/i.test(path) || (!platform && /^platform(?:\/|$)/i.test(path)) || (platform && (!/^platform\//.test(path) || /^platform\/auth(?:\/|$)/i.test(path)))) throw createError({ statusCode: 404 })
  if (platform) platformRequest(event); else assertSessionOrigin(event)
  const method = getMethod(event)
  const headers: Record<string, string> = {}
  for (const name of ['accept', 'content-type', 'x-request-id', 'if-match', 'if-none-match', 'if-modified-since', 'if-unmodified-since', 'idempotency-key', 'range', 'if-range']) {
    const value = getHeader(event, name)
    if (value) headers[name] = value
  }
  const auth = await backendAuthHeaders(event, platform)
  if (!auth)
    throw createError({ statusCode: 401, statusMessage: 'Please sign in to continue' })
  if (auth) Object.assign(headers, auth)
  const base = backendBaseUrl(event)
  const expected = getHeader(event, platform ? 'x-cureflow-platform-context' : 'x-cureflow-session-context')
  if (!expected && !['GET', 'HEAD', 'OPTIONS'].includes(method))
    throw createError({ statusCode: 409, data: { error: 'session_context_changed', message: 'Verify your session before continuing.' } })
  if (expected) {
    try {
      // Bind the command to the same captured cookie credential used upstream.
      // A login in another tab must not replay old clinical work as a new actor.
      const session = await fetchBackend<{ id?: string; user?: { id: string }; tenant?: { id: string } }>(`${base}/${platform ? 'platform/auth/session' : 'auth/session'}`, {
        headers: auth, retry: 0, timeout: 15000, redirect: 'error',
      })
      if (platform ? !session.id : !session.tenant?.id || !session.user?.id)
        throw new Error('Incomplete session authority')
      if ((platform ? session.id : `${session.tenant?.id}:${session.user?.id}`) !== expected)
        throw createError({ statusCode: 409, data: { error: 'session_context_changed', message: 'The signed-in user or hospital changed. Local work remains locked.' } })
    } catch (error: any) {
      const status = error.statusCode || error.status
      if (status === 401) { if (platform) clearPlatformCookie(event); else clearSessionCookies(event) }
      if (status === 409) throw error
      if (status === 401) throw createError({ statusCode: 401, statusMessage: 'Sign in again to continue' })
      throw createError({ statusCode: 503, statusMessage: 'Session verification unavailable', data: { error: 'session_verification_unavailable' } })
    }
  }
  const url = `${base}/${path.split('/').map(encodeURIComponent).join('/')}`
  const body = ['GET', 'HEAD'].includes(method) ? undefined : await readBoundedBody(event, requestBodyLimit(path), requestTimeout(path))
  const abort = new AbortController()
  const disconnected = () => { if (!event.node.res.writableEnded) abort.abort() }
  event.node.res.once('close', disconnected)
  try {
    const response = await fetchBackendRaw(url, { method, headers, query: getQuery(event), body, signal: abort.signal, timeout: requestTimeout(path) })
    const retryAfter = boundedRetryAfter(response.headers.get('retry-after'))
    if (retryAfter) event.node.res.setHeader('Retry-After', retryAfter)
    for (const name of ['etag', 'idempotency-replayed', 'last-modified', 'content-range', 'accept-ranges']) {
      const value = response.headers.get(name)
      if (value) setResponseHeader(event, name, value)
    }
    const location = response.headers.get('location')
    if (location) {
      const rewritten = bffLocation(location, url, base)
      if (rewritten && (!platform || rewritten.startsWith('/api/bff/platform/')))
        setResponseHeader(event, 'Location', platform ? rewritten.replace('/api/bff/platform/', '/api/platform/') : rewritten)
    }
    if (response.status === 401 && platform) clearPlatformCookie(event)
    if (response.status === 401 && !platform) clearSessionCookies(event)
    if (response.status >= 400) {
      const data = response.status < 500 || (response.status === 503 && /^clinical\/notes\/[^/]+\/translation$/.test(path))
        ? await validationBody(response._data) : undefined
      if (!data) await response._data?.cancel().catch(() => {})
      throw createError({ statusCode: response.status, statusMessage: 'Backend request failed', data })
    }
    if (headers.range && !headers['if-range'] && response.status === 200) {
      await response._data?.cancel().catch(() => {})
      throw createError({ statusCode: 416, statusMessage: 'This endpoint does not support partial downloads' })
    }
    if (response.status >= 300 && response.status !== 304 && !event.node.res.hasHeader('location')) {
      await response._data?.cancel().catch(() => {})
      throw createError({ statusCode: 502, statusMessage: 'Unsupported backend redirect' })
    }
    setResponseStatus(event, response.status)
    const contentType = response.headers.get('content-type')
    if (contentType) setResponseHeader(event, 'Content-Type', contentType)
    const contentPolicy = response.headers.get('content-security-policy')
    if (contentPolicy) setResponseHeader(event, 'Content-Security-Policy', contentPolicy)
    else if (/^text\/html(?:;|$)/i.test(contentType || ''))
      setResponseHeader(event, 'Content-Security-Policy', "sandbox; default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'")
    // Fetch may decompress encoded responses. Only retain the byte length
    // when it still describes the stream delivered to the browser.
    const length = response.headers.get('content-length')
    if (![204, 205, 304].includes(response.status) && length && /^\d+$/.test(length) && Number.isSafeInteger(Number(length)) && !response.headers.get('content-encoding'))
      setResponseHeader(event, 'Content-Length', Number(length))
    const disposition = response.headers.get('content-disposition')
    if (disposition) setResponseHeader(event, 'Content-Disposition', safeDisposition(disposition))
    if (method === 'HEAD' || [204, 205, 304].includes(response.status) || !response._data) {
      await response._data?.cancel().catch(() => {})
      // h3 converts a null handler result at status 200 to 204. Explicitly end
      // the response to preserve upstream HEAD and empty-200 status contracts.
      event.node.res.end()
      return
    }
    // The Node pipe observes response backpressure; h3's web-stream adapter
    // writes without waiting for drain.
    return await sendStream(event, Readable.fromWeb(response._data as any, { signal: abort.signal }))
  } catch (error: any) {
    if (event.node.res.headersSent) {
      // A broken file stream must fail at the network boundary; appending an
      // error JSON object would turn a partial file into a successful response.
      event.node.res.destroy()
      return
    }
    if (error.statusCode >= 400 && error.statusCode < 600) throw error
    throw createError({ statusCode: error.name === 'TimeoutError' ? 504 : 502, statusMessage: 'Backend request unavailable' })
  } finally { event.node.res.off('close', disconnected) }
}
