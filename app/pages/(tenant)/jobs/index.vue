<script setup lang="ts">
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
import { normalizeApiError } from '~/utils/api/errors'

definePageMeta({ layout: 'tenant', middleware: ['tenant-auth', 'tenant-approval'] })
useHead({ title: 'Background tasks' })
type Job = { id: string; event_type: string; schema_version: number; state: string; attempts: number; operator_retries: number; due_at: string; failure_code?: string; revision: number }
type Receipt = { resource_id: string; revision: number; outcome: string }
const { $api } = useNuxtApp()
const auth = useTenantAuth()
const canView = computed(() => auth.authority.value === 'verified' && hasPermission(auth.user.value, PERMISSIONS.JobView))
const canRetry = computed(() => canView.value && hasPermission(auth.user.value, PERMISSIONS.JobRetry))
const rows = ref<Job[]>([])
const selected = ref<Job | null>(null)
const etag = ref('')
const loading = ref(false)
const reviewing = ref(false)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const filter = ref('')
const intents = new Map<string, { key: string; etag: string; revision: number }>()
const visible = computed(() => rows.value.filter(row => !filter.value || row.event_type === filter.value))
const types = computed(() => [...new Set(rows.value.map(row => row.event_type))])
let generation = 0
let selection = 0
let alive = true
const date = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Not recorded'
async function load() {
  if (!canView.value || loading.value) return
  const current = generation
  loading.value = true; error.value = ''
  try {
    const result = await $api.get<Job[]>('/jobs/failed', { limit: 50 })
    if (!Array.isArray(result)) throw new Error('The background task list is unavailable. Try refreshing later.')
    if (alive && current === generation && canView.value) rows.value = result
  } catch (cause) { if (alive && current === generation) error.value = normalizeApiError(cause, 'Background tasks could not be loaded.') }
  finally { if (current === generation) loading.value = false }
}
async function open(id: string) {
  if (!canView.value || saving.value) return
  const current = generation, request = ++selection
  selected.value = null; etag.value = ''; reviewing.value = true; error.value = ''
  try {
    const result = await $api.getVersioned<Job>(`/jobs/${encodeURIComponent(id)}`)
    if (!alive || current !== generation || request !== selection || !canView.value) return
    const expected = `"job:${id.replaceAll('-', '').toLowerCase()}:${result.data.revision}"`
    if (result.data.id !== id || !Number.isSafeInteger(result.data.revision) || result.data.revision < 1 || result.etag !== expected)
      throw new Error('The task version could not be verified. Refresh before retrying.')
    selected.value = result.data; etag.value = result.etag
    const pending = intents.get(id)
    if (pending && result.data.revision !== pending.revision) intents.delete(id)
  } catch (cause) { if (alive && current === generation && request === selection) error.value = normalizeApiError(cause, 'Task details could not be loaded.') }
  finally { if (request === selection) reviewing.value = false }
}
async function retry() {
  const job = selected.value
  if (!job || !canRetry.value || saving.value || job.state !== 'failed' || !etag.value) return
  if (!window.confirm('Queue one retry of this background task? Completion will be shown only after processing finishes.')) return
  const current = generation
  const intent = intents.get(job.id) || { key: crypto.randomUUID(), etag: etag.value, revision: job.revision }
  intents.set(job.id, intent)
  saving.value = true; error.value = ''; notice.value = ''
  let accepted = false
  try {
    const receipt = await $api.post<Receipt>(`/jobs/${job.id}/retry`, undefined, { ifMatch: intent.etag, idempotencyKey: intent.key })
    if (!alive || current !== generation || !canView.value) return
    if (receipt.resource_id !== job.id || receipt.outcome !== 'accepted' || !Number.isSafeInteger(receipt.revision) || receipt.revision <= intent.revision)
      throw new Error('The retry outcome is unconfirmed. Check task status before trying again.')
    intents.delete(job.id)
    notice.value = 'Retry accepted and queued. Processing has not completed. Check task status for the outcome.'
    accepted = true
  } catch (cause: any) {
    if (alive && current === generation) {
      error.value = normalizeApiError(cause, 'The retry outcome is unconfirmed. Check task status before trying again.')
      if ([400, 403, 409, 412, 428].includes(cause?.response?.status)) {
        intents.delete(job.id); selected.value = null; etag.value = ''
        notice.value = 'Review the current task before choosing another retry.'
      } else notice.value = 'Check task status first. An explicit retry of the same request keeps its original request key.'
    }
  } finally { if (current === generation) saving.value = false }
  if (accepted && current === generation) { await open(job.id); await load() }
}
watch(canView, allowed => {
  generation++; selection++; rows.value = []; selected.value = null; etag.value = ''; intents.clear()
  loading.value = false; reviewing.value = false; saving.value = false; error.value = ''; notice.value = ''
  if (allowed) void load()
}, { flush: 'sync' })
onMounted(load)
onBeforeUnmount(() => { alive = false; generation++; selection++; intents.clear() })
</script>

<template>
  <section class="patient-clinical-panel">
    <header class="patient-section-header"><div><h1>Background tasks</h1><p>Review failed processing and queue an authorized retry.</p></div><button v-if="canView" type="button" class="patients-secondary-btn" :disabled="loading || saving" @click="load">Refresh failed tasks</button></header>
    <p v-if="!canView" role="alert">You do not have permission to view background tasks.</p>
    <template v-else>
      <FormError :error="error" />
      <p v-if="notice" role="status">{{ notice }}</p>
      <label>Task type<select v-model="filter"><option value="">All task types</option><option v-for="type in types" :key="type" :value="type">{{ type }}</option></select></label>
      <p v-if="loading" role="status">Loading failed tasks…</p>
      <p v-else-if="!visible.length && !error">No failed tasks in this view.</p>
      <article v-for="job in visible" :key="job.id" class="patient-record-card"><h2>{{ job.event_type }}</h2><p>{{ job.id }} · {{ job.attempts }} processing attempts · {{ job.operator_retries }} operator retries</p><p>Due {{ date(job.due_at) }} · Failure code: {{ job.failure_code || 'Not recorded' }}</p><button type="button" class="patients-secondary-btn" :disabled="saving" @click="open(job.id)">Review task</button></article>
      <p v-if="reviewing" role="status">Loading current task status…</p>
      <article v-if="selected" class="patient-record-card" aria-label="Task details"><h2>Task details</h2><p>{{ selected.event_type }} · {{ selected.id }}</p><p role="status">Current status: {{ selected.state }}</p><p>Processing attempts: {{ selected.attempts }} · Operator retries: {{ selected.operator_retries }} · Version: {{ selected.revision }}</p><p>Due {{ date(selected.due_at) }} · Failure code: {{ selected.failure_code || 'Not recorded' }}</p><button type="button" class="patients-secondary-btn" :disabled="reviewing || saving" @click="open(selected.id)">Check task status</button><button v-if="canRetry && selected.state === 'failed'" type="button" class="patients-primary-btn" :disabled="saving || reviewing || !etag" @click="retry">{{ saving ? 'Queuing retry…' : intents.has(selected.id) ? 'Retry the same request' : 'Queue one retry' }}</button><p v-if="selected.state === 'pending'">This task is queued. A queued retry does not confirm that its effect completed.</p></article>
    </template>
  </section>
</template>
