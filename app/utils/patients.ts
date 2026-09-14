export const patientStatuses: Record<string, string> = {
  new_inquiry: 'New inquiry',
  contacted: 'Contacted',
  appointment_scheduled: 'Appointment scheduled',
  follow_up_pending: 'Follow-up pending',
  visited: 'Visited',
  no_response: 'No response',
  lost: 'Lost',
  re_engagement: 'Re-engagement',
}
export const patientSources: Record<string, string> = {
  website_form: 'Website form',
  phone_call: 'Phone call',
  whatsapp: 'WhatsApp',
  manual: 'Manual entry',
  referral: 'Referral',
  csv_import: 'CSV import',
}
export const patientDate = (value?: unknown, timeZone?: string) => {
  if (typeof value !== 'string' || !value || Number.isNaN(Date.parse(value)))
    return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}
export const patientLabel = (value: unknown) =>
  String(value ?? '').replace(/_/g, ' ') || '—'
export const patientInitials = (name?: string) =>
  (name || 'Patient')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
export function patientList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (
    value &&
    typeof value === 'object' &&
    'items' in value &&
    Array.isArray(value.items)
  )
    return value.items as T[]
  return []
}
export function downloadPatientCsv(rows: unknown[][], filename: string) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          let value = String(cell ?? '')
          if (/^[\s]*[=+@-]/.test(value)) value = `'${value}`
          return `"${value.replace(/"/g, '""')}"`
        })
        .join(','),
    )
    .join('\r\n')
  const url = URL.createObjectURL(
    new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
