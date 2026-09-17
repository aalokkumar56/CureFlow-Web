import axios from 'axios'

const PLATFORM_TOKEN_KEY = 'cureflow_platform_token'

type PlatformAuthResponse = {
  access_token: string
  user?: unknown
}

type PlatformBootstrapData = {
  name: string
  email: string
  password: string
}

const createPlatformClient = () => {
  const config = useRuntimeConfig()
  const apiBaseUrl = String(
    config.public.apiBaseUrl || 'https://localhost:7180/api',
  ).replace(/\/+$/, '')

  const client = axios.create({
    baseURL: apiBaseUrl,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  client.interceptors.request.use((request) => {
    if (import.meta.client) {
      const token = localStorage.getItem(PLATFORM_TOKEN_KEY)

      if (token) {
        request.headers.Authorization = `Bearer ${token}`
      }
    }

    return request
  })

  return client
}

export const fetchPlatformSetupStatus = async () => {
  const client = createPlatformClient()

  const response = await client.get('/platform/auth/setup-status')

  return response.data
}

export const platformBootstrap = async (
  data: PlatformBootstrapData,
) => {
  const client = createPlatformClient()

  const response = await client.post<PlatformAuthResponse>(
    '/platform/auth/bootstrap',
    data,
  )

  if (import.meta.client && response.data.access_token) {
    localStorage.setItem(
      PLATFORM_TOKEN_KEY,
      response.data.access_token,
    )
  }

  return response.data
}

export const platformLogin = async (
  email: string,
  password: string,
) => {
  const client = createPlatformClient()

  const response = await client.post<PlatformAuthResponse>(
    '/platform/auth/login',
    {
      email,
      password,
    },
  )

  if (import.meta.client && response.data.access_token) {
    localStorage.setItem(
      PLATFORM_TOKEN_KEY,
      response.data.access_token,
    )
  }

  return response.data
}

export const platformLogout = () => {
  if (import.meta.client) {
    localStorage.removeItem(PLATFORM_TOKEN_KEY)
  }
}

export const platformGet = async <T = unknown>(
  path: string,
  params?: Record<string, unknown>,
) => {
  const response = await createPlatformClient().get<T>(path, { params })
  return response.data
}

export const platformPatch = async <T = unknown>(
  path: string,
  data?: unknown,
) => {
  const response = await createPlatformClient().patch<T>(path, data)
  return response.data
}
