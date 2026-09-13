import { normalizeApiError } from '~/utils/api/errors'
import { normalizeFollowUps, type FollowUp, type FollowUpDraft } from '~/utils/followups'

const emptyDraft = (): FollowUpDraft => ({ title: '', type: 'follow_up', priority: 'medium', due_at: '', notes: '' })

export const useFollowUps = () => {
  const { $api } = useNuxtApp()
  const followUps = ref<FollowUp[]>([])
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const draft = ref<FollowUpDraft>(emptyDraft())
  let request = 0

  const load = async (silent = false) => {
    const current = ++request
    if (!silent) loading.value = true
    error.value = ''
    try {
      const response = await $api.get<unknown>('/tasks')
      if (current === request) followUps.value = normalizeFollowUps(response)
    } catch (cause) {
      if (current === request) error.value = normalizeApiError(cause, 'Follow-ups could not be loaded.')
    } finally {
      if (current === request && !silent) loading.value = false
    }
  }

  const create = async () => {
    if (!draft.value.title.trim()) throw new Error('Title is required.')
    saving.value = true
    try {
      await $api.post('/tasks', { ...draft.value, title: draft.value.title.trim(), due_at: draft.value.due_at ? new Date(draft.value.due_at).toISOString() : null })
      draft.value = emptyDraft()
      await load(true)
    } finally {
      saving.value = false
    }
  }

  const updateStatus = async (id: FollowUp['id'], status: string) => {
    const previous = followUps.value
    followUps.value = previous.map(item => item.id === id ? { ...item, status } : item)
    try {
      await $api.patch(`/tasks/${encodeURIComponent(String(id))}`, { status })
      await load(true)
    } catch (cause) {
      followUps.value = previous
      throw cause
    }
  }

  const remove = async (id: FollowUp['id']) => {
    await $api.delete(`/tasks/${encodeURIComponent(String(id))}`)
    followUps.value = followUps.value.filter(item => item.id !== id)
  }

  onScopeDispose(() => { request++ })
  return { followUps, loading, saving, error, draft, load, create, updateStatus, remove }
}
