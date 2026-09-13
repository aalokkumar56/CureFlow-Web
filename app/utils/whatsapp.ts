export type WhatsAppConversation = {
  id: string | number
  display_name?: string
  name?: string
  wa_phone?: string
  phone?: string
  last_message_preview?: string
  unread_count?: number
  priority?: string
  category?: string
  escalated?: boolean
  [key: string]: unknown
}

export type WhatsAppMessage = {
  id?: string | number
  direction?: string
  status?: string
  type?: string
  body?: string
  caption?: string
  media_url?: string
  mediaUrl?: string
  file_name?: string
  fileName?: string
  media_size?: number
  mediaSize?: number
  created_at?: string
  sent_at?: string
  [key: string]: unknown
}

export type WhatsAppTemplate = {
  id: string | number
  name?: string
  body?: string
  category?: string
  [key: string]: unknown
}

export type WhatsAppStatus = {
  enabled?: boolean
  is_configured?: boolean
  message?: string
}

export const conversationName = (conversation: WhatsAppConversation) =>
  conversation.display_name || conversation.name || conversation.wa_phone || conversation.phone || 'Unknown contact'

export const formatPhone = (phone?: string) => phone || 'No phone number'

export const formatMessageStatus = (status?: string) =>
  status
    ? status.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
    : ''

export const formatBytes = (value?: number) => {
  const bytes = Number(value || 0)
  if (!bytes || Number.isNaN(bytes)) return ''
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

export const renderMessageTemplate = (
  template: string,
  values: Record<string, unknown> = {},
) => template.replace(/\{\{?\s*(\w+)\s*\}?\}/g, (_, key: string) => String(values[key.toLowerCase()] ?? values[key] ?? ''))

export const conversationItems = (payload: unknown): WhatsAppConversation[] => {
  if (Array.isArray(payload)) return payload as WhatsAppConversation[]
  if (!payload || typeof payload !== 'object') return []
  const value = payload as Record<string, unknown>
  if (Array.isArray(value.items)) return value.items as WhatsAppConversation[]
  if (Array.isArray(value.data)) return value.data as WhatsAppConversation[]
  return []
}

export const visibleTemplates = (templates: WhatsAppTemplate[]) =>
  templates.filter((template) => {
    const category = String(template.category || '').toLowerCase()
    return category !== 'appointment_confirmation' && category !== 'appointment' && !/appointment confirmation/i.test(String(template.name || ''))
  })
