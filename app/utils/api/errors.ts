import { retrySeconds } from './retry-feedback'

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
const strings = (v: unknown, depth = 0): string[] =>
  typeof v === 'string' && v.trim() ? [v.trim().slice(0, 512)] :
    depth < 2 && Array.isArray(v) ? v.slice(0, 64).flatMap(value => strings(value, depth + 1)) : []
const unique = (v: string[]) => [...new Set(v)]
/** Supports Axios, ofetch, and Nitro envelopes within the backend's error budget. */
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
    fieldErrors: Record<string, string[]> = Object.create(null)
  for (const [field, value] of Object.entries(record(body.errors)).slice(0, 64)) {
    const messages = unique(strings(value)).slice(0, 4)
    if (messages.length) fieldErrors[field.slice(0, 128)] = messages
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
    412: 'This record changed after you opened it. Review the current record before saving again. Your edits have been kept.',
    413: 'The submitted input is too large. Reduce the file size or split the input before trying again.',
    422: 'Please correct the highlighted fields.',
    428: 'Reload and review the current record version before saving. Your edits have been kept.',
    429: 'Too many requests. Please wait a moment and try again.',
  }
  if (body.error === 'tenant_pending_approval')
    messages.push('Your hospital is awaiting CureFlow approval. Sign in to check status.')
  if (body.error === 'onboarding_incomplete')
    messages.push('Complete onboarding to access this feature.')
  if (status === 429) {
    const seconds = retrySeconds(error) ?? 30
    return { status, message: `Too many requests. Try again in ${seconds} seconds. Your input has been kept.`, fieldErrors: {} }
  }
  if (status === 413) return { status, message: defaults[413]!, fieldErrors: {} }
  const method = String(record(root.config).method || record(root.options).method || '').toLowerCase()
  const write = !!method && !['get', 'head', 'options'].includes(method)
  if (write && (status === 502 || status === 504 || !status && ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(String(root.code))))
    return { status, message: 'The save outcome is unconfirmed. Check the current record before submitting again. Your input has been kept.', fieldErrors: {} }
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
