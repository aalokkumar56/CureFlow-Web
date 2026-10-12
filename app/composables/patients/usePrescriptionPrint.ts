import { normalizeApiError } from '~/utils/api/errors'
import DOMPurify from 'dompurify'

export function usePrescriptionPrint() {
  const { $api } = useNuxtApp()
  const auth = useTenantAuth()
  const printing = ref(false)
  const printError = ref('')
  let generation = 0
  let activePreview: HTMLDialogElement | undefined
  function closePreview() {
    generation++
    if (activePreview?.open) activePreview.close()
    activePreview = undefined
  }
  watch(auth.authority, value => { if (value !== 'verified') closePreview() }, { flush: 'sync' })
  onBeforeUnmount(closePreview)
  async function printPrescription(id: string) {
    if (printing.value || auth.authority.value !== 'verified') return
    closePreview()
    const current = generation
    printError.value = ''
    printing.value = true
    try {
      const response = await $api.download(`/prescriptions/${encodeURIComponent(id)}/print`)
      const source = await response.text()
      if (current !== generation || auth.authority.value !== 'verified') return
      const content = DOMPurify.sanitize(source, {
        ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'div', 'span', 'strong', 'em', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['class', 'colspan', 'rowspan'], ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false,
      })
      // Backend headers do not survive conversion to a Blob. The preview owns
      // its policy, styles and controls; retained clinical text is never changed.
      const policy = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>Prescription</title><style>body{font-family:Georgia,serif;max-width:720px;margin:24px auto;color:#111}h1{font-size:20px;margin:0}.muted{color:#666;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ccc;padding:6px 8px;font-size:13px;text-align:left}th{background:#f5f5f5}@media print{body{margin:0}}</style></head><body>${content}</body></html>`
      const page = document
      const preview = page.createElement('dialog')
      preview.setAttribute('aria-label', 'Prescription print preview')
      preview.style.width = 'min(90vw, 900px)'
      preview.style.maxHeight = '95vh'
      preview.style.margin = 'auto'
      preview.style.padding = '20px'
      preview.style.borderRadius = '12px'
      const heading = page.createElement('h2')
      heading.textContent = 'Prescription print preview'
      const button = page.createElement('button')
      button.type = 'button'
      button.textContent = 'Print prescription'
      button.disabled = true
      const close = page.createElement('button')
      close.type = 'button'
      close.textContent = 'Close preview'
      close.autofocus = true
      close.addEventListener('click', closePreview)
      const frame = page.createElement('iframe')
      frame.title = 'Prescription preview'
      // Scripts/forms/navigation are disabled. Same-origin access permits only
      // the trusted outer control to invoke the browser print dialog.
      frame.setAttribute('sandbox', 'allow-same-origin allow-modals')
      frame.style.width = '100%'
      frame.style.height = '70vh'
      frame.style.border = '0'
      frame.addEventListener('load', () => { button.disabled = false }, { once: true })
      button.addEventListener('click', () => { frame.contentWindow?.focus(); frame.contentWindow?.print() })
      preview.append(heading, button, close, frame)
      preview.addEventListener('close', () => {
        preview.remove()
        if (activePreview === preview) activePreview = undefined
      }, { once: true })
      page.body.appendChild(preview)
      activePreview = preview
      frame.srcdoc = html
      preview.showModal()
    } catch (cause) { closePreview(); printError.value = normalizeApiError(cause, 'Prescription print preview could not be opened.') }
    finally { printing.value = false }
  }
  return { printing, printError, printPrescription }
}
