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
  departments: string[]
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

const doctorId = (doctor: Record<string, unknown>) =>
  doctor.user_id ??
  doctor.userId ??
  doctor.doctor_user_id ??
  doctor.doctorUserId ??
  doctor.id

const doctorName = (doctor: Record<string, unknown>) =>
  doctor.name ??
  doctor.display_name ??
  doctor.displayName ??
  doctor.user_name ??
  doctor.userName ??
  doctor.full_name ??
  doctor.fullName

export const normalizeBookingDoctors = (response: unknown): BookingDoctor[] => {
  const seen = new Set<string>()
  const doctors: BookingDoctor[] = []

  for (const doctor of normalizeList<Record<string, unknown>>(response)) {
    const id = doctorId(doctor)
    const name = doctorName(doctor)

    if ((typeof id !== 'string' && typeof id !== 'number') || !name) {
      continue
    }

    const key = String(id)
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    doctors.push({
      user_id: id,
      name: String(name),
      department: doctor.department ? String(doctor.department) : undefined,
    })
  }

  return doctors.sort((a, b) => a.name.localeCompare(b.name))
}

export const normalizeDepartments = (response: unknown) =>
  normalizeList<string | { name?: unknown }>(response)
    .map((item) => (typeof item === 'string' ? item : String(item.name || '')))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))

export const useAppointments = () => {
  const auth = useTenantAuth()
  const appointments = useState<Appointment[]>('tenant-appointments', () => [])
  const options = useState<BookingOptions>('tenant-appointment-options', () => ({ doctors: [], departments: [] }))
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
    const { $api } = useNuxtApp()
    const [bookingResult, departmentResult, staffResult] = await Promise.allSettled([
      $api.get<Partial<BookingOptions>>('/appointments/booking-options'),
      $api.get<unknown>('/hospital-profile/departments'),
      $api.get<unknown>('/staff/doctors'),
    ])
    const bookingOptions = bookingResult.status === 'fulfilled' ? bookingResult.value : {}
    const departmentResponse = departmentResult.status === 'fulfilled' ? departmentResult.value : []
    const staffResponse = staffResult.status === 'fulfilled' ? staffResult.value : []
    const bookingDoctors = normalizeBookingDoctors(bookingOptions.doctors || bookingOptions)
    const staffDoctors = normalizeBookingDoctors(staffResponse)
    options.value = {
      doctors: normalizeBookingDoctors([...bookingDoctors, ...staffDoctors]),
      departments: normalizeDepartments(departmentResponse),
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
