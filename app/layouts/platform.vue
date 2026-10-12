<script setup lang="ts">
const generation = useState('platform-view-generation', () => 0)
</script>
<template>
  <div :key="generation" class="platform-app">
    <slot />
  </div>
</template>
