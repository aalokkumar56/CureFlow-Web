<script setup lang="ts">
import { PhArrowLeft, PhCalendarBlank, PhChatCircle, PhCheckCircle, PhClock, PhPaperPlaneTilt, PhTrash, PhUsersThree, PhXCircle } from '@phosphor-icons/vue'
import { normalizeApiError } from '~/utils/api/errors'
import { formatCampaignDate, type Campaign, type CampaignAudience, type CampaignRecipient } from '~/utils/campaigns'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'

definePageMeta({ layout: 'tenant', middleware: ['tenant-auth', 'tenant-approval'] })

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const auth = useTenantAuth()
const canManage = computed(() => hasPermission(auth.user.value, PERMISSIONS.CampaignManage))
const campaign = ref<Campaign | null>(null)
const recipients = ref<CampaignRecipient[]>([])
const audience = ref<CampaignAudience | null>(null)
const loading = ref(true)
const actionLoading = ref(false)
const error = ref('')
const scheduleOpen = ref(false)
const confirmOpen = ref(false)
const scheduledAt = ref('')

const load = async () => {
  loading.value = true
  error.value = ''
  try {
    const result = await $api.get<{ campaign?: Campaign; recipients?: CampaignRecipient[]; audience?: CampaignAudience }>(`/campaigns/${encodeURIComponent(String(route.params.id))}`)
    campaign.value = result.campaign || null
    recipients.value = result.recipients || []
    audience.value = result.audience || result.campaign?.audience || (result.campaign?.audience_json ? JSON.parse(result.campaign.audience_json) : null)
  } catch (cause) { error.value = normalizeApiError(cause, 'Campaign details could not be loaded.') } finally { loading.value = false }
}
const send = async () => { if (!campaign.value) return; actionLoading.value = true; try { await $api.post(`/campaigns/${campaign.value.id}/send`); confirmOpen.value = false; await load() } catch (cause) { error.value = normalizeApiError(cause, 'Campaign could not be sent.') } finally { actionLoading.value = false } }
const schedule = async () => { if (!campaign.value || !scheduledAt.value) return; actionLoading.value = true; try { await $api.post(`/campaigns/${campaign.value.id}/schedule`, { scheduledAt: new Date(scheduledAt.value).toISOString() }); scheduleOpen.value = false; await load() } catch (cause) { error.value = normalizeApiError(cause, 'Campaign could not be scheduled.') } finally { actionLoading.value = false } }
const clearSchedule = async () => { if (!campaign.value) return; actionLoading.value = true; try { await $api.patch(`/campaigns/${campaign.value.id}`, { clearSchedule: true }); await load() } catch (cause) { error.value = normalizeApiError(cause, 'Schedule could not be canceled.') } finally { actionLoading.value = false } }
const remove = async () => { if (!campaign.value || !confirm('Delete this campaign?')) return; actionLoading.value = true; try { await $api.delete(`/campaigns/${campaign.value.id}`); await router.push('/campaigns') } catch (cause) { error.value = normalizeApiError(cause, 'Campaign could not be deleted.') } finally { actionLoading.value = false } }
const criteria = (value?: string[]) => value?.length ? value.map(item => item.replace(/_/g, ' ')).join(', ') : 'All'
const selectedPatientCriteria = computed(() => audience.value?.patient_ids?.length ? `${audience.value.patient_ids.length} selected` : 'All')
const statusClass = (status?: string) => `status-${String(status || 'draft').toLowerCase()}`

useHead(() => ({ title: campaign.value?.name || 'Campaign details' }))
onMounted(load)
</script>

