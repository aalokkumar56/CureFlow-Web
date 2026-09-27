<script setup lang="ts">
import { usePlatformAccess } from '~/composables/platform/usePlatformAccess'
const route = useRoute()
const access = usePlatformAccess()
const tabs = [
  { path: '', label: 'Account', permission: 'tenants.read' },
  { path: '/facilities', label: 'Facilities', permission: 'facilities.read' },
  { path: '/modules', label: 'Modules', permission: 'entitlements.read' },
]
</script>
<template>
  <nav class="platform-tenant-subnav" aria-label="Tenant sections">
    <NuxtLink to="/platform/tenants" class="platform-subnav-back">← All tenants</NuxtLink>
    <template v-for="tab in tabs" :key="tab.path">
      <NuxtLink
        v-if="access.can(tab.permission)"
        :to="'/platform/tenants/' + route.params.id + tab.path"
        :class="{ 'router-link-exact-active': route.path === '/platform/tenants/' + route.params.id + tab.path }"
      >{{ tab.label }}</NuxtLink>
    </template>
  </nav>
</template>
