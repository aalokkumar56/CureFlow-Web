<script setup lang="ts">
import TenantSidebar from './TenantSidebar.vue'
</script>

<template>
  <div>
    <TenantSidebar />

    <main>
      <slot />
    </main>
  </div>
</template>