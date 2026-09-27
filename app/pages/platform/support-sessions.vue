<script setup lang="ts">
import { usePlatformResource } from '~/composables/platform/usePlatformResource'
import { usePlatformAccess } from '~/composables/platform/usePlatformAccess'
import { platformGet } from '../../utils/auth/platformClient'
import { displayPlatformValue } from '~/utils/platform'
import type { PlatformRow, PlatformField, PlatformValue } from '~/utils/platform'
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const access = usePlatformAccess()
const { data, loading, error, saving, load, save } = usePlatformResource<PlatformRow[]>(
  () => '/platform/support-sessions',
)
const tenants = ref<PlatformRow[]>([])
const editing = ref(false)
const revokeId = ref('')
const snapshot = ref<unknown>(null)
const start = (id = '') => {
  revokeId.value = id
  editing.value = true
  error.value = null
}
const cancel = () => {
  editing.value = false
  revokeId.value = ''
}
const fields = computed<PlatformField[]>(() =>
  revokeId.value
    ? [{ key: 'reason', label: 'Revocation reason', required: true, min: 3, max: 500 }]
    : [
        {
          key: 'tenantId',
          label: 'Tenant',
          type: 'select',
          required: true,
          options: tenants.value.map((t) => ({ value: String(t.id), label: String(t.name) })),
        },
        {
          key: 'durationMinutes',
          label: 'Duration (minutes)',
          type: 'number',
          required: true,
          min: 5,
          max: 120,
        },
        { key: 'reason', label: 'Support reason', required: true, min: 3, max: 500 },
      ],
)
const initial = computed(() => ({ durationMinutes: 30, reason: '' }))
const refresh = async () => {
  await load()
  if (access.can('tenants.read'))
    try {
      tenants.value = await platformGet('/platform/tenants')
    } catch (cause) {
      error.value = cause
    }
}
const state = (row: PlatformRow) =>
  row.revokedAt
    ? 'Revoked'
    : new Date(String(row.expiresAt)).getTime() <= Date.now()
      ? 'Expired'
      : 'Active'
const submit = async (value: Record<string, PlatformValue>) => {
  const target = revokeId.value
    ? '/platform/support-sessions/' + revokeId.value + '/revoke'
    : '/platform/support-sessions'
  if (await save(target, value, !revokeId.value)) {
    editing.value = false
    revokeId.value = ''
  }
}
const inspect = async (row: PlatformRow) => {
  try {
    snapshot.value = await platformGet('/platform/support-sessions/' + row.id + '/snapshot')
  } catch (cause) {
    error.value = cause
  }
}
onMounted(refresh)
</script>
<template>
  <PlatformShell
    ><section class="platform-tenants-page">
      <div class="platform-page-heading">
        <div>
          <h1>Support sessions</h1>
          <p>
            Time-limited, audited access to account configuration and usage counts. Clinical records
            are outside this support scope.
          </p>
        </div>
        <button
          v-if="access.can('support.write')"
          class="platform-primary-button"
          type="button"
          @click="start()">
          Start support session
        </button>
      </div>
      <PlatformForm
        v-if="editing"
        :fields="fields"
        :initial="initial"
        :busy="saving"
        :error="error"
        :title="revokeId ? 'Revoke support access' : 'Start read-only support access'"
        @save="submit"
        @cancel="cancel" /><PlatformState
        :loading="loading"
        :error="editing ? undefined : error"
        :empty="!data?.length"
        @retry="refresh"
        ><div class="platform-tenant-list">
          <article v-for="row in data" :key="row.id" class="platform-tenant-card">
            <div class="platform-tenant-info">
              <strong>{{ row.tenantName }}</strong
              ><small>{{ row.operatorName }} · {{ row.reason }}</small
              ><small>Expires {{ displayPlatformValue(row.expiresAt) }}</small>
            </div>
            <span>{{ state(row) }}</span>
            <div class="platform-tenant-actions">
              <button
                v-if="state(row) === 'Active' && row.platformUserId === access.user.value?.id"
                type="button"
                class="platform-secondary-button"
                @click="inspect(row)">
                View account</button
              ><button
                v-if="state(row) === 'Active' && access.can('support.write')"
                type="button"
                class="platform-danger-button"
                @click="start(String(row.id))">
                Revoke
              </button>
            </div>
          </article>
        </div></PlatformState
      >
      <section v-if="snapshot" class="platform-detail-panel">
        <h2>Support account snapshot</h2>
        <pre class="platform-audit-json">{{ JSON.stringify(snapshot, null, 2) }}</pre>
        <button type="button" class="platform-secondary-button" @click="snapshot = null">
          Close
        </button>
      </section>
    </section></PlatformShell
  >
</template>
