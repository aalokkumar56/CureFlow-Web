<script setup lang="ts">
import type { PlatformField } from '~/utils/platform'
import { platformGet } from '../../utils/auth/platformClient'
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const permissions = ref<string[]>([])
const error = shallowRef<unknown>(null)
const load = async () => {
  try {
    permissions.value = await platformGet('/platform/permissions')
    error.value = null
  } catch (cause) {
    error.value = cause
  }
}
onMounted(load)
const fields = computed<PlatformField[]>(() => [
  {
    key: 'key',
    label: 'Group key',
    required: true,
    min: 2,
    max: 40,
    help: 'Lowercase letters, digits and hyphens. Cannot be renamed.',
  },
  { key: 'name', label: 'Name', required: true, min: 2, max: 120 },
  {
    key: 'permissions',
    label: 'Permissions',
    type: 'permissions',
    options: permissions.value.map((p) => ({ value: p, label: p })),
    help: 'Use Ctrl or Command to select multiple permissions. Only owners can change groups.',
  },
])
</script>
<template>
  <PlatformShell
    ><PlatformState v-if="error" :error="error" @retry="load" /><PlatformManager
      title="Permission groups"
      description="Permission changes take effect on the next request, including existing sessions. The owner group is protected."
      endpoint="/platform/roles"
      permission="roles.write"
      :fields="fields"
      :columns="[
        { key: 'name', label: 'Group' },
        { key: 'key', label: 'Key' },
        { key: 'permissions', label: 'Permissions' },
      ]"
      create
  /></PlatformShell>
</template>
