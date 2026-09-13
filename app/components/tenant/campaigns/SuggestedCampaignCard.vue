<script setup lang="ts">
import { PhCalendarBlank } from '@phosphor-icons/vue'
import type { CampaignDraft } from '~/utils/campaigns'

defineProps<{ draft: CampaignDraft }>()
defineEmits<{ use: [draft: CampaignDraft] }>()
</script>

<template>
  <article class="suggested-campaign-card">
    <div class="suggested-campaign-icon">{{ draft.category === 'festival' ? '🪔' : draft.category === 'seasonal' ? '☔' : draft.category === 'health_day' ? '💚' : '📅' }}</div>
    <div class="suggested-campaign-content"><strong>{{ draft.name || draft.draft_name || 'Suggested campaign' }}</strong><p>{{ draft.suggested_message || 'Create a timely patient campaign.' }}</p><small><PhCalendarBlank :size="12" /> {{ draft.event_date || 'Flexible date' }}</small></div>
    <button type="button" class="campaign-use-button" @click="$emit('use', draft)">Use draft</button>
  </article>
</template>
