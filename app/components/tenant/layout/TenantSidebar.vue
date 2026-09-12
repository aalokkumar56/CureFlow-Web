<script setup lang="ts">
import { PhCaretDoubleLeft, PhCaretDoubleRight, PhSignOut, PhX } from '@phosphor-icons/vue'
import TenantNavigation from '~/components/tenant/navigation/TenantNavigation.vue'
import { formatRole } from '~/utils/permissions'
import { useTenantShell } from '~/composables/tenant/useTenantShell'

const auth = useTenantAuth()
const { collapsed, mobileOpen, toggleCollapsed } = useTenantShell()
const tenantName = computed(() => String(auth.tenant.value?.name || 'CureFlow'))
const closeMobileNav = () => { mobileOpen.value = false }
</script>

<template>
  <div v-if="mobileOpen" class="tenant-sidebar-backdrop" @click="closeMobileNav" />
  <aside class="tenant-sidebar" :class="{ 'is-collapsed': collapsed, 'is-mobile-open': mobileOpen }">
    <div class="tenant-sidebar-header">
      <NuxtLink to="/" class="tenant-brand" aria-label="CureFlow Dashboard" @click="closeMobileNav">
        <span class="tenant-brand-mark">{{ tenantName[0]?.toUpperCase() || 'C' }}</span>
        <span v-if="!collapsed" class="tenant-brand-copy"><strong>{{ tenantName }}</strong><small>Hospital workspace</small></span>
      </NuxtLink>
      <button type="button" class="tenant-sidebar-toggle desktop-toggle" :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'" @click="toggleCollapsed"><PhCaretDoubleRight v-if="collapsed" :size="17" weight="bold" /><PhCaretDoubleLeft v-else :size="17" weight="bold" /></button>
      <button class="tenant-sidebar-toggle mobile-close" type="button" aria-label="Close navigation" @click="closeMobileNav"><PhX :size="18" /></button>
    </div>
    <div class="tenant-sidebar-body"><TenantNavigation :collapsed="collapsed" @navigate="closeMobileNav" /></div>
    <div class="tenant-sidebar-footer"><div class="tenant-user"><span class="tenant-user-avatar">{{ auth.user.value?.name?.[0]?.toUpperCase() || 'U' }}</span><span v-if="!collapsed" class="tenant-user-copy"><strong>{{ auth.user.value?.name || 'User' }}</strong><small>{{ formatRole(auth.user.value?.role) }}</small></span><button type="button" class="tenant-logout" aria-label="Logout" title="Logout" @click="auth.logout()"><PhSignOut :size="18" /></button></div></div>
  </aside>
</template>
