export type DashboardOverview = Record<string, unknown> & {
  appointments_today?: number
  appointments_today_change_pct?: number
  new_inquiries_today?: number
  new_patients_change_pct?: number
  revenue_mtd?: number
  revenue_mtd_change_pct?: number
  care_score?: number
  care_score_change?: number
  appointments_week?: Array<Record<string, unknown>>
  appointments_last_week?: Array<Record<string, unknown>>
  revenue_week?: Array<Record<string, unknown>>
  revenue_month?: Array<Record<string, unknown>>
  revenue_last_month?: Array<Record<string, unknown>>
  upcoming_appointments?: UpcomingAppointment[]
}

export type UpcomingAppointment = {
  id: string | number
  patient_name?: string
  appointment_type?: string
  scheduled_at?: string
  duration_minutes?: number
  status?: string
}

export const useDashboardData = () => {
  const overview = useState<DashboardOverview | null>('dashboard-overview', () => null)
  const loading = useState('dashboard-loading', () => false)
  const error = useState<string | null>('dashboard-error', () => null)
  const auth = useTenantAuth()
  const canView = computed(() => hasPermission(auth.user.value, PERMISSIONS.DashboardView))

  const load = async () => {
    if (!auth.user.value || !canView.value) return
    loading.value = true
    error.value = null
    try {
      const { $api } = useNuxtApp()
      overview.value = await $api.get<DashboardOverview>('/dashboard/overview')
    } catch {
      overview.value = null
      error.value = 'Dashboard data could not be loaded. Please try again.'
    } finally {
      loading.value = false
    }
  }

  return { overview, loading, error, canView, load }
}
