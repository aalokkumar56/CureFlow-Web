import { normalizeApiError } from '~/utils/api/errors'
import { normalizeReferrers, type Referral, type ReferralAnalytics, type Referrer } from '~/utils/referrals'

export type ReferrerDraft = { name: string; clinic: string; specialty: string; phone: string; email: string; category: string; reconnect_every_days: number }
const emptyDraft = (): ReferrerDraft => ({ name: '', clinic: '', specialty: '', phone: '', email: '', category: 'specialist', reconnect_every_days: 30 })
export const useReferrals = (id?: Referrer['id']) => {
  const { $api } = useNuxtApp()
  const referrers = ref<Referrer[]>([]); const analytics = ref<ReferralAnalytics>({}); const detail = ref<{ doctor: Referrer; referrals: Referral[]; patients_referred?: number; total_revenue?: number } | null>(null)
  const loading = ref(false); const saving = ref(false); const error = ref(''); const draft = ref<ReferrerDraft>(emptyDraft()); let request = 0
  const load = async (params: Record<string, unknown> = {}) => { const current = ++request; loading.value = true; error.value = ''; try { const [doctors, stats] = await Promise.all([$api.get<unknown>('/doctors', params), $api.get<ReferralAnalytics>('/referrals/analytics')]); if (current === request) { referrers.value = normalizeReferrers(doctors); analytics.value = stats || {} } } catch (cause) { if (current === request) error.value = normalizeApiError(cause, 'Referral CRM could not be loaded.') } finally { if (current === request) loading.value = false } }
  const loadDetail = async (doctorId: Referrer['id']) => { loading.value = true; error.value = ''; try { detail.value = await $api.get(`/doctors/${encodeURIComponent(String(doctorId))}`) } catch (cause) { error.value = normalizeApiError(cause, 'Referrer details could not be loaded.') } finally { loading.value = false } }
  const create = async () => { saving.value = true; try { await $api.post('/doctors', { ...draft.value, reconnect_days: Number(draft.value.reconnect_every_days) || 30 }); draft.value = emptyDraft(); await load() } finally { saving.value = false } }
  const markContacted = async (doctorId: Referrer['id']) => { await $api.post(`/doctors/${encodeURIComponent(String(doctorId))}/mark-contacted`); await load() }
  const logReferral = async (doctorId: Referrer['id'], payload: Record<string, unknown>) => { await $api.post('/referrals', { ...payload, doctor_id: doctorId }); await loadDetail(doctorId) }
  onScopeDispose(() => { request++ })
  return { referrers, analytics, detail, loading, saving, error, draft, load, loadDetail, create, markContacted, logReferral }
}
