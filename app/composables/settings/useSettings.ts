import { normalizeApiError } from '~/utils/api/errors'
import {
  normalizeDepartments,
  normalizeSettingsList,
  shouldSendSecret,
  type HospitalProfile,
  type MessageTemplate,
  type SettingsSection,
} from '~/utils/settings'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'

export const useSettings = () => {
  const { $api } = useNuxtApp()
  const auth = useTenantAuth()
  const profile = ref<HospitalProfile>({})
  const departments = ref<string[]>([])
  const integrations = reactive<
    Record<'whatsapp' | 'sms' | 'email', Record<string, unknown>>
  >({ whatsapp: {}, sms: {}, email: {} })
  const templates = ref<MessageTemplate[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  let request = 0
  let activeSection: SettingsSection = 'hospital'
  const load = async (section: SettingsSection = activeSection) => {
    activeSection = section
    const current = ++request
    if (!hasPermission(auth.user.value, PERMISSIONS.SettingsView)) return
    loading.value = true
    error.value = ''
    try {
      if (section === 'hospital') {
        const result = await $api.get<HospitalProfile>('/hospital-profile')
        if (current !== request) return
        profile.value = result || {}
        departments.value = normalizeDepartments(result?.departments)
      } else if (section === 'integrations') {
        const [whatsapp, sms, email] = await Promise.all(
          ['whatsapp', 'sms', 'email'].map((kind) =>
            $api.get<Record<string, unknown>>(`/settings/${kind}`),
          ),
        )
        if (current !== request) return
        integrations.whatsapp = { provider: 'MetaCloud', ...whatsapp }
        integrations.sms = sms || {}
        integrations.email = {
          smtp_port: 587,
          use_ssl: true,
          send_with_whatsapp: true,
          ...email,
        }
      } else if (section === 'templates') {
        const result = await $api.get('/templates')
        if (current === request)
          templates.value = normalizeSettingsList<MessageTemplate>(result)
      }
    } catch (cause) {
      if (current === request)
        error.value = normalizeApiError(cause, 'Settings could not be loaded.')
    } finally {
      if (current === request) loading.value = false
    }
  }
  const write = async (action: () => Promise<unknown>) => {
    if (
      saving.value ||
      !hasPermission(auth.user.value, PERMISSIONS.SettingsEdit)
    )
      return
    saving.value = true
    try {
      await action()
    } finally {
      saving.value = false
    }
  }
  const saveHospital = () =>
    write(async () => {
      await $api.put('/hospital-profile', {
        ...profile.value,
        departments: departments.value,
      })
    })
  const saveIntegration = (kind: 'whatsapp' | 'sms' | 'email') =>
    write(async () => {
      const source = integrations[kind]
      if (kind === 'whatsapp' && source.provider !== 'MetaCloud')
        throw new Error('Only Meta Cloud API is supported.')
      const payload =
        kind === 'whatsapp'
          ? {
              provider: 'MetaCloud',
              phoneNumberId: source.phone_number_id || null,
              wabaId: source.waba_id || null,
              accessToken: shouldSendSecret(source.access_token)
                ? source.access_token
                : null,
              verifyToken: source.verify_token || null,
              appSecret: shouldSendSecret(source.app_secret)
                ? source.app_secret
                : null,
              businessName: source.business_name || null,
              enabled: Boolean(source.enabled),
            }
          : kind === 'sms'
            ? {
                gatewayUrl: source.gateway_url || null,
                apiKey: shouldSendSecret(source.api_key)
                  ? source.api_key
                  : null,
                senderId: source.sender_id || null,
                enabled: Boolean(source.enabled),
              }
            : {
                smtpHost: source.smtp_host || null,
                smtpPort: Number(source.smtp_port || 587),
                smtpUsername: source.smtp_username || null,
                smtpPassword: shouldSendSecret(source.smtp_password)
                  ? source.smtp_password
                  : null,
                useSsl: source.use_ssl !== false,
                fromEmail: source.from_email || null,
                fromName: source.from_name || null,
                enabled: Boolean(source.enabled),
                sendWithWhatsApp: source.send_with_whatsapp !== false,
              }
      await $api.post(`/settings/${kind}`, payload)
      integrations[kind] = await $api.get<Record<string, unknown>>(
        `/settings/${kind}`,
      )
    })
  const createTemplate = (payload: Record<string, unknown>) =>
    write(async () => {
      await $api.post('/templates', payload)
      await load('templates')
    })
  const removeTemplate = (id: string | number) =>
    write(async () => {
      await $api.delete(`/templates/${encodeURIComponent(String(id))}`)
      templates.value = templates.value.filter((item) => item.id !== id)
    })
  onScopeDispose(() => {
    request++
  })
  return {
    profile,
    departments,
    integrations,
    templates,
    loading,
    saving,
    error,
    load,
    saveHospital,
    saveIntegration,
    createTemplate,
    removeTemplate,
  }
}
