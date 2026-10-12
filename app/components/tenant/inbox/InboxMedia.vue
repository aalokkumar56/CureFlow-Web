<script setup lang="ts">
import { PhDownloadSimple, PhFileText } from '@phosphor-icons/vue'
import { formatBytes } from '~/utils/whatsapp'
import { approvedMediaUrl } from '~/utils/contentSafety'

const props = defineProps<{
  url: string
  type?: string
  fileName?: string
  size?: number
  outbound?: boolean
}>()

const { $api } = useNuxtApp()
const source = ref('')
const failed = ref(false)
const loading = ref(true)
const config = useRuntimeConfig()

onMounted(async () => {
  try {
    if (/^https?:\/\//i.test(props.url)) {
      const approved = approvedMediaUrl(props.url, config.public.approvedMediaOrigins)
      if (!approved) throw new Error('Attachment origin is not approved')
      source.value = approved
    } else {
      if (!/^\/api\/conversations\/messages\/[^/?#]+\/media(?:\?[^#]*)?$/.test(props.url))
        throw new Error('Invalid attachment path')
      source.value = URL.createObjectURL(await $api.download(props.url.slice(4)))
    }
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  if (source.value.startsWith('blob:')) URL.revokeObjectURL(source.value)
})
</script>

<template>
  <span v-if="loading" class="whatsapp-media-muted">Loading attachment…</span>
  <span v-else-if="failed" class="whatsapp-media-muted">Attachment unavailable</span>
  <template v-else-if="type === 'image'">
    <a :href="source" target="_blank" rel="noreferrer"><img class="whatsapp-media-image" :src="source" :alt="fileName || 'Image attachment'" /></a>
  </template>
  <video v-else-if="type === 'video'" class="whatsapp-media-player" :src="source" controls />
  <audio v-else-if="type === 'audio'" class="whatsapp-media-audio" :src="source" controls />
  <a v-else class="whatsapp-document" :class="{ 'is-outbound': outbound }" :href="source" :download="fileName || 'attachment'" target="_blank" rel="noreferrer">
    <PhFileText :size="20" weight="fill" />
    <span><strong>{{ fileName || 'Document' }}</strong><small>{{ formatBytes(size) }}</small></span>
    <PhDownloadSimple :size="17" />
  </a>
</template>
