<script setup lang="ts">
import TenantShell from '~/components/tenant/layout/TenantShell.vue'
import TenantSessionGuard from '~/components/tenant/layout/TenantSessionGuard.vue'
</script>

<template>
  <TenantSessionGuard><TenantShell>
    <slot />
  </TenantShell></TenantSessionGuard>
</template>
