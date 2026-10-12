import { useTenantAuth } from '~/composables/auth/useTenantAuth'
import { requestFeedback } from '~/utils/api/retry-feedback'

export interface TenantRegistrationPayload {
  hospitalName: string
  tenantType: string
  adminName: string
  email: string
  password: string
  phone?: string
}

export const useTenantRegistration = () => {
  const auth = useTenantAuth()
  const feedback = requestFeedback(useNuxtApp())

  const loading = ref(false)

  const register = async (payload: TenantRegistrationPayload) => {
    feedback.check('tenant:register')
    loading.value = true

    try {
      await $fetch('/api/auth/register-tenant', {
        method: 'POST', credentials: 'include',
        retry: 0, timeout: 30000,
        body: {
          hospital_name: payload.hospitalName,
          tenant_type: payload.tenantType || 'Hospital',
          admin_name: payload.adminName,
          admin_email: payload.email,
          admin_password: payload.password,
          phone: payload.phone || undefined,
        },
      })

      const session = await auth.login({
        email: payload.email,
        password: payload.password,
      })

      return session
    } catch (error) {
      feedback.record('tenant:register', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    register,
  }
}
