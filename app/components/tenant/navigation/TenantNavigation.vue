<script setup lang="ts">
import { PhCalendarBlank, PhChartBar, PhEnvelopeSimple, PhGearSix, PhHouse, PhListChecks, PhMegaphone, PhSparkle, PhStethoscope, PhUserCircle, PhUsersThree } from '@phosphor-icons/vue'
import { useTenantNavigation } from '~/composables/tenant/useTenantNavigation'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'

defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ navigate: [] }>()
const { items } = useTenantNavigation()
const auth = useTenantAuth()
const route = useRoute()
const icons = { dashboard: PhHouse, appointments: PhCalendarBlank, patients: PhUsersThree, 'whatsapp-inbox': PhSparkle, 'email-inbox': PhEnvelopeSimple, campaigns: PhMegaphone, analytics: PhChartBar, 'follow-ups': PhListChecks, 'referral-crm': PhStethoscope, 'hospital-staff': PhUserCircle }
const canViewSettings = computed(() => hasPermission(auth.user.value, PERMISSIONS.SettingsView))
const isActive = (path: string) => path === '/' ? route.path === '/' : route.path === path || route.path.startsWith(`${path}/`)
const isMigratedRoute = (path: string) => ['/', '/patients', '/appointments', '/inbox', '/email-inbox', '/campaigns', '/missed-revenue', '/tasks', '/doctors', '/staff'].includes(path)
</script>

<template>
  <nav class="tenant-navigation" aria-label="Tenant navigation">
    <template v-for="item in items" :key="item.id">
      <NuxtLink v-if="isMigratedRoute(item.to)" :to="item.to" class="tenant-nav-link" :class="{ 'is-active': isActive(item.to) }" :title="collapsed ? item.label : undefined" @click="emit('navigate')"><component :is="icons[item.id as keyof typeof icons]" :size="19" :weight="isActive(item.to) ? 'fill' : 'regular'" /><span v-if="!collapsed">{{ item.label }}</span></NuxtLink>
      <span v-else class="tenant-nav-link is-unavailable" :title="`${item.label} is not available in the Nuxt migration yet`" aria-disabled="true"><component :is="icons[item.id as keyof typeof icons]" :size="19" /><span v-if="!collapsed">{{ item.label }}</span></span>
    </template>
    <NuxtLink v-if="canViewSettings" to="/settings" class="tenant-nav-link" :class="{ 'is-active': isActive('/settings') }" :title="collapsed ? 'Settings' : undefined" @click="emit('navigate')"><PhGearSix :size="19" :weight="isActive('/settings') ? 'fill' : 'regular'" /><span v-if="!collapsed">Settings</span></NuxtLink>
  </nav>
</template>
