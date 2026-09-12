<script setup lang="ts">
withDefaults(defineProps<{ subtitle?: string }>(), { subtitle: '' })
</script>

<template>
  <div class="auth-brand">
    <img src="/design/cureflow-logo.svg" alt="CureFlow" width="160" height="32">
    <p v-if="subtitle">{{ subtitle }}</p>
  </div>
</template>