<template>
  <section class="campaign-detail-page">
    <div v-if="loading" class="campaign-loading">Loading campaign…</div>
    <div v-else-if="error" class="campaign-empty"><p>{{ error }}</p><button type="button" class="campaign-secondary-button" @click="load">Try again</button></div>
    <template v-else-if="campaign">
      <header class="campaign-detail-header"><div><NuxtLink to="/campaigns" class="campaign-back-link"><PhArrowLeft :size="16" /> Campaigns</NuxtLink><h2>{{ campaign.name || 'Untitled campaign' }}</h2><p>{{ campaign.description || 'Campaign details' }}</p></div><div class="campaign-detail-actions"><button v-if="campaign.status === 'draft' && canManage" type="button" class="campaign-secondary-button" :disabled="actionLoading" @click="scheduleOpen = true"><PhClock :size="16" /> Schedule automatic sending</button><button v-if="campaign.status === 'draft' && canManage" type="button" class="campaign-primary-button campaign-send-button" :disabled="actionLoading" @click="confirmOpen = true"><PhPaperPlaneTilt :size="16" /> Send now</button><button v-if="campaign.status === 'scheduled' && canManage" type="button" class="campaign-secondary-button" :disabled="actionLoading" @click="clearSchedule">Cancel automatic sending</button></div></header>
      <p v-if="error" class="campaign-alert" role="alert">{{ error }}</p>
      <div class="campaign-detail-grid"><main class="campaign-detail-main"><section class="campaign-detail-card campaign-status-card"><div><span class="campaign-status" :class="statusClass(campaign.status)">{{ campaign.status || 'draft' }}</span><span v-if="campaign.scheduled_at" class="campaign-schedule-label"><PhCalendarBlank :size="14" /> {{ formatCampaignDate(campaign.scheduled_at) }}</span><span v-if="campaign.sent_at" class="campaign-muted">Sent {{ formatCampaignDate(campaign.sent_at) }}</span></div><button v-if="canManage && (campaign.status === 'draft' || campaign.status === 'scheduled')" type="button" class="campaign-delete-button" aria-label="Delete campaign" @click="remove"><PhTrash :size="17" /></button></section><section class="campaign-stats"><article><PhUsersThree :size="18" /><span>Audience</span><strong>{{ campaign.total_recipients ?? 0 }}</strong></article><article><PhPaperPlaneTilt :size="18" /><span>Sent</span><strong>{{ campaign.sent_count ?? 0 }}</strong></article><article><PhCheckCircle :size="18" /><span>Delivered</span><strong>{{ campaign.delivered_count ?? 0 }}</strong></article><article><PhChatCircle :size="18" /><span>Replied</span><strong>{{ campaign.replied_count ?? 0 }}</strong></article><article><PhXCircle :size="18" /><span>Failed</span><strong>{{ campaign.failed_count ?? 0 }}</strong></article></section><section class="campaign-detail-card"><h3>Message body</h3><div class="campaign-detail-preview">{{ campaign.message_body || campaign.messageBody || 'No message body' }}</div></section><section class="campaign-detail-card"><h3>Audience criteria</h3><dl class="campaign-criteria"><div><dt>Tags</dt><dd>{{ criteria(audience?.tags) }}</dd></div><div><dt>Departments</dt><dd>{{ criteria(audience?.departments) }}</dd></div><div><dt>Statuses</dt><dd>{{ criteria(audience?.statuses) }}</dd></div><div><dt>Gender</dt><dd>{{ criteria(audience?.genders) }}</dd></div><div><dt>Specific patients</dt><dd>{{ selectedPatientCriteria }}</dd></div><div><dt>Inactive for (days)</dt><dd>{{ audience?.inactive_days || 'All' }}</dd></div></dl></section></main><section class="campaign-detail-card campaign-recipients"><h3>Recipients ({{ recipients.length }})</h3><div v-if="!recipients.length" class="campaign-empty-recipients">No recipients yet; the campaign has not been sent.</div><div v-else class="campaign-recipients-scroll"><table><thead><tr><th>Patient</th><th>Phone</th><th>Status</th><th>Sent at</th></tr></thead><tbody><tr v-for="recipient in recipients" :key="recipient.id"><td>{{ recipient.patient_name || 'Patient' }}</td><td>{{ recipient.patient_phone || '—' }}</td><td><span class="campaign-recipient-status" :class="`recipient-${recipient.status || 'queued'}`">{{ recipient.status || 'queued' }}</span></td><td>{{ recipient.sent_at ? formatCampaignDate(recipient.sent_at) : '—' }}</td></tr></tbody></table></div></section></div>
    </template>
    <div v-if="confirmOpen" class="campaign-modal-backdrop" @click.self="confirmOpen = false"><section class="campaign-confirm-modal" role="dialog" aria-modal="true"><h2>Send campaign?</h2><p>This will deliver the WhatsApp message to {{ campaign?.total_recipients ?? 0 }} patients immediately.</p><footer><button type="button" class="campaign-secondary-button" @click="confirmOpen = false">Cancel</button><button type="button" class="campaign-primary-button campaign-send-button" :disabled="actionLoading" @click="send">{{ actionLoading ? 'Sending…' : 'Yes, send now' }}</button></footer></section></div>
    <div v-if="scheduleOpen" class="campaign-modal-backdrop" @click.self="scheduleOpen = false"><section class="campaign-confirm-modal" role="dialog" aria-modal="true"><h2>Schedule automatic sending</h2><p>The campaign will be sent automatically at the selected time.</p><label>Send at (local time)<input v-model="scheduledAt" type="datetime-local" /></label><footer><button type="button" class="campaign-secondary-button" @click="scheduleOpen = false">Cancel</button><button type="button" class="campaign-primary-button" :disabled="actionLoading || !scheduledAt" @click="schedule">{{ actionLoading ? 'Saving…' : 'Enable automatic sending' }}</button></footer></section></div>
  </section>
</template>
