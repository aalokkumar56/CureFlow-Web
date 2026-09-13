import { normalizeApiError } from '~/utils/api/errors'
import { conversationItems, type WhatsAppConversation, type WhatsAppStatus, type WhatsAppTemplate } from '~/utils/whatsapp'

export const useWhatsappInbox = () => {
  const { $api } = useNuxtApp()
  const conversations = ref<WhatsAppConversation[]>([])
  const templates = ref<WhatsAppTemplate[]>([])
  const status = ref<WhatsAppStatus | null>(null)
  const loading = ref(false)
  const error = ref('')
  let request = 0

  const loadConversations = async (search = '', silent = false) => {
    const current = ++request
    if (!silent) loading.value = true
    error.value = ''
    try {
      const result = await $api.get<unknown>('/conversations', {
        q: search.trim() || undefined,
        page: 1,
        page_size: 100,
      })
      if (current === request) conversations.value = conversationItems(result)
    } catch (cause) {
      if (current === request) {
        conversations.value = []
        error.value = normalizeApiError(cause, 'Conversations could not be loaded.')
      }
    } finally {
      if (current === request && !silent) loading.value = false
    }
  }

  const loadStatus = async () => {
    try {
      status.value = await $api.get<WhatsAppStatus>('/settings/whatsapp/status')
    } catch {
      status.value = { enabled: false, is_configured: false, message: 'Unable to load WhatsApp status.' }
    }
  }

  const loadTemplates = async () => {
    try {
      const result = await $api.get<unknown>('/templates')
      templates.value = Array.isArray(result)
        ? result as WhatsAppTemplate[]
        : Array.isArray((result as { items?: unknown[] })?.items)
          ? (result as { items: WhatsAppTemplate[] }).items
          : []
    } catch {
      templates.value = []
    }
  }

  onScopeDispose(() => { request++ })

  return {
    conversations,
    templates,
    status,
    loading,
    error,
    loadConversations,
    loadStatus,
    loadTemplates,
  }
}
