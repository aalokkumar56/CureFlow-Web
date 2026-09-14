<script setup lang="ts">
import { PhPaperclip, PhPaperPlaneRight, PhX } from '@phosphor-icons/vue'
import InboxMedia from './InboxMedia.vue'
import { normalizeApiError } from '~/utils/api/errors'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
import { conversationName, formatBytes, formatMessageStatus, renderMessageTemplate, visibleTemplates, type WhatsAppConversation, type WhatsAppMessage, type WhatsAppTemplate } from '~/utils/whatsapp'

const props = withDefaults(defineProps<{
  conversationId?: string | number | null
  patientId?: string | number
  patientName?: string
  templates?: WhatsAppTemplate[]
  whatsappDisabled?: boolean
  disabledMessage?: string
  embedded?: boolean
}>(), { templates: () => [] })

const { $api } = useNuxtApp()
const auth = useTenantAuth()
const canSend = computed(() => hasPermission(auth.user.value, PERMISSIONS.ConversationManage))
const conversation = ref<WhatsAppConversation | null>(null)
const messages = ref<WhatsAppMessage[]>([])
const loadedTemplates = ref<WhatsAppTemplate[]>([])
const body = ref('')
const attachment = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const sending = ref(false)
const uploadProgress = ref(0)
const error = ref('')
const selectedTemplate = ref('')
const messageList = ref<HTMLElement | null>(null)
const activeId = computed(() => props.conversationId || conversation.value?.id || null)
const effectiveTemplates = computed(() => props.templates.length ? props.templates : loadedTemplates.value)

const load = async (silent = false) => {
  if (!activeId.value && !props.patientId) return
  const wasNearBottom = !messageList.value ||
    messageList.value.scrollHeight - messageList.value.scrollTop - messageList.value.clientHeight < 80
  if (!silent) loading.value = true
  error.value = ''
  try {
    const endpoint = activeId.value ? `/conversations/${activeId.value}` : `/conversations/patient/${props.patientId}`
    const result = await $api.get<{ conversation?: WhatsAppConversation; messages?: WhatsAppMessage[]; patient?: { name?: string } }>(endpoint)
    conversation.value = result.conversation || null
    messages.value = result.messages || []
    await nextTick()
    if (messageList.value && wasNearBottom) messageList.value.scrollTop = messageList.value.scrollHeight
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Conversation could not be loaded.')
  } finally {
    if (!silent) loading.value = false
  }
}

const clearAttachment = () => {
  attachment.value = null
  uploadProgress.value = 0
  if (fileInput.value) fileInput.value.value = ''
}

const onPickFile = (event: Event) => {
  attachment.value = (event.target as HTMLInputElement).files?.[0] || null
}

const send = async () => {
  if (!canSend.value || props.whatsappDisabled || sending.value || !activeId.value || (!body.value.trim() && !attachment.value)) return
  sending.value = true
  error.value = ''
  try {
    if (attachment.value) {
      const data = new FormData()
      data.append('file', attachment.value)
      if (body.value.trim()) data.append('caption', body.value.trim())
      await $api.post(`/conversations/${activeId.value}/media`, data)
    } else {
      await $api.post('/conversations/messages', { conversationId: activeId.value, body: body.value.trim() })
    }
    body.value = ''
    clearAttachment()
    selectedTemplate.value = ''
    await load(true)
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Message could not be sent.')
  } finally {
    sending.value = false
    uploadProgress.value = 0
  }
}

const applyTemplate = () => {
  const template = effectiveTemplates.value.find(item => String(item.id) === selectedTemplate.value)
  if (template?.body) body.value = renderMessageTemplate(template.body, { name: props.patientName || (conversation.value ? conversationName(conversation.value) : '') })
}

watch(() => [props.conversationId, props.patientId], () => load(), { immediate: true })
let timer: ReturnType<typeof setInterval> | undefined
onMounted(async () => {
  if (!props.templates.length && canSend.value) {
    try {
      const result = await $api.get<unknown>('/templates')
      loadedTemplates.value = Array.isArray(result)
        ? result as WhatsAppTemplate[]
        : Array.isArray((result as { items?: unknown[] })?.items)
          ? (result as { items: WhatsAppTemplate[] }).items
          : []
    } catch {
      loadedTemplates.value = []
    }
  }
  timer = setInterval(() => load(true), 5000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <section class="whatsapp-chat-panel" :class="{ 'is-embedded': props.embedded }">
    <template v-if="!activeId && !props.patientId">
      <div class="whatsapp-chat-empty">Select a conversation to start.</div>
    </template>
    <template v-else>
      <div ref="messageList" class="whatsapp-message-list">
        <div v-if="loading" class="whatsapp-chat-empty">Loading conversation…</div>
        <div v-else-if="!messages.length" class="whatsapp-chat-empty">No messages yet.</div>
        <template v-else>
          <article v-for="(message, index) in messages" :key="message.id || index" class="whatsapp-message" :class="{ 'is-outbound': message.direction === 'outbound' }">
            <div class="whatsapp-message-bubble">
              <InboxMedia v-if="message.media_url || message.mediaUrl" :url="String(message.media_url || message.mediaUrl)" :type="message.type" :file-name="String(message.file_name || message.fileName || '')" :size="Number(message.media_size || message.mediaSize || 0)" :outbound="message.direction === 'outbound'" />
              <p v-if="message.body || message.caption">{{ message.body || message.caption }}</p>
              <footer>{{ message.created_at || message.sent_at ? new Date(String(message.created_at || message.sent_at)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '' }} <span v-if="message.direction === 'outbound'">{{ formatMessageStatus(message.status) }}</span></footer>
            </div>
          </article>
        </template>
      </div>
      <form v-if="canSend" class="whatsapp-composer" @submit.prevent="send">
        <p v-if="error" class="whatsapp-error" role="alert">{{ error }}</p>
        <div v-if="attachment" class="whatsapp-attachment-chip"><PhPaperclip :size="16" /><span>{{ attachment.name }} · {{ formatBytes(attachment.size) }}</span><button type="button" aria-label="Remove attachment" @click="clearAttachment"><PhX :size="16" /></button></div>
        <div class="whatsapp-composer-row">
          <input ref="fileInput" type="file" class="sr-only" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv" @change="onPickFile" />
          <button type="button" class="whatsapp-icon-button" :disabled="props.whatsappDisabled || sending" aria-label="Attach file" @click="fileInput?.click()"><PhPaperclip :size="18" /></button>
          <select v-if="visibleTemplates(effectiveTemplates).length" v-model="selectedTemplate" aria-label="Quick reply template" @change="applyTemplate">
            <option value="">Quick reply</option><option v-for="template in visibleTemplates(effectiveTemplates)" :key="template.id" :value="template.id">{{ template.name }}</option>
          </select>
          <textarea v-model="body" rows="2" :disabled="props.whatsappDisabled || sending" :placeholder="props.whatsappDisabled ? 'WhatsApp sending is disabled' : 'Type a WhatsApp message…'" />
          <button type="submit" class="whatsapp-send-button" :disabled="props.whatsappDisabled || sending || (!body.trim() && !attachment)"><PhPaperPlaneRight :size="18" weight="fill" /><span class="sr-only">{{ sending ? 'Sending' : 'Send message' }}</span></button>
        </div>
      </form>
    </template>
  </section>
</template>
