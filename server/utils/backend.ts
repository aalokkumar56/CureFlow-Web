import { getHeader } from 'h3'

type BackendFetchOptions = Parameters<typeof $fetch>[1]

export const backendBaseUrl = (event: Parameters<typeof getHeader>[0]) => {
  const configured = String(useRuntimeConfig(event).backendApiUrl).replace(/\/+$/, '')
  return /\/api$/i.test(configured) ? configured : `${configured}/api`
}

export const backendAuthHeaders = async (event: Parameters<typeof getHeader>[0], platform = false) => {
  if (platform) {
    const { platformAccessToken } = await import('./platform-session')
    const token = platformAccessToken(event)
    return token ? { Authorization: `Bearer ${token}` } : undefined
  }
  const { sessionAccessToken } = await import('./session')
  const session = await sessionAccessToken(event)
  return session
    ? { Authorization: `Bearer ${session}` }
    : undefined
}

// Node's trust store applies to every request. Development HTTPS certificates
// must be trusted explicitly (NODE_EXTRA_CA_CERTS); never disable verification.
export const fetchBackend = <T>(url: string, options?: BackendFetchOptions): Promise<T> =>
  $fetch<T>(url, options) as Promise<T>

export const fetchBackendRaw = (url: string, options?: BackendFetchOptions) =>
  $fetch.raw<ReadableStream<Uint8Array>>(url, {
    ...options, responseType: 'stream', ignoreResponseError: true, redirect: 'manual', retry: 0,
  })
