export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | string

export type CampaignAudience = {
  tags?: string[]
  departments?: string[]
  statuses?: string[]
  genders?: string[]
  patient_ids?: string[]
  inactive_days?: number | null
}

export type Campaign = {
  id: string | number
  name?: string
  description?: string
  message_body?: string
  messageBody?: string
  status?: CampaignStatus
  scheduled_at?: string
  sent_at?: string
  created_at?: string
  total_recipients?: number
  sent_count?: number
  delivered_count?: number
  replied_count?: number
  failed_count?: number
  audience?: CampaignAudience
  audience_json?: string
  [key: string]: unknown
}

export type CampaignDraft = {
  event_id?: string | number
  name?: string
  draft_name?: string
  category?: string
  event_date?: string
  suggested_message?: string
  [key: string]: unknown
}

export type CampaignRecipient = {
  id: string | number
  patient_name?: string
  patient_phone?: string
  status?: string
  sent_at?: string
  [key: string]: unknown
}

export const campaignItems = (payload: unknown): Campaign[] => {
  if (Array.isArray(payload)) return payload as Campaign[]
  if (!payload || typeof payload !== 'object') return []
  const value = payload as Record<string, unknown>
  if (Array.isArray(value.items)) return value.items as Campaign[]
  if (Array.isArray(value.data)) return value.data as Campaign[]
  return []
}

export const statusColumn = (campaign: Campaign) => {
  const status = String(campaign.status || '').toLowerCase()
  if (status === 'sent' || status === 'sending') return 'sent'
  if (status === 'scheduled') return 'scheduled'
  return 'draft'
}

export const campaignMessage = (campaign: Campaign) => campaign.message_body || campaign.messageBody || 'Your message preview…'

export const formatCampaignDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export const formatCampaignShortDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
