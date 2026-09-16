import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { authStorage } from '~/utils/auth/storage'
import { incrementGlobalLoader, decrementGlobalLoader } from '~/utils/api/loader'
import { keysToSnakeCase } from '~/utils/api/transform'

export default defineNuxtPlugin((nuxtApp) => {
  // Tenant requests must pass through Nuxt so refresh tokens never reach JS.
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
      decrementGlobalLoader()
      return response
    },
    async (error) => {
      decrementGlobalLoader()

      if (error.response?.status === 401 && import.meta.client) {
        authStorage.clear()
        nuxtApp.runWithContext(() => {
          const auth = useTenantAuth()
          auth.token.value = null
          auth.user.value = null
          auth.tenant.value = null
        })

        if (window.location.pathname !== '/login') {
          await nuxtApp.runWithContext(() => navigateTo('/login'))
        }
      }

      return Promise.reject(error)
    },
  )

  const api = {
    download: async (url: string): Promise<Blob> => {
      const response = await apiClient.get<Blob>(url, { responseType: 'blob' })
      return response.data
    },
    get: async <T = unknown>(
      url: string,
      params?: Record<string, unknown>,
    ): Promise<T> => {
      const response = await apiClient.get<T>(url, { params })
      return response.data
    },

    post: async <T = unknown>(
      url: string,
      data?: unknown,
    ): Promise<T> => {
      const response = await apiClient.post<T>(url, data)
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
    ): Promise<T> => {
      const response = await apiClient.patch<T>(url, data)
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
