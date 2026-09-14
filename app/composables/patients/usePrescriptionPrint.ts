import { normalizeApiError } from '~/utils/api/errors'

export function usePrescriptionPrint() {
  const { $api } = useNuxtApp()
  const printing = ref(false)
  const printError = ref('')
  async function printPrescription(id: string) {
    if (printing.value) return
    printError.value = ''
    const preview = window.open('', '_blank')
    if (!preview) { printError.value = 'Allow pop-ups to open the prescription print preview.'; return }
    preview.opener = null
    printing.value = true
    try {
      const document = await $api.download(`/prescriptions/${encodeURIComponent(id)}/print`)
      const url = URL.createObjectURL(new Blob([document], { type: 'text/html' }))
      preview.location.replace(url)
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (cause) { preview.close(); printError.value = normalizeApiError(cause, 'Prescription print preview could not be opened.') }
    finally { printing.value = false }
  }
  return { printing, printError, printPrescription }
}
