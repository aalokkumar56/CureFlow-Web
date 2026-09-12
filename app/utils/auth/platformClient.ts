import axios from 'axios'

const config = useRuntimeConfig()

const platformClient = axios.create({
  baseURL: config.public.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

platformClient.interceptors.request.use((request) => {
  if (import.meta.client) {
    const token = localStorage.getItem('cureflow_platform_token')

    if (token) {
      request.headers.Authorization = `Bearer ${token}`
    }
  }

  return request
})

export const fetchPlatformSetupStatus = async () => {
  const response = await platformClient.get('/platform/auth/setup-status')
  return response.data
}

export const platformBootstrap = async (data: {
  name: string
  email: string
  password: string
}) => {
  const response = await platformClient.post(
    '/platform/auth/bootstrap',
    data,
  )

  if (import.meta.client && response.data.access_token) {
    localStorage.setItem(
      'cureflow_platform_token',
      response.data.access_token,
    )
  }

  return response.data
}

export const platformLogin = async (
  email: string,
  password: string,
) => {
  const response = await platformClient.post(
    '/platform/auth/login',
    { email, password },
  )

  if (import.meta.client && response.data.access_token) {
    localStorage.setItem(
      'cureflow_platform_token',
      response.data.access_token,
    )
  }

  return response.data
}

export const platformLogout = () => {
  if (import.meta.client) {
    localStorage.removeItem('cureflow_platform_token')
  }
}