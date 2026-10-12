<script setup lang="ts">
import { usePlatformResource } from '~/composables/platform/usePlatformResource'
import { usePlatformAccess } from '~/composables/platform/usePlatformAccess'
import { platformDelete } from '../../../../utils/auth/platformClient'
import type { PlatformField, PlatformRow, PlatformValue } from '~/utils/platform'
import { displayPlatformValue } from '~/utils/platform'
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const route = useRoute()
const access = usePlatformAccess()
const endpoint = computed(() => '/platform/tenants/' + route.params.id + '/entitlements')
const { data, loading, saving, error, load, save } = usePlatformResource<PlatformRow[]>(
  () => endpoint.value,
)
const editing = ref<PlatformRow | null>(null)
const search = ref('')
const resetting = ref(false)
const toast = useToast()
const rows = computed(() =>
  (data.value || []).filter((row) =>
    String(row.name).toLowerCase().includes(search.value.toLowerCase()),
  ),
)
const enabledCount = computed(() => (data.value || []).filter((r) => r.effective).length)
const initial = computed(() => ({
  ...editing.value,
  mode:
    editing.value?.source === 'tenant' ? (editing.value.isEnabled ? 'grant' : 'revoke') : 'inherit',
  reason: '',
}))
const fields: PlatformField[] = [
  {
    key: 'mode',
    label: 'Access policy',
    type: 'select',
    required: true,
    options: [
      { value: 'inherit', label: 'Use subscription plan default' },
      { value: 'grant', label: 'Grant access for this tenant' },
      { value: 'revoke', label: 'Revoke access for this tenant' },
    ],
  },
  {
    key: 'limit',
    label: 'Contracted usage limit (optional)',
    type: 'number',
    min: 0,
    max: 100000000,
    help: 'Records the contracted limit; module-specific metering is separate.',
  },
  { key: 'expiresAt', label: 'Override expires (optional)', type: 'datetime-local' },
  { key: 'reason', label: 'Reason for change', required: true, min: 3, max: 500 },
]
const submit = async (value: Record<string, PlatformValue>) => {
  if (!editing.value || resetting.value || saving.value) return
  const target = endpoint.value + '/' + editing.value.moduleId
  if (value.mode === 'inherit') {
    resetting.value = true
    try {
      await platformDelete(target, { reason: value.reason })
      toast.show('Subscription plan access restored.')
      editing.value = null
      await load()
    } catch (cause) {
      error.value = cause
    } finally {
      resetting.value = false
    }
  } else if (
    await save(target, {
      isEnabled: value.mode === 'grant',
      limit: value.limit,
      expiresAt: value.expiresAt,
      reason: value.reason,
    })
  )
    editing.value = null
}
const beginEdit = (row: PlatformRow) => {
  editing.value = row
  error.value = null
}
onMounted(load)
</script>
<template>
  <PlatformShell>
    <PlatformTenantNav />
    <section class="platform-tenants-page">
      <div class="platform-page-heading">
        <div>
          <p class="platform-eyebrow">Tenant configuration</p>
          <h1>Modules</h1>
          <p>
            Grant or revoke module access for this tenant. Individual overrides take priority over
            the subscription plan.
          </p>
        </div>
        <div class="platform-page-heading-actions">
          <span class="platform-badge is-positive is-large">{{ enabledCount }} enabled</span>
        </div>
      </div>

      <div class="platform-info-banner">
        Plan access applies automatically. Use tenant overrides to grant or revoke a specific
        module, or restore plan policy at any time.
      </div>

      <PlatformForm
        v-if="editing"
        :fields="fields"
        :initial="initial"
        :busy="saving || resetting"
        :error="error"
        :title="'Manage access · ' + editing.name"
        @save="submit"
        @cancel="editing = null" />

      <label class="platform-search">
        Find a module
        <input v-model="search" type="search" placeholder="Search modules" />
      </label>

      <PlatformState
        :loading="loading"
        :error="editing ? undefined : error"
        :empty="!rows.length"
        @retry="load">
        <div class="platform-module-grid">
          <article v-for="row in rows" :key="String(row.moduleId)" class="platform-module-card">
            <div class="platform-card-heading">
              <h2>{{ row.name }}</h2>
              <span class="platform-badge" :class="row.effective ? 'is-positive' : 'is-muted'">
                {{ row.effective ? 'Enabled' : 'Disabled' }}
              </span>
            </div>
            <p>{{ row.description || 'Control access to this application capability.' }}</p>
            <dl class="platform-compact-details">
              <div>
                <dt>Access policy</dt>
                <dd>{{ row.source === 'tenant' ? 'Tenant override' : 'Subscription plan' }}</dd>
              </div>
              <div>
                <dt>Plan default</dt>
                <dd>{{ row.planEnabled ? 'Included' : 'Not included' }}</dd>
              </div>
              <div v-if="row.limit">
                <dt>Usage limit</dt>
                <dd>{{ row.limit }}</dd>
              </div>
              <div v-if="row.expiresAt">
                <dt>Override expires</dt>
                <dd>{{ displayPlatformValue(row.expiresAt) }}</dd>
              </div>
            </dl>
            <button
              v-if="access.can('entitlements.write')"
              type="button"
              class="platform-secondary-button"
              @click="beginEdit(row)">
              Manage access
            </button>
          </article>
        </div>
      </PlatformState>
    </section>
  </PlatformShell>
</template>
