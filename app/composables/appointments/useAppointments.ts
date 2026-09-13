export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | string

export type Appointment = {
  id: string | number
  patient_id?: string | number
  patient_name?: string
  doctor_name?: string
  doctor_user_id?: string | number
  department?: string
  scheduled_at?: string
  duration_minutes?: number
  chief_complaint?: string
  status: AppointmentStatus
  notes?: string
  consultation_fee?: number
  is_paid?: boolean
}

export type BookingDoctor = {
  user_id: string | number
  name: string
  department?: string
}

export type BookingOptions = {
  doctors: BookingDoctor[]
}

type AppointmentRange = {
  from: string
  to: string
}

const normalizeList = <T>(response: unknown): T[] => {
  if (Array.isArray(response)) {
    return response as T[]
  }

  if (response && typeof response === 'object') {
    const items = (response as { items?: unknown[] }).items
    if (Array.isArray(items)) {
      return items as T[]
    }
  }

  return []
}

export const useAppointments = () => {
  const auth = useTenantAuth()
  const appointments = useState<Appointment[]>('tenant-appointments', () => [])
  const options = useState<BookingOptions>('tenant-appointment-options', () => ({ doctors: [] }))
  const loading = useState('tenant-appointments-loading', () => false)
  const error = useState<string | null>('tenant-appointments-error', () => null)

  const load = async (range: AppointmentRange) => {
    if (!auth.user.value) {
      appointments.value = []
      return
    }

    loading.value = true
    error.value = null

    try {
      const { $api } = useNuxtApp()
      const response = await $api.get<unknown>('/appointments', {
        ...range,
        page: 1,
        page_size: 100,
      })

      appointments.value = normalizeList<Appointment>(response)
    } catch {
      appointments.value = []
      error.value = 'Appointments could not be loaded.'
    } finally {
      loading.value = false
    }
  }

  const loadOptions = async () => {
    try {
      const { $api } = useNuxtApp()
      options.value = await $api.get<BookingOptions>('/appointments/booking-options')
    } catch {
      options.value = { doctors: [] }
    }
  }

  const updateStatus = async (id: Appointment['id'], status: string) => {
    const { $api } = useNuxtApp()
    await $api.patch(`/appointments/${id}/status`, { status })
  }

  const create = async (payload: Record<string, unknown>) => {
    const { $api } = useNuxtApp()
    await $api.post('/appointments', payload)
  }

  return {
    appointments,
    options,
    loading,
    error,
    load,
    loadOptions,
    updateStatus,
    create,
  }
}
