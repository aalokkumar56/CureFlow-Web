export interface ApiErrorDetails {
  status?: number
  message: string
  fieldErrors: Record<string, string[]>
}
const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {}
export const fieldLabel = (key: string) =>
  key
    .replace(/^\$\./, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_.]/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
const strings = (v: unknown): string[] =>
  typeof v === 'string' && v.trim() ? [v.trim()] : Array.isArray(v) ? v.flatMap(strings) : []
const unique = (v: string[]) => [...new Set(v)]
/** Supports Axios, ofetch, and Nitro envelopes, retaining all validation errors. */
export function getApiErrorDetails(
  error: unknown,
  fallback = 'Request failed. Please try again.',
): ApiErrorDetails {
  const root = record(error),
    response = record(root.response)
  const status = Number(response.status || root.statusCode || root.status) || undefined
  let payload: unknown = response.data ?? root.data ?? response._data
  for (let depth = 0; depth < 5 && record(payload).data != null; depth++)
    payload = record(payload).data
  const body = record(payload),
    fieldErrors: Record<string, string[]> = {}
  for (const [field, value] of Object.entries(record(body.errors))) {
    const messages = unique(strings(value))
    if (messages.length) fieldErrors[field] = messages
  }
  const messages = unique([
    ...strings(body.detail),
    ...strings(body.message),
    ...strings(body.error).filter((m) => !/^[a-z]+(?:_[a-z]+)+$/.test(m)),
    ...strings(payload),
  ])
  if (!messages.length && !Object.keys(fieldErrors).length) messages.push(...strings(body.title))
  const defaults: Record<number, string> = {
    400: 'Please check your input and try again.',
    401: 'Please sign in again to continue.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'This conflicts with an existing record. Please check your input.',
    422: 'Please correct the highlighted fields.',
    429: 'Too many requests. Please wait a moment and try again.',
  }
  if (body.error === 'tenant_pending_approval')
    messages.push('Your hospital is awaiting CureFlow approval. Sign in to check status.')
  if (body.error === 'onboarding_incomplete')
    messages.push('Complete onboarding to access this feature.')
  if (status && status >= 500)
    return {
      status,
      message: 'Something went wrong on our end. Please try again later.',
      fieldErrors: {},
    }
  let message = unique(messages).join('\n')
  if (!message && !Object.keys(fieldErrors).length) {
    if (root.code === 'ERR_NETWORK') message = 'Unable to reach the server. Check your connection.'
    else if (root.code === 'ECONNABORTED' || root.code === 'ETIMEDOUT')
      message = 'The request timed out. Please try again.'
    else if (status) message = defaults[status] || fallback
    else if (
      error instanceof Error &&
      !root.response &&
      !root.request &&
      !/fetch|network/i.test(error.name) &&
      !/^\[.*\]/.test(error.message)
    )
      message = error.message || fallback
    else message = fallback
  }
  return { status, message, fieldErrors }
}
export function normalizeApiError(error: unknown, fallback?: string): string {
  const details = getApiErrorDetails(error, fallback)
  return [
    details.message,
    ...Object.entries(details.fieldErrors).flatMap(([field, messages]) =>
      messages.map((message) => `${fieldLabel(field)}: ${message}`),
    ),
  ]
    .filter(Boolean)
    .join('\n')
}
