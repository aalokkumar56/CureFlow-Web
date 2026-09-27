<script setup lang="ts">
import { facilityFields } from '~/utils/platformFields'
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const route = useRoute()
</script>
<template>
  <PlatformShell>
    <PlatformTenantNav />
    <PlatformManager
      title="Facilities"
      edit-label="Update information"
      description="Manage locations, their contact address and the primary location."
      :endpoint="'/platform/tenants/' + route.params.id + '/facilities'"
      permission="facilities.write"
      :fields="facilityFields"
      :columns="[
        { key: 'name', label: 'Name' },
        { key: 'code', label: 'Code' },
        { key: 'city', label: 'City' },
        { key: 'isPrimary', label: 'Primary' },
        { key: 'isActive', label: 'Active' },
      ]"
      :defaults="{ country: 'IN', isActive: true, isPrimary: false }"
      create
    />
  </PlatformShell>
</template>
