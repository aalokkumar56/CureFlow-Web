export function hospitalTimezone(
  tenant: Record<string, unknown> | null | undefined,
): string {
  const value = String(tenant?.timezone || tenant?.time_zone || 'Asia/Kolkata')
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return value
  } catch {
    return 'Asia/Kolkata'
  }
}

export function hospitalDay(value: unknown, timeZone: string): string {
  if (!value || Number.isNaN(new Date(String(value)).getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(String(value)))
}

export function hospitalTime(value: unknown, timeZone: string): string {
  if (!value || Number.isNaN(new Date(String(value)).getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(String(value)))
}
