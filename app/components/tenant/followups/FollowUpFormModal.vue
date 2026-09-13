<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import { followUpPriorities, followUpTypes, type FollowUpDraft } from '~/utils/followups'

const props = defineProps<{ open: boolean; draft: FollowUpDraft; saving: boolean; error?: string }>()
const emit = defineEmits<{ close: []; save: [] }>()
</script>

<template>
  <div v-if="props.open" class="followup-modal" role="dialog" aria-modal="true" aria-labelledby="followup-modal-title">
    <button class="followup-modal-backdrop" type="button" aria-label="Close" @click="emit('close')" />
    <section class="followup-modal-panel">
      <header><div><p class="followup-eyebrow">Follow-ups</p><h2 id="followup-modal-title">New follow-up</h2></div><button type="button" class="followup-modal-close" aria-label="Close" @click="emit('close')"><PhX :size="19" /></button></header>
      <form @submit.prevent="emit('save')">
        <label>Title *<input v-model="props.draft.title" required placeholder="Call patient about results" /></label>
        <div class="followup-form-grid"><label>Type<select v-model="props.draft.type"><option v-for="type in followUpTypes" :key="type" :value="type">{{ type.replace(/_/g, ' ') }}</option></select></label><label>Priority<select v-model="props.draft.priority"><option v-for="priority in followUpPriorities" :key="priority" :value="priority">{{ priority }}</option></select></label></div>
        <label>Due date<input v-model="props.draft.due_at" type="datetime-local" /></label>
        <label>Notes<textarea v-model="props.draft.notes" rows="3" placeholder="Add context for the care team" /></label>
        <p v-if="props.error" class="followup-form-error" role="alert">{{ props.error }}</p>
        <footer><button type="button" class="followup-secondary-button" @click="emit('close')">Cancel</button><button type="submit" class="followup-primary-button" :disabled="props.saving">{{ props.saving ? 'Creating…' : 'Create follow-up' }}</button></footer>
      </form>
    </section>
  </div>
</template>
