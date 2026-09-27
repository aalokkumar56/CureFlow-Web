import { useTenantAuth } from '~/composables/auth/useTenantAuth'

export interface TenantRegistrationPayload {
  hospitalName: string
  tenantType: string
  adminName: string
  email: string
  password: string
  phone?: string
}

export const useTenantRegistration = () => {
  const { $api } = useNuxtApp()
  const auth = useTenantAuth()

  const loading = ref(false)

  const register = async (payload: TenantRegistrationPayload) => {
    loading.value = true

    try {
      await $api.post('/auth/register-tenant', {
        hospitalName: payload.hospitalName,
        tenantType: payload.tenantType || 'Hospital',
        adminName: payload.adminName,
        adminEmail: payload.email,
        adminPassword: payload.password,
        phone: payload.phone || undefined,
      })

      const session = await auth.login({
        email: payload.email,
        password: payload.password,
      })

      return session
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    register,
  }
}
