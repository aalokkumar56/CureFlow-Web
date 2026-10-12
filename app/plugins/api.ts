import axios from 'axios'
import { normalizeApiError } from '~/utils/api/errors'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { requestFeedback } from '~/utils/api/retry-feedback'
import { incrementGlobalLoader, decrementGlobalLoader } from '~/utils/api/loader'
import { keysToSnakeCase } from '~/utils/api/transform'
import { hasUnsavedClinicalWork } from '~/utils/clinical-navigation'

export default defineNuxtPlugin((nuxtApp) => {
  // Tenant requests must pass through Nuxt so refresh tokens never reach JS.
  const toast = useToast()
  const auth = useTenantAuth()
  const feedback = requestFeedback(nuxtApp)
  const controllers = new Set<AbortController>()
  watch(auth.authority, state => {
    if (state !== 'verified') { for (const controller of controllers) controller.abort(); controllers.clear() }
  }, { flush: 'sync' })
  const configuredApiBaseUrl = '/api/bff'
  const apiBaseUrl = configuredApiBaseUrl.startsWith('/') && import.meta.server
    ? `${useRequestURL().origin}${configuredApiBaseUrl}`
    : configuredApiBaseUrl

  const apiClient: AxiosInstance = axios.create({
    baseURL: apiBaseUrl,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  apiClient.interceptors.request.use((request) => {
    feedback.check(`tenant:${request.method}:${request.url?.split('?')[0]}`)
    if (/media$|sendmedia$|upload$|import-|documents$|translation$|ai\//i.test(request.url?.split('?')[0] || ''))
      request.timeout = 120000
    if (auth.authority.value !== 'verified') {
      const message = 'Workspace is locked. Verify your session before continuing.'
      return Promise.reject(Object.assign(new Error(message), { sessionBlocked: true, response: { status: 503, data: { message } } }))
    }
    const controller = new AbortController()
    controllers.add(controller)
    request.signal = request.signal ? AbortSignal.any([request.signal as AbortSignal, controller.signal]) : controller.signal
    Object.assign(request, { authorityEpoch: auth.epoch.value, authorityController: controller })
    if (auth.identity.value) request.headers['X-CureFlow-Session-Context'] = auth.identity.value
    request.headers['X-Request-Id'] = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const isFormData =
      typeof FormData !== 'undefined' && request.data instanceof FormData
    if (isFormData) {
      request.headers?.delete?.('Content-Type')
      request.headers?.delete?.('content-type')
    }
    if (import.meta.server) {
      const cookie = useRequestHeaders(['cookie']).cookie
      if (cookie) request.headers.Cookie = cookie
    }

    if (
      request.data &&
      !isFormData &&
      typeof request.data === 'object'
    ) {
      request.data = keysToSnakeCase(request.data)
    }

    incrementGlobalLoader()

    return request
  })

  apiClient.interceptors.response.use(
    (response) => {
      controllers.delete((response.config as any).authorityController)
      decrementGlobalLoader()
      if ((response.config as any).authorityEpoch !== auth.epoch.value || auth.authority.value !== 'verified')
        throw Object.assign(new Error('Session changed. This response was discarded.'), { sessionBlocked: true, code: 'ERR_CANCELED' })
      return response
    },
    async (error) => {
      controllers.delete(error.config?.authorityController)
      decrementGlobalLoader()
      if (error.sessionBlocked || error.code === 'ERR_CANCELED') return Promise.reject(error)
      const method = String(error.config?.method || 'get').toLowerCase()
      const status = error.response?.status
      if (error.config) feedback.record(`tenant:${error.config.method}:${error.config.url?.split('?')[0]}`, error)
      if (import.meta.client && !['get', 'head'].includes(method) && ![400, 422].includes(status)) {
        toast.show(normalizeApiError(error), 'error')
      }

      if (import.meta.client && status === 401) {
        nuxtApp.runWithContext(() => auth.lock('expired'))
        if (!hasUnsavedClinicalWork()) {
          nuxtApp.runWithContext(auth.reset)
          if (window.location.pathname !== '/login') await nuxtApp.runWithContext(() => navigateTo('/login?session=expired'))
        }
      } else if (import.meta.client && status === 403) {
        toast.show('Access was denied. Your current permissions are being checked.', 'error')
        // One session refresh; never replay the denied request or any command.
        try { await nuxtApp.runWithContext(auth.refreshSession) } catch { /* The guarded workspace presents recovery. */ }
      } else if (import.meta.client && status === 409 &&
          (error.response?.data?.data?.error || error.response?.data?.error) === 'session_context_changed') {
        nuxtApp.runWithContext(() => auth.lock('changed'))
      } else if (import.meta.client && status === 503 &&
          (error.response?.data?.data?.error || error.response?.data?.error) === 'session_verification_unavailable') {
        nuxtApp.runWithContext(() => auth.lock('unavailable'))
      }

      return Promise.reject(error)
    },
  )

  const api = {
    getVersioned: async <T = unknown>(url: string): Promise<{ data: T; etag?: string }> => {
      const response = await apiClient.get<T>(url)
      return { data: response.data, etag: response.headers.etag }
    },
    download: async (url: string, options?: Pick<AxiosRequestConfig, 'signal'>): Promise<Blob> => {
      const response = await apiClient.get<Blob>(url, { ...options, responseType: 'blob' })
      return response.data
    },
    get: async <T = unknown>(
      url: string,
      params?: Record<string, unknown>,
      options?: Pick<AxiosRequestConfig, 'signal'>,
    ): Promise<T> => {
      const response = await apiClient.get<T>(url, { ...options, params })
      return response.data
    },

    post: async <T = unknown>(
      url: string,
      data?: unknown,
      options?: { ifMatch?: string; idempotencyKey?: string },
    ): Promise<T> => {
      const headers: Record<string, string> = {}
      if (options?.ifMatch) headers['If-Match'] = options.ifMatch
      if (options?.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
      const response = await apiClient.post<T>(url, data, { headers })
      return response.data
    },

    put: async <T = unknown>(
      url: string,
      data?: unknown,
    ): Promise<T> => {
      const response = await apiClient.put<T>(url, data)
      return response.data
    },

    patch: async <T = unknown>(
      url: string,
      data?: unknown,
      options?: { ifMatch?: string },
    ): Promise<T> => {
      const response = await apiClient.patch<T>(url, data, options?.ifMatch ? { headers: { 'If-Match': options.ifMatch } } : undefined)
      return response.data
    },

    delete: async <T = unknown>(
      url: string,
      params?: Record<string, unknown>,
    ): Promise<T> => {
      const response = await apiClient.delete<T>(url, { params })
      return response.data
    },
  }

  return {
    provide: {
      api,
    },
  }
})
