<script setup lang="ts">
import { PhX } from '@phosphor-icons/vue'
import { referrerCategories } from '~/utils/referrals'
import type { ReferrerDraft } from '~/composables/referrals/useReferrals'
const props = defineProps<{ open: boolean; draft: ReferrerDraft; saving: boolean; error?: string }>()
const emit = defineEmits<{ close: []; save: [] }>()
</script>
<template>
  <div v-if="props.open" class="referral-modal" role="dialog" aria-modal="true" aria-labelledby="referral-modal-title"><button type="button" class="referral-modal-backdrop" aria-label="Close" @click="emit('close')" /><section class="referral-modal-panel"><header><div><p class="referral-eyebrow">Referral CRM</p><h2 id="referral-modal-title">Add referring doctor</h2></div><button type="button" class="referral-close" aria-label="Close" @click="emit('close')"><PhX :size="19" /></button></header><form @submit.prevent="emit('save')"><label>Name *<input v-model="props.draft.name" required placeholder="Dr. Priya Verma" /></label><div class="referral-form-grid"><label>Hospital / clinic<input v-model="props.draft.clinic" /></label><label>Specialty<input v-model="props.draft.specialty" /></label><label>Phone<input v-model="props.draft.phone" type="tel" /></label><label>Email<input v-model="props.draft.email" type="email" /></label><label>Category<select v-model="props.draft.category"><option v-for="(label, value) in referrerCategories" :key="value" :value="value">{{ label }}</option></select></label><label>Reconnect every (days)<input v-model.number="props.draft.reconnect_every_days" type="number" min="1" /></label></div><p v-if="props.error" class="referral-form-error">{{ props.error }}</p><footer><button type="button" class="referral-secondary-button" @click="emit('close')">Cancel</button><button type="submit" class="referral-primary-button" :disabled="props.saving">{{ props.saving ? 'Adding…' : 'Add referrer' }}</button></footer></form></section></div>
</template>
