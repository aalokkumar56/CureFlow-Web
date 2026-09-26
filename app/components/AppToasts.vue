<script setup lang="ts">
const { messages, dismiss } = useToast()
</script>
<template>
  <aside class="app-toasts" aria-label="Notifications" aria-live="polite">
    <div
      v-for="item in messages"
      :key="item.id"
      class="app-toast"
      :class="item.type"
      :role="item.type === 'error' ? 'alert' : 'status'">
      <p>{{ item.message }}</p>
      <button type="button" aria-label="Dismiss notification" @click="dismiss(item.id)">
        &times;
      </button>
    </div>
  </aside>
</template>
