<script setup lang="ts">
import type { PlatformField } from '~/utils/platform'
import { platformGet } from '../../utils/auth/platformClient'
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const roles = ref<{ key: string; name: string }[]>([])
const error = shallowRef<unknown>(null)
const load = async () => {
  try {
    roles.value = await platformGet('/platform/roles')
    error.value = null
  } catch (cause) {
    error.value = cause
  }
}
onMounted(load)
const fields = computed<PlatformField[]>(() => [
  { key: 'name', label: 'Full name', required: true, min: 2, max: 120 },
  { key: 'email', label: 'Email', type: 'email', required: true, max: 254 },
  {
    key: 'role',
    label: 'Permission group',
    type: 'select',
    required: true,
    options: roles.value.map((r) => ({ value: r.key, label: r.name })),
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    min: 12,
    max: 128,
    help: 'Required for new operators. Leave blank when editing to keep the current password.',
  },
  { key: 'isActive', label: 'Active', type: 'checkbox' },
])
</script>
<template>
  <PlatformShell
    ><PlatformState v-if="error" :error="error" @retry="load" /><PlatformManager
      title="Operators"
      description="Create platform operator accounts and assign permission groups. Owners cannot remove their own access."
      endpoint="/platform/operators"
      permission="operators.write"
      :fields="fields"
      :columns="[
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Permission group' },
        { key: 'isActive', label: 'Active' },
      ]"
      :defaults="{ isActive: true, role: 'viewer' }"
      create
  /></PlatformShell>
</template>
