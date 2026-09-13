<script setup lang="ts">
import { PhList, PhUsersThree } from '@phosphor-icons/vue'
import { useTenantShell } from '~/composables/tenant/useTenantShell'
import GlobalSearch from '~/components/tenant/search/GlobalSearch.vue'
import NotificationMenu from '~/components/tenant/notifications/NotificationMenu.vue'

const route = useRoute()
const { mobileOpen } = useTenantShell()
const patientTotal = useState<number | null>('tenant-patient-total', () => null)
const isPatientsList = computed(() => route.path === '/patients')
const title = computed(() => {
  if (route.path === '/') return 'Dashboard'
  if (route.path === '/patients/new') return 'New patient'
  if (route.path.startsWith('/patients/')) return 'Patients'
  return route.path.split('/').filter(Boolean).at(-1)?.replace(/-/g, ' ') || 'CureFlow'
})
</script>

<template>
  <header class="tenant-header">
    <div class="tenant-header-title">
      <button class="tenant-header-menu" type="button" aria-label="Open navigation" @click="mobileOpen = true"><PhList :size="21" weight="bold" /></button>
      <PhUsersThree v-if="isPatientsList" class="tenant-header-patient-icon" :size="22" />
      <h1>{{ title }}</h1>
      <span v-if="isPatientsList" class="tenant-header-patient-count">{{ patientTotal ?? '—' }}</span>
    </div>
    <div class="tenant-header-actions">
      <GlobalSearch />
      <NotificationMenu />
    </div>
  </header>
</template>
