<script setup lang="ts">
import { PhChatCircleDots, PhWarningCircle } from '@phosphor-icons/vue'
import InboxConversationList from '~/components/tenant/inbox/InboxConversationList.vue'
import InboxChatPanel from '~/components/tenant/inbox/InboxChatPanel.vue'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
import { useWhatsappInbox } from '~/composables/whatsapp/useWhatsappInbox'

definePageMeta({ layout: 'tenant', middleware: ['tenant-auth', 'tenant-approval'] })
useHead({ title: 'WhatsApp Inbox' })

const auth = useTenantAuth()
const { conversations, templates, status, loading, error, loadConversations, loadStatus, loadTemplates } = useWhatsappInbox()
const query = ref('')
const selectedId = ref<string | number | null>(null)
const canView = computed(() => hasPermission(auth.user.value, PERMISSIONS.ConversationView))
const whatsappDisabled = computed(() => Boolean(status.value && (!status.value.enabled || !status.value.is_configured)))
const filteredConversations = computed(() => {
  const search = query.value.trim().toLowerCase()
  if (!search) return conversations.value
  return conversations.value.filter((conversation) => {
    const searchable = [
      conversation.display_name,
      conversation.name,
      conversation.wa_phone,
      conversation.phone,
      conversation.last_message_preview,
      conversation.category,
      conversation.priority,
    ]
    return searchable.some(value => String(value || '').toLowerCase().includes(search))
  })
})

watch(filteredConversations, (items) => {
  if (!selectedId.value && items[0]) selectedId.value = items[0].id
  if (selectedId.value && !items.some(item => item.id === selectedId.value)) selectedId.value = items[0]?.id || null
})

let timer: ReturnType<typeof setInterval> | undefined
onMounted(async () => {
  if (!canView.value) return
  await Promise.all([loadConversations(), loadStatus(), loadTemplates()])
  timer = setInterval(() => loadConversations('', true), 10000)
})
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <section class="whatsapp-page">
    <div v-if="!canView" class="dashboard-state">You do not have permission to view the WhatsApp inbox.</div>
    <template v-else>
      <div v-if="whatsappDisabled" class="whatsapp-notice"><PhWarningCircle :size="18" weight="fill" /><span>{{ status?.message || 'WhatsApp messaging is not configured or is disabled. Open Settings → Integrations to enable it.' }}</span></div>
      <p v-if="error && !conversations.length" class="whatsapp-error" role="alert">{{ error }}</p>
      <div class="whatsapp-workspace">
        <InboxConversationList v-model:query="query" :conversations="filteredConversations" :selected-id="selectedId" :loading="loading" :error="error && conversations.length ? error : ''" @select="selectedId = $event.id" />
        <main class="whatsapp-chat-shell">
          <div v-if="!selectedId" class="whatsapp-chat-empty"><PhChatCircleDots :size="48" weight="duotone" /><p>Select a conversation to start.</p></div>
          <InboxChatPanel v-else :conversation-id="selectedId" :templates="templates" :whatsapp-disabled="whatsappDisabled" :disabled-message="status?.message" />
        </main>
      </div>
    </template>
  </section>
</template>
