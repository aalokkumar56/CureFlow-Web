import axios from 'axios'
const tokenKey = 'cureflow_platform_token'
const mapKeys = (value: unknown, convert: (key: string) => string): unknown => {
  if (Array.isArray(value)) return value.map((v) => mapKeys(v, convert))
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [convert(k), mapKeys(v, convert)]),
    )
  return value
}
const camel = (value: unknown) =>
  mapKeys(value, (key) => key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()))
const snake = (value: unknown) =>
  mapKeys(value, (key) => key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase()))
const client = () => {
  const config = useRuntimeConfig()
  const api = axios.create({
    baseURL: String(config.public.apiBaseUrl || '/api/bff').replace(/\/+$/, ''),
    timeout: 30000,
  })
  api.interceptors.request.use((request) => {
    if (import.meta.client) {
      const token = localStorage.getItem(tokenKey)
      if (token) request.headers.Authorization = 'Bearer ' + token
    }
    if (request.data) request.data = snake(request.data)
    if (request.method !== 'get') request.headers['X-Request-ID'] ||= crypto.randomUUID()
    return request
  })
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (
        error.response?.status === 401 &&
        import.meta.client &&
        !error.config?.url?.includes('/auth/')
      ) {
        platformLogout()
        await navigateTo('/platform/login')
      }
      return Promise.reject(error)
    },
  )
  return api
}
type AuthResponse = { access_token: string; email: string; name: string }
const authenticate = async (path: string, data: unknown) => {
  const response = await client().post<AuthResponse>(path, data)
  if (import.meta.client) localStorage.setItem(tokenKey, response.data.access_token)
  return response.data
}
export const fetchPlatformSetupStatus = async () =>
  (await client().get('/platform/auth/setup-status')).data
export const platformBootstrap = (data: { name: string; email: string; password: string }) =>
  authenticate('/platform/auth/bootstrap', data)
export const platformLogin = (email: string, password: string) =>
  authenticate('/platform/auth/login', { email, password })
export const platformLogout = () => {
  if (import.meta.client) localStorage.removeItem(tokenKey)
}
export const platformGet = async <T = unknown>(
  path: string,
  params?: Record<string, unknown>,
): Promise<T> => camel((await client().get(path, { params })).data) as T
export const platformPatch = async <T = unknown>(path: string, data?: unknown): Promise<T> =>
  camel((await client().patch(path, data)).data) as T
export const platformPost = async <T = unknown>(path: string, data?: unknown): Promise<T> =>
  camel((await client().post(path, data)).data) as T
export const platformPut = async <T = unknown>(path: string, data?: unknown): Promise<T> =>
  camel((await client().put(path, data)).data) as T
export const platformDelete = async <T = unknown>(path: string, data?: unknown): Promise<T> =>
  camel((await client().delete(path, { data })).data) as T
