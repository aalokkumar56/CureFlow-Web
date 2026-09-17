<script setup lang="ts">
import { PhCheck, PhTrash, PhWhatsappLogo } from '@phosphor-icons/vue'
import { displayFollowUpType, formatFollowUpDate, isFollowUpDone, type FollowUp } from '~/utils/followups'

const props = defineProps<{ task: FollowUp }>()
const emit = defineEmits<{ complete: [task: FollowUp]; remove: [task: FollowUp] }>()
</script>

<template>
<article class="followup-card">
  <div class="followup-card-heading"><strong>{{ props.task.title }}</strong><span class="followup-priority" :class="`priority-${props.task.priority || 'medium'}`">{{ props.task.priority || 'medium' }}</span></div>
  <p>{{ displayFollowUpType(props.task.type) }}<span v-if="props.task.patient_name"> · {{ props.task.patient_name }}</span></p>
  <time>{{ formatFollowUpDate(props.task.due_at) }}</time>
  <p v-if="props.task.notes" class="followup-card-notes">{{ props.task.notes }}</p>
  <div class="followup-card-actions">
    <button type="button" class="followup-complete" @click="emit('complete', props.task)"><PhCheck :size="14" />{{ isFollowUpDone(props.task.status) ? 'Reopen' : 'Complete' }}</button>
    <button type="button" class="followup-icon-action" title="Open WhatsApp" aria-label="Open WhatsApp"><PhWhatsappLogo :size="15" weight="fill" /></button>
    <button type="button" class="followup-icon-action danger" title="Delete follow-up" aria-label="Delete follow-up" @click="emit('remove', props.task)"><PhTrash :size="15" /></button>
  </div>
</article>
</template>
