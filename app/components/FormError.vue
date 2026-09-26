<script setup lang="ts">
import { normalizeApiError } from '~/utils/api/errors'
const props = defineProps<{ error?: unknown }>()
const messages = computed(() =>
  (typeof props.error === 'string'
    ? props.error
    : props.error
      ? normalizeApiError(props.error)
      : ''
  )
    .split('\n')
    .filter(Boolean),
)
</script>
<template>
  <div v-if="messages.length" class="form-error" role="alert">
    <p v-for="(message, index) in messages" :key="index">{{ message }}</p>
  </div>
</template>
