<script setup lang="ts">
import { PhMagnifyingGlass, PhWarningCircle } from '@phosphor-icons/vue'
import { conversationName, type WhatsAppConversation } from '~/utils/whatsapp'

defineProps<{
  conversations: WhatsAppConversation[]
  selectedId?: string | number | null
  loading?: boolean
  query: string
  error?: string
}>()

const emit = defineEmits<{
  'update:query': [value: string]
  select: [conversation: WhatsAppConversation]
}>()
</script>

<template>
  <aside class="whatsapp-conversation-list">
    <div class="whatsapp-list-search">
      <PhMagnifyingGlass :size="17" aria-hidden="true" />
      <input
        :value="query"
        type="search"
        placeholder="Search conversations…"
        aria-label="Search conversations"
        @input="emit('update:query', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div v-if="error" class="whatsapp-list-error" role="alert">
      <PhWarningCircle :size="16" /> {{ error }}
    </div>
    <div v-if="loading" class="whatsapp-list-state">Loading conversations…</div>
    <div v-else-if="!conversations.length" class="whatsapp-list-state">No conversations yet.</div>
    <div v-else class="whatsapp-list-items">
      <button
        v-for="conversation in conversations"
        :key="conversation.id"
        type="button"
        class="whatsapp-conversation-item"
        :class="{ 'is-selected': selectedId === conversation.id }"
        @click="emit('select', conversation)"
      >
        <div class="whatsapp-conversation-row">
          <strong>{{ conversationName(conversation) }}</strong>
          <span v-if="Number(conversation.unread_count) > 0" class="whatsapp-unread">
            {{ conversation.unread_count }}
          </span>
        </div>
        <p>{{ conversation.last_message_preview || 'No messages yet' }}</p>
        <div class="whatsapp-conversation-tags">
          <span v-if="conversation.priority">{{ conversation.priority }}</span>
          <span v-if="conversation.category">{{ conversation.category }}</span>
          <span v-if="conversation.escalated" class="is-escalated">Escalated</span>
        </div>
      </button>
    </div>
  </aside>
</template>
