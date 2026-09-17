import { normalizeApiError } from '~/utils/api/errors'

export type Lead = {
  id: string
  phone: string
  name: string | null
  age: number | null
  gender: string
  converted_at: string | null
  converted_patient_id: string | null
  sent_count: number
  failed_count: number
  scheduled_count: number
  last_sent_at: string | null
}

export type LeadPage = {
  items: Lead[]
  total: number
  page: number
  page_size: number
  summary: { total: number; active: number; converted: number }
}

export type LeadImportResult = {
  inserted: number
  skipped: number
  errors: string[]
}

export const useLeads = () => {
  const { $api } = useNuxtApp()
  const error = ref('')
  const saving = ref(false)
  const list = (params: Record<string, unknown>) =>
    $api.get<LeadPage>('/leads', params)
  const mutate = async (action: () => Promise<unknown>) => {
    if (saving.value) return false
    saving.value = true
    error.value = ''
    try {
      await action()
      return true
    } catch (cause) {
      error.value = normalizeApiError(cause, 'The lead could not be saved.')
      return false
    } finally {
      saving.value = false
    }
  }
  return { $api, error, saving, list, mutate }
}
