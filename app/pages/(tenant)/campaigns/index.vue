<script setup lang="ts">
import { PhCaretLeft, PhCaretRight, PhFileText, PhMegaphone, PhPaperPlaneTilt, PhSparkle, PhClock } from '@phosphor-icons/vue'
import CampaignCard from '~/components/tenant/campaigns/CampaignCard.vue'
import CampaignCreateModal from '~/components/tenant/campaigns/CampaignCreateModal.vue'
import SuggestedCampaignCard from '~/components/tenant/campaigns/SuggestedCampaignCard.vue'
import { useCampaigns } from '~/composables/campaigns/useCampaigns'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
import { statusColumn, type Campaign, type CampaignAudience, type CampaignDraft } from '~/utils/campaigns'
import { normalizeApiError } from '~/utils/api/errors'

definePageMeta({ layout: 'tenant', middleware: ['tenant-auth', 'tenant-approval'] })
useHead({ title: 'Campaigns' })

const auth = useTenantAuth()
const { campaigns, drafts, departments, loading, error, load, loadMetadata, previewAudience, create, update } = useCampaigns()
const canView = computed(() => hasPermission(auth.user.value, PERMISSIONS.CampaignView))
const canManage = computed(() => hasPermission(auth.user.value, PERMISSIONS.CampaignManage))
const search = ref('')
const modalOpen = ref(false)
const selectedDraft = ref<CampaignDraft | null>(null)
const saving = ref(false)
const previewing = ref(false)
const previewCount = ref<number | null>(null)
const actionError = ref('')
const carousel = ref<HTMLElement | null>(null)
const columns = [{ id: 'draft', label: 'Draft', icon: PhFileText }, { id: 'scheduled', label: 'Scheduled', icon: PhClock }, { id: 'sent', label: 'Sent', icon: PhPaperPlaneTilt }]

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return campaigns.value
  return campaigns.value.filter(campaign => [campaign.name, campaign.description, campaign.message_body, campaign.messageBody].some(value => String(value || '').toLowerCase().includes(query)))
})
const columnItems = (id: string) => filtered.value.filter(campaign => statusColumn(campaign) === id)
const openCreate = (draft: CampaignDraft | null = null) => { selectedDraft.value = draft; previewCount.value = null; modalOpen.value = true }
const save = async (payload: Record<string, unknown>) => { saving.value = true; actionError.value = ''; try { await create(payload); modalOpen.value = false; selectedDraft.value = null; await load() } catch (cause) { actionError.value = normalizeApiError(cause, 'Campaign could not be created.') } finally { saving.value = false } }
const preview = async (audience: CampaignAudience) => { previewing.value = true; try { previewCount.value = Number((await previewAudience(audience)).count || 0) } catch (cause) { actionError.value = normalizeApiError(cause, 'Audience preview could not be calculated.') } finally { previewing.value = false } }
const move = async (campaign: Campaign, target: string) => { const current = statusColumn(campaign); if (current === target || !canManage.value) return; if (target === 'sent' || current === 'sent' || campaign.status === 'sending') { actionError.value = target === 'sent' ? 'Campaigns move to Sent automatically after publishing.' : 'Sent campaigns cannot be moved.'; return } try { await update(campaign.id, target === 'draft' ? { status: 'draft', clearSchedule: true } : { status: 'scheduled', scheduledAt: campaign.scheduled_at || new Date(Date.now() + 86400000).toISOString() }); await load(true) } catch (cause) { actionError.value = normalizeApiError(cause, 'Campaign could not be moved.') } }
const scrollSuggestions = (direction: number) => carousel.value?.scrollBy({ left: direction * 230, behavior: 'smooth' })

onMounted(async () => { if (canView.value) await Promise.all([load(), loadMetadata()]) })
</script>

<template>
  <section class="campaigns-page">
    <div v-if="!canView" class="dashboard-state">You do not have permission to view campaigns.</div>
    <template v-else>
      <p v-if="actionError" class="campaign-alert" role="alert">{{ actionError }}</p>
      <section class="suggested-campaigns"><div class="campaign-section-heading"><div><h2><PhSparkle :size="17" /> Suggested campaigns</h2><p>Timely ideas from your marketing calendar.</p></div><div v-if="drafts.length" class="campaign-carousel-actions"><button type="button" aria-label="Previous suggestions" @click="scrollSuggestions(-1)"><PhCaretLeft :size="16" /></button><button type="button" aria-label="Next suggestions" @click="scrollSuggestions(1)"><PhCaretRight :size="16" /></button></div></div><div v-if="!drafts.length" class="campaign-empty-suggestions">No upcoming events in the marketing calendar.</div><div v-else ref="carousel" class="campaign-suggestions-track"><SuggestedCampaignCard v-for="draft in drafts" :key="draft.event_id || draft.name" :draft="draft" @use="openCreate" /></div></section>
      <section class="campaign-list-section"><header class="campaign-list-heading"><div><h2>All campaigns</h2><p>{{ filtered.length }} campaign{{ filtered.length === 1 ? '' : 's' }}</p></div><div class="campaign-list-actions"><input v-model="search" type="search" placeholder="Search campaigns…" aria-label="Search campaigns" /><button v-if="canManage" type="button" class="campaign-primary-button" @click="openCreate()"><PhMegaphone :size="17" /> Create campaign</button></div></header><div v-if="loading" class="campaign-loading">Loading campaigns…</div><div v-else-if="error" class="campaign-empty"><p>{{ error }}</p><button type="button" class="campaign-secondary-button" @click="load()">Try again</button></div><div v-else-if="!filtered.length" class="campaign-empty"><PhMegaphone :size="38" /><strong>No campaigns yet</strong><p>Create a campaign or use a suggested draft to get started.</p></div><div v-else class="campaign-board"><article v-for="column in columns" :key="column.id" class="campaign-column" :class="`column-${column.id}`" @dragover.prevent @drop="move(JSON.parse($event.dataTransfer?.getData('campaign') || '{}'), column.id)"><header><span><component :is="column.icon" :size="16" /><strong>{{ column.label }}</strong></span><b>{{ columnItems(column.id).length }}</b></header><div v-if="!columnItems(column.id).length" class="campaign-column-empty">Drop campaign here</div><CampaignCard v-for="(campaign, index) in columnItems(column.id)" :key="campaign.id" :campaign="campaign" :theme-index="index" draggable="true" @dragstart="$event.dataTransfer?.setData('campaign', JSON.stringify(campaign))" /></article></div></section>
    </template>
    <CampaignCreateModal :open="modalOpen" :draft="selectedDraft" :departments="departments" :saving="saving" :previewing="previewing" :preview-count="previewCount" @close="modalOpen = false" @save="save" @preview="preview" />
  </section>
</template>
