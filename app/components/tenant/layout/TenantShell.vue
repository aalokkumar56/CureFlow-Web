<script setup lang="ts">
import TenantSidebar from './TenantSidebar.vue'
</script>

<template>
  <div class="tenant-shell">
    <TenantSidebar />

    <main class="tenant-main">
      <div class="tenant-content">
        <slot />
      </div>
    </main>
  </div>
</template>