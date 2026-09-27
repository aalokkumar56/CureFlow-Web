<script setup lang="ts">
import { normalizeApiError } from '~/utils/api/errors'
defineProps<{ loading?: boolean; error?: unknown; empty?: boolean; emptyText?: string }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <div v-if="loading" class="platform-tenants-state" role="status">Loading…</div>
  <div v-else-if="error" class="platform-error-banner" role="alert">
    {{ normalizeApiError(error, 'Unable to load this information.') }}
    <button type="button" @click="$emit('retry')">Retry</button>
  </div>
  <div v-else-if="empty" class="platform-tenants-empty">{{ emptyText || 'No records found.' }}</div>
  <slot v-else />
</template>
