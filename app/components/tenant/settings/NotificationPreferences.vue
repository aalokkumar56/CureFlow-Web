<script setup lang="ts">
import { normalizeApiError } from '~/utils/api/errors'
import { patientList } from '~/utils/patients'
const props = defineProps<{ manageRoles?: boolean }>()
type Preference = {
  notification_type: string
  label?: string
  description?: string
  in_app_enabled: boolean
  can_configure: boolean
}
type RoleDefault = {
  role_id: string
  role_name: string
  notification_type: string
  in_app_enabled: boolean
  can_enable: boolean
}
const { $api } = useNuxtApp()
const items = ref<Preference[]>([])
const roles = ref<RoleDefault[]>([])
const loading = ref(false)
const busy = ref(false)
const error = ref('')
const message = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = patientList<Preference>(
      await $api.get('/notification-preferences'),
    )
    if (props.manageRoles)
      roles.value = patientList<RoleDefault>(
        await $api.get('/notification-preferences/role-defaults'),
      )
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Preferences could not be loaded.')
  } finally {
    loading.value = false
  }
}
async function save(action: 'preferences' | 'reset' | 'roles') {
  if (busy.value || (action === 'roles' && !props.manageRoles)) return
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    if (action === 'reset') await $api.post('/notification-preferences/reset')
    else if (action === 'roles')
      await $api.put('/notification-preferences/role-defaults', roles.value)
    else
      await $api.put('/notification-preferences', {
        preferences: items.value
          .filter((item) => item.can_configure)
          .map(({ notification_type, in_app_enabled }) => ({
            notification_type,
            in_app_enabled,
          })),
      })
    await load()
    if (!error.value) message.value = 'Notification preferences saved.'
  } catch (cause) {
    error.value = normalizeApiError(cause, 'Preferences could not be saved.')
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>
<template>
  <section class="settings-card">
    <header><h2>Notification preferences</h2></header>
    <p v-if="error" class="settings-alert" role="alert">
      {{ error }} <button @click="load">Retry</button>
    </p>
    <p v-if="message" role="status">{{ message }}</p>
    <p v-if="loading">Loading preferences…</p>
    <template v-else
      ><p v-if="!items.length">No notification preferences available.</p>
      <label
        v-for="item in items"
        :key="item.notification_type"
        class="notification-preference"
        ><span
          ><strong>{{ item.label || item.notification_type }}</strong
          ><small>{{ item.description }}</small></span
        ><input
          v-model="item.in_app_enabled"
          type="checkbox"
          :disabled="busy || !item.can_configure"
      /></label>
      <div class="patients-header-actions">
        <button
          class="settings-primary-button"
          :disabled="busy || !items.length"
          @click="save('preferences')"
        >
          Save preferences</button
        ><button
          class="settings-secondary-button"
          :disabled="busy"
          @click="save('reset')"
        >
          Reset to role defaults
        </button>
      </div>
      <details v-if="manageRoles">
        <summary>Role defaults</summary>
        <label
          v-for="item in roles"
          :key="`${item.role_id}:${item.notification_type}`"
          class="notification-preference"
          ><span>{{ item.role_name }} · {{ item.notification_type }}</span
          ><input
            v-model="item.in_app_enabled"
            type="checkbox"
            :disabled="busy || !item.can_enable" /></label
        ><button
          class="settings-primary-button"
          :disabled="busy || !roles.length"
          @click="save('roles')"
        >
          Save role defaults
        </button>
      </details></template
    >
  </section>
</template>
