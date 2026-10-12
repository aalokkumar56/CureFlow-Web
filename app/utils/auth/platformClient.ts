import axios from 'axios'
import type { PlatformUser } from '~/utils/platform'
import { requestFeedback } from '~/utils/api/retry-feedback'
import { notifySessionChange } from './session-events'
const requests = new WeakMap<object, { generation: number; controllers: Set<AbortController> }>()
const requestScope = (app: object) => {
  if (!requests.has(app)) requests.set(app, { generation: 0, controllers: new Set() })
  return requests.get(app)!
}
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
  const app = useNuxtApp()
  const feedback = requestFeedback(app)
  const scope = requestScope(app)
  const user = useState<PlatformUser | null>('platform-current-user', () => null)
  const api = axios.create({
    baseURL: '/api/platform',
    timeout: 30000,
  })
  api.interceptors.request.use((request) => {
    if (import.meta.client) {
      localStorage.removeItem(tokenKey)
    }
    if (request.data) request.data = snake(request.data)
    if (request.url?.startsWith('/platform/')) request.url = request.url.slice('/platform'.length)
    if (!request.url?.startsWith('/auth/') && !user.value?.id)
      throw Object.assign(new Error('Verify the platform session before continuing.'), { code: 'ERR_CANCELED' })
    feedback.check(`platform:${request.method}:${request.url?.split('?')[0]}`)
    const controller = new AbortController()
    scope.controllers.add(controller)
    request.signal = controller.signal
    Object.assign(request, { sessionGeneration: scope.generation, sessionController: controller })
    if (user.value?.id) request.headers['X-CureFlow-Platform-Context'] = user.value.id
    if (request.method !== 'get') request.headers['X-Request-ID'] ||= crypto.randomUUID()
    return request
  })
  api.interceptors.response.use(
    (response) => {
      scope.controllers.delete((response.config as any).sessionController)
      if ((response.config as any).sessionGeneration !== scope.generation)
        throw Object.assign(new Error('Platform session changed. This response was discarded.'), { code: 'ERR_CANCELED' })
      return response
    },
    async (error) => {
      scope.controllers.delete(error.config?.sessionController)
      if (error.code === 'ERR_CANCELED') return Promise.reject(error)
      if (error.config) feedback.record(`platform:${error.config.method}:${error.config.url?.split('?')[0]}`, error)
      if (
        (error.response?.status === 401 || error.response?.status === 409 &&
          (error.response?.data?.data?.error || error.response?.data?.error) === 'session_context_changed') &&
        import.meta.client &&
        !error.config?.url?.includes('/auth/')
      ) {
        app.runWithContext(clearPlatformState)
        if (window.location.pathname !== '/platform/login') await app.runWithContext(() => navigateTo('/platform/login'))
      }
      return Promise.reject(error)
    },
  )
  return api
}
type AuthResponse = { user: PlatformUser }
const authenticate = async (path: string, data: unknown) => {
  const response = await client().post<AuthResponse>(path, data)
  clearPlatformState()
  notifySessionChange('platform')
  return response.data
}
export const fetchPlatformSetupStatus = async () =>
  (await client().get<{ needsSetup: boolean }>('/auth/setup-status')).data
export const platformBootstrap = (data: { name: string; email: string; password: string }) =>
  authenticate('/platform/auth/bootstrap', data)
export const platformLogin = (email: string, password: string) =>
  authenticate('/platform/auth/login', { email, password })
export const clearPlatformState = () => {
  const scope = requestScope(useNuxtApp())
  scope.generation++
  for (const controller of scope.controllers) controller.abort()
  scope.controllers.clear()
  if (import.meta.client) {
    localStorage.removeItem(tokenKey)
    sessionStorage.removeItem(tokenKey)
  }
  useState<PlatformUser | null>('platform-current-user', () => null).value = null
  useState('platform-view-generation', () => 0).value++
  useState('app-toasts', () => []).value = []
  clearNuxtData(key => key.startsWith('platform'))
}
export const platformSession = async () => {
  const current = useState<PlatformUser | null>('platform-current-user', () => null).value?.id
  const response = (await client().get<AuthResponse>('/auth/session')).data
  if (current && response.user.id !== current) {
    clearPlatformState()
    throw Object.assign(new Error('Platform user changed. Sign in again before continuing.'), { statusCode: 409 })
  }
  return response
}
export const platformLogout = async () => {
  const result = (await client().post<{ signedOut: boolean; revoked: boolean }>('/auth/logout')).data
  clearPlatformState()
  notifySessionChange('platform')
  return result
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
