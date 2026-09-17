import { normalizeApiError } from '~/utils/api/errors'
import type { MissedRevenueReport } from '~/utils/analytics'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'

export const useAnalytics = () => {
  const { $api } = useNuxtApp()
  const auth = useTenantAuth()
  const report = ref<MissedRevenueReport | null>(null)
  const loading = ref(false)
  const error = ref('')
  const canView = computed(() => hasPermission(auth.user.value, PERMISSIONS.DashboardView))
  let request = 0
  const load = async (silent = false) => {
    if (!canView.value) return
    const current = ++request
    if (!silent) loading.value = true
    error.value = ''
    try { const result = await $api.get<MissedRevenueReport>('/dashboard/missed-revenue'); if (current === request) report.value = result } catch (cause) { if (current === request) error.value = normalizeApiError(cause, 'Analytics could not be loaded.') } finally { if (current === request && !silent) loading.value = false }
  }
  onScopeDispose(() => { request++ })
  return { report, loading, error, canView, load }
}
