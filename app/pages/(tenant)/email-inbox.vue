<script setup lang="ts">
import EmailThreadList from '~/components/tenant/email/EmailThreadList.vue'
import EmailConversation from '~/components/tenant/email/EmailConversation.vue'
import { useEmailInbox } from '~/composables/email/useEmailInbox'
import { emailIsActive } from '~/utils/email'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
definePageMeta({ layout: 'tenant', middleware: ['tenant-auth', 'tenant-approval'] }); useHead({ title: 'Email Inbox' })
const auth = useTenantAuth(); const canView = computed(() => hasPermission(auth.user.value, PERMISSIONS.ConversationView)); const canSend = computed(() => hasPermission(auth.user.value, PERMISSIONS.ConversationManage)); const { threads, status, selectedPatientId, detail, search, loading, detailLoading, sending, error, selectThread, send, loadThreads } = useEmailInbox(); const active = computed(() => canSend.value && emailIsActive(status.value))
</script>
<template><section class="email-page"><div v-if="!canView" class="email-state">You do not have permission to view email conversations.</div><template v-else><div v-if="error" class="email-alert">{{ error }} <button type="button" @click="loadThreads()">Retry</button></div><div v-if="status && !emailIsActive(status)" class="email-warning">{{ status.message || 'Email is not configured or is disabled. Configure it under Settings → Integrations.' }}</div><div class="email-workspace"><EmailThreadList :threads="threads" :selected-id="selectedPatientId" :search="search" :loading="loading" @update:search="search = $event" @select="selectThread" /><EmailConversation :detail="detail" :detail-loading="detailLoading" :active="active" :sending="sending" @send="send" /></div></template></section></template>
