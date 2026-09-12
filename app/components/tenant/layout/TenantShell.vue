<script setup lang="ts">
import TenantHeader from './TenantHeader.vue'
import TenantSidebar from './TenantSidebar.vue'
import { useTenantShell } from '~/composables/tenant/useTenantShell'

const { initialize } = useTenantShell()
onMounted(initialize)
</script>

<template>
  <div class="tenant-shell">
    <TenantSidebar />
    <main class="tenant-main">
      <TenantHeader />
      <div class="tenant-content">
        <slot />
      </div>
    </main>
  </div>
</template>
