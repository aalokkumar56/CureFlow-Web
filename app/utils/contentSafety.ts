/** Permit remote attachments only after their exact HTTPS origin is approved. */
export function approvedMediaUrl(value: string, approvedOrigins: string): string | undefined {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return undefined
    const approved = approvedOrigins.split(',').map(origin => origin.trim()).filter(Boolean)
    if (!approved.includes(url.origin)) return undefined
    return url.href
  } catch { return undefined }
}

export function patientContactUrl(kind: 'tel' | 'mailto', value?: string): string | undefined {
  if (!value || /[\u0000-\u001f\u007f]/.test(value)) return undefined
  if (kind === 'tel') {
    const number = value.replace(/ /g, '')
    return /^\+?[0-9().-]+$/.test(number) ? `tel:${number}` : undefined
  }
  // Keep addresses as one mailbox; untrusted query/header values are not accepted.
  return /^[^\s@?&#:]+@[^\s@?&#:]+\.[^\s@?&#:]+$/.test(value) ? `mailto:${encodeURIComponent(value).replace(/%40/gi, '@')}` : undefined
}
