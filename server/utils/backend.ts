import { getHeader } from 'h3'

type BackendFetchOptions = Parameters<typeof $fetch>[1]

export const backendBaseUrl = (event: Parameters<typeof getHeader>[0]) => {
  const configured = String(useRuntimeConfig(event).backendApiUrl).replace(/\/+$/, '')
  return /\/api$/i.test(configured) ? configured : `${configured}/api`
}

export const backendAuthHeaders = async (event: Parameters<typeof getHeader>[0]) => {
  const authorization = getHeader(event, 'authorization')
  const { sessionAccessToken } = await import('./session')
  const session = await sessionAccessToken(event)
  const platform = event.path.startsWith('/api/bff/platform/') ? authorization : undefined
  return platform || session
    ? { Authorization: platform || `Bearer ${session}` }
    : undefined
}

/**
 * Local .NET development commonly uses a self-signed HTTPS certificate. Keep
 * production TLS validation strict while allowing that certificate only when
 * Nuxt is running in development mode.
 */
export const fetchBackend = async <T>(url: string, options?: BackendFetchOptions): Promise<T> => {
  const isLocalDevelopmentCertificate = import.meta.dev && /^https:\/\/(localhost|127\.0\.0\.1)(:|\/)/i.test(url)
  if (!isLocalDevelopmentCertificate) return await $fetch<T>(url, options)

  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  try {
    return await $fetch<T>(url, options)
  } finally {
    if (previous === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous
  }
}
