export type ReferrerCategory = 'family_gp' | 'specialist' | 'consultant' | 'clinic' | 'hospital' | 'other' | string
export type Referrer = {
  id: string | number
  name: string
  clinic?: string | null
  specialty?: string | null
  phone?: string | null
  email?: string | null
  category?: ReferrerCategory
  tags?: string[]
  notes?: string | null
  last_contact_at?: string | null
  reconnect_every_days?: number
  needs_reconnect?: boolean
  patients_referred?: number
  total_revenue?: number
}
export type Referral = { id: string | number; patient_id?: string | number; patient_name?: string; revenue?: number; notes?: string; created_at?: string }
export type ReferralAnalytics = { total_referrals?: number; total_revenue?: number; top_doctors?: Array<{ doctor_id: string | number; doctor_name?: string; count?: number; revenue?: number }> }
export const referrerCategories: Record<string, string> = { family_gp: 'Family GP', specialist: 'Specialist', consultant: 'Consultant', clinic: 'Clinic', hospital: 'Hospital', other: 'Other' }
export const referralStages = [
  { id: 'lead', label: 'Lead', subtitle: 'New leads not yet contacted', tone: 'blue' },
  { id: 'contacted', label: 'Contacted', subtitle: 'Contacted and awaiting a response', tone: 'teal' },
  { id: 'referred', label: 'Referred', subtitle: 'Actively referring patients', tone: 'violet' },
  { id: 'converted', label: 'Converted', subtitle: 'Referred patients with recorded revenue', tone: 'amber' },
] as const
export const normalizeReferrers = (value: unknown): Referrer[] => {
  const items = Array.isArray(value) ? value : value && typeof value === 'object' && Array.isArray((value as { items?: unknown[] }).items) ? (value as { items: unknown[] }).items : []
  return items.filter(Boolean).map(item => ({ ...(item as Referrer), id: String((item as Referrer).id), name: String((item as Referrer).name || 'Unnamed referrer') })).filter(item => Boolean(item.id))
}
export const referrerStage = (doctor: Referrer) => {
  if (!doctor.last_contact_at) return 'lead'
  if (!Number(doctor.patients_referred || 0)) return 'contacted'
  if (doctor.needs_reconnect) return 'referred'
  return 'converted'
}
export const referrerInitials = (name: string) => { const parts = name.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/).filter(Boolean); return (parts.length > 1 ? `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}` : parts[0]?.slice(0, 2) || '?').toUpperCase() }
const avatarColors = ['sky', 'violet', 'amber', 'emerald', 'rose', 'indigo']
export const referrerColor = (name: string) => { let hash = 0; for (const char of name) hash = char.charCodeAt(0) + ((hash << 5) - hash); return avatarColors[Math.abs(hash) % avatarColors.length] || 'sky' }
export const formatReferralMoney = (value: unknown) => `₹${Number(value || 0).toLocaleString('en-IN')}`
export const formatReferralDate = (value?: string | null) => value ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : '—'
