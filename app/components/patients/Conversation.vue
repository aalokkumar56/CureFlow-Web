<script setup lang="ts">
import InboxChatPanel from '~/components/tenant/inbox/InboxChatPanel.vue'

defineProps<{
  patientId: string
  patientName?: string
}>()
</script>

<template>
  <InboxChatPanel :patient-id="patientId" :patient-name="patientName" embedded />
</template>
