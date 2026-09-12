import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { authStorage } from '~/utils/auth/storage'
import { incrementGlobalLoader, decrementGlobalLoader } from '~/utils/api/loader'
import { keysToSnakeCase } from '~/utils/api/transform'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const apiBaseUrl = String(
    config.public.apiBaseUrl || 'https://localhost:7180/api',
  ).replace(/\/+$/, '')

  const apiClient: AxiosInstance = axios.create({
    baseURL: apiBaseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  apiClient.interceptors.request.use((request) => {
    const token = authStorage.getToken()

    if (token) {
      request.headers.Authorization = `Bearer ${token}`
    }

    if (
      request.data &&
      !(request.data instanceof FormData) &&
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

        if (window.location.pathname !== '/login') {
          await nuxtApp.runWithContext(() => navigateTo('/login'))
        }
      }

      return Promise.reject(error)
    },
  )

  const api = {
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