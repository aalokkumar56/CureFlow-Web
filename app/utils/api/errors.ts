import axios from 'axios'

const STATUS_MESSAGES = {
  401: 'Your session has expired. Please sign in again.',
  403: "You don't have permission to access this.",
  404: 'The requested resource was not found.',
  422: 'Please check your input and try again.',
  500: 'Something went wrong on our end. Please try again later.',
} as const

interface ApiErrorResponse {
  error?: string
  detail?: string
  title?: string
  message?: string
  errors?: Record<string, string[]>
}

export const normalizeApiError = (
  error: unknown,
  fallbackMessage = 'Request failed',
): string => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && error.message
      ? error.message
      : fallbackMessage
  }

  const status = error.response?.status
  const data = error.response?.data as ApiErrorResponse | string | undefined

  if (status === 403 && typeof data !== 'string') {
    if (data?.error === 'tenant_pending_approval') {
      return 'Your hospital is awaiting CureFlow approval. Sign in to check status.'
    }

    if (data?.error === 'onboarding_incomplete') {
      return 'Complete onboarding to access this feature.'
    }
  }

  if (status === 401) {
    return STATUS_MESSAGES[401]
  }

  if (status === 422) {
    if (typeof data !== 'string' && data?.errors) {
      const firstKey = Object.keys(data.errors)[0]
      const firstMessage = firstKey
        ? data.errors[firstKey]?.[0]
        : undefined

      if (firstMessage) {
        return firstMessage
      }
    }

    return STATUS_MESSAGES[422]
  }

  if (status && status >= 500) {
    return STATUS_MESSAGES[500]
  }

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (typeof data === 'object' && data !== null) {
    if (data.error) return data.error
    if (data.detail) return data.detail
    if (data.title) return data.title
    if (data.message) return data.message

    if (data.errors) {
      const firstKey = Object.keys(data.errors)[0]
      const firstMessage = firstKey
        ? data.errors[firstKey]?.[0]
        : undefined

      if (firstMessage) return firstMessage
    }
  }

  if (status && status in STATUS_MESSAGES) {
    return STATUS_MESSAGES[status as keyof typeof STATUS_MESSAGES]
  }

  if (error.code === 'ERR_NETWORK') {
    return 'Unable to reach the server. Check your connection.'
  }

  return fallbackMessage
}
