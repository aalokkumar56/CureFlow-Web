import { normalizeApiError } from '~/utils/api/errors'
import { campaignItems, type Campaign, type CampaignAudience, type CampaignDraft } from '~/utils/campaigns'

export const useCampaigns = () => {
  const { $api } = useNuxtApp()
  const campaigns = ref<Campaign[]>([])
  const drafts = ref<CampaignDraft[]>([])
  const departments = ref<string[]>([])
  const tags = ref<string[]>([])
  const loading = ref(false)
  const error = ref('')
  let request = 0

  const load = async (silent = false) => {
    const current = ++request
    if (!silent) loading.value = true
    error.value = ''
    try {
      const [campaignResult, draftResult] = await Promise.all([
        $api.get<unknown>('/campaigns'),
        $api.get<unknown>('/campaigns/suggested-drafts'),
      ])
      if (current !== request) return
      campaigns.value = campaignItems(campaignResult)
      drafts.value = campaignItems(draftResult) as CampaignDraft[]
    } catch (cause) {
      if (current === request) error.value = normalizeApiError(cause, 'Campaigns could not be loaded.')
    } finally {
      if (current === request && !silent) loading.value = false
    }
  }

  const loadMetadata = async () => {
    try {
      const [departmentResult, tagResult] = await Promise.all([
        $api.get<unknown>('/hospital-profile/departments'),
        $api.get<unknown>('/tags'),
      ])
      const normalize = (value: unknown) => (Array.isArray(value) ? value : (value && typeof value === 'object' && Array.isArray((value as { items?: unknown[] }).items) ? (value as { items: unknown[] }).items : []))
      departments.value = normalize(departmentResult).map(item => typeof item === 'string' ? item : String((item as { name?: unknown }).name || '')).filter(Boolean)
      tags.value = normalize(tagResult).map(item => typeof item === 'string' ? item : String((item as { name?: unknown }).name || '')).filter(Boolean)
    } catch {
      departments.value = []
      tags.value = []
    }
  }

  const previewAudience = (audience: CampaignAudience) =>
    $api.post<{ count?: number }>('/campaigns/preview-audience', audience)

  const create = (payload: Record<string, unknown>) =>
    $api.post<Campaign>('/campaigns', payload)

  const update = (id: string | number, payload: Record<string, unknown>) =>
    $api.patch<Campaign>(`/campaigns/${encodeURIComponent(id)}`, payload)

  onScopeDispose(() => { request++ })

  return { campaigns, drafts, departments, tags, loading, error, load, loadMetadata, previewAudience, create, update }
}
