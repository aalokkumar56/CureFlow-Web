<script setup lang="ts">
import type { ClinicalRecord } from '~/utils/patient-clinical'
import { patientDate, patientLabel } from '~/utils/patients'
import { normalizeApiError } from '~/utils/api/errors'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
const props = defineProps<{ patientId: string; patientName?: string }>()
const { $api } = useNuxtApp()
const auth = useTenantAuth()
const canSend = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.ConversationManage),
)
const conversation = ref<ClinicalRecord | null>(null)
const messages = ref<ClinicalRecord[]>([])
const templates = ref<ClinicalRecord[]>([])
const body = ref('')
const attachment = ref<File | null>(null)
const fileInput = ref<HTMLInputElement>()
const loading = ref(true)
const sending = ref(false)
const error = ref('')
const success = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    const data = await $api.get<{
      conversation: ClinicalRecord
      messages: ClinicalRecord[]
    }>(`/conversations/patient/${props.patientId}`)
    conversation.value = data.conversation
    messages.value = data.messages || []
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Conversation could not be loaded.')
  } finally {
    loading.value = false
  }
}
async function send() {
  if (
    !canSend.value ||
    sending.value ||
    !conversation.value?.id ||
    (!body.value.trim() && !attachment.value)
  )
    return
  sending.value = true
  error.value = ''
  success.value = ''
  try {
    if (attachment.value) {
      const data = new FormData()
      data.append('file', attachment.value)
      data.append('caption', body.value.trim())
      await $api.post(`/conversations/${conversation.value.id}/media`, data)
    } else
      await $api.post('/conversations/messages', {
        conversation_id: conversation.value.id,
        body: body.value.trim(),
      })
    body.value = ''
    attachment.value = null
    if (fileInput.value) fileInput.value.value = ''
    await load()
    success.value = 'Message submitted. Delivery status is shown below.'
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Message could not be sent.')
  } finally {
    sending.value = false
  }
}
async function download(message: ClinicalRecord) {
  try {
    const blob = await $api.download(
      `/conversations/messages/${message.id}/media`,
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = String(message.file_name || 'attachment')
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (cause) {
    error.value = normalizeApiError(
      cause,
      'Attachment could not be downloaded.',
    )
  }
}
onMounted(async () => {
  await load()
  if (
    canSend.value &&
    hasPermission(auth.user.value, PERMISSIONS.WhatsAppView)
  ) {
    try {
      const data = await $api.get<ClinicalRecord[]>('/templates')
      templates.value = Array.isArray(data) ? data : []
    } catch {
      /* Optional quick replies do not prevent conversation access. */
    }
  }
})
</script>
<template>
  <section class="patient-clinical-panel">
    <header class="patient-section-header">
      <div>
        <h2>WhatsApp conversation</h2>
        <p class="patients-muted">
          {{ patientName }} · {{ messages.length }} messages
        </p>
      </div>
      <button class="patients-secondary-btn" :disabled="loading" @click="load">
        Refresh
      </button>
    </header>
    <p v-if="error" class="appointments-error" role="alert">{{ error }}</p>
    <p v-if="success" class="patients-success" role="status">{{ success }}</p>
    <div v-if="loading" class="dashboard-state">Loading conversation…</div>
    <div v-else class="patient-messages">
      <p v-if="!messages.length" class="empty-state-box">No messages yet.</p>
      <article
        v-for="(message, index) in messages"
        :key="message.id || index"
        class="patient-record-card"
      >
        <header>
          <strong>{{ patientLabel(message.direction) }}</strong
          ><small
            >{{ patientDate(message.created_at || message.sent_at) }} ·
            {{ patientLabel(message.status) }}</small
          >
        </header>
        <p class="patient-preserve-text">
          {{ message.body || message.caption }}
        </p>
        <button
          v-if="message.media_url || message.file_name"
          class="patients-secondary-btn"
          @click="download(message)"
        >
          Download attachment
        </button>
      </article>
    </div>
    <form v-if="canSend" class="patient-record-form" @submit.prevent="send">
      <div class="patient-form-grid">
        <label v-if="templates.length" class="full-width"
          ><span>Quick reply</span
          ><select
            @change="
              body = String(
                templates.find(
                  (item) =>
                    item.id === ($event.target as HTMLSelectElement).value,
                )?.body || '',
              ).replace(/\{\{\s*name\s*\}\}/g, patientName || '')
            "
          >
            <option value="">Choose a template</option>
            <option v-for="item in templates" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select></label
        ><label class="full-width"
          ><span>Message</span
          ><textarea
            v-model="body"
            rows="3"
            :disabled="sending"
            placeholder="Write a message…"
          /></label
        ><label
          ><span>Attachment (optional)</span
          ><input
            ref="fileInput"
            type="file"
            :disabled="sending"
            @change="
              attachment =
                ($event.target as HTMLInputElement).files?.[0] || null
            "
        /></label>
      </div>
      <footer class="patient-form-actions">
        <button
          class="patients-primary-btn"
          :disabled="
            sending || !conversation?.id || (!body.trim() && !attachment)
          "
        >
          {{ sending ? 'Sending…' : 'Send message' }}
        </button>
      </footer>
    </form>
  </section>
</template>
