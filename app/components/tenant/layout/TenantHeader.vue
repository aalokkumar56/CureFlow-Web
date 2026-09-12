<script setup lang="ts">
import { PhBell, PhList, PhMagnifyingGlass } from '@phosphor-icons/vue'
import { useTenantShell } from '~/composables/tenant/useTenantShell'

const route = useRoute()
const { mobileOpen } = useTenantShell()
const title = computed(() => route.path === '/' ? 'Dashboard' : (route.path.split('/').filter(Boolean).at(-1)?.replace(/-/g, ' ') || 'CureFlow'))
</script>

<template>
  <header class="tenant-header">
    <div class="tenant-header-title">
      <button class="tenant-header-menu" type="button" aria-label="Open navigation" @click="mobileOpen = true"><PhList :size="21" weight="bold" /></button>
      <h1>{{ title }}</h1>
    </div>
    <div class="tenant-header-actions">
      <button class="tenant-header-action" type="button" disabled title="Search is not available in this migration yet" aria-label="Search unavailable"><PhMagnifyingGlass :size="19" /></button>
      <button class="tenant-header-action" type="button" disabled title="Notifications are not available in this migration yet" aria-label="Notifications unavailable"><PhBell :size="19" /></button>
    </div>
  </header>
</template>
