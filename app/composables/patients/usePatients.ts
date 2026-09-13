import { normalizeApiError } from '~/utils/api/errors'
import { patientList } from '~/utils/patients'

export type PatientStatus = string
export interface PatientRecord {
  id: string | number
  name?: string
  phone?: string
  email?: string
  gender?: string
  age?: number | null
  department?: string
  status?: string
  inquiry_source?: string
  tags?: string[]
  created_at?: string
  last_contact_at?: string
  follow_up_date?: string
  date_of_birth?: string
  notes?: string
  [key: string]: unknown
}
export type PatientPagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}
export const usePatients = () => {
  const { $api } = useNuxtApp()
  // Component-owned data cannot survive a tenant/session change in a global cache.
  const patients = ref<PatientRecord[]>([])
  const pagination = ref<PatientPagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  })
  const loading = ref(false)
  const error = ref<string | null>(null)
  let request = 0
  const load = async (
    query = '',
    status = 'all',
    page = 1,
    pageSize = 10,
    department = 'all',
    source = 'all',
  ) => {
    const current = ++request
    loading.value = true
    error.value = null
    try {
      const result = await $api.get<Record<string, unknown>>('/patients', {
        q: query.trim() || undefined,
        status: status === 'all' ? undefined : status,
        department: department === 'all' ? undefined : department,
        inquiry_source: source === 'all' ? undefined : source,
        page,
        page_size: pageSize,
      })
      if (current !== request) return
      patients.value = patientList<PatientRecord>(result)
      const total = Math.max(
        0,
        Number(result.total ?? patients.value.length) || 0,
      )
      pagination.value = {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      }
    } catch (cause) {
      if (current !== request) return
      patients.value = []
      error.value = normalizeApiError(cause, 'Patients could not be loaded.')
    } finally {
      if (current === request) loading.value = false
    }
  }
  onScopeDispose(() => {
    request++
  })
  return {
    patients,
    pagination,
    loading,
    error,
    load,
    getById: (id: string | number) =>
      $api.get<PatientRecord>(`/patients/${encodeURIComponent(id)}`),
    create: (payload: Record<string, unknown>) =>
      $api.post<{ id: string }>('/patients', payload),
    update: (id: string | number, payload: Record<string, unknown>) =>
      $api.patch(`/patients/${encodeURIComponent(id)}`, payload),
  }
}
