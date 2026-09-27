<script setup lang="ts">
import { usePlatformResource } from '~/composables/platform/usePlatformResource'
import { usePlatformAccess } from '~/composables/platform/usePlatformAccess'
import { platformGet } from '../../utils/auth/platformClient'
import { displayPlatformValue } from '~/utils/platform'
import type { PlatformRow, PlatformField, PlatformValue } from '~/utils/platform'
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const access = usePlatformAccess()
const { data, loading, error, saving, load, save } = usePlatformResource<PlatformRow[]>(
  () => '/platform/operations/jobs',
)
const tenants = ref<PlatformRow[]>([])
const editing = ref(false)
const fields = computed<PlatformField[]>(() => [
  {
    key: 'tenantId',
    label: 'Active tenant',
    type: 'select',
    required: true,
    options: tenants.value
      .filter((t) => t.lifecycleStatus === 'active')
      .map((t) => ({ value: String(t.id), label: String(t.name) })),
  },
  { key: 'reason', label: 'Reason', required: true, min: 3, max: 500 },
])
const refresh = async () => {
  await load()
  if (access.can('tenants.read'))
    try {
      tenants.value = await platformGet('/platform/tenants')
    } catch (cause) {
      error.value = cause
    }
}
const submit = async (value: Record<string, PlatformValue>) => {
  if (await save('/platform/operations/jobs', value, true)) editing.value = false
}
onMounted(refresh)
</script>
<template>
  <PlatformShell
    ><section class="platform-tenants-page">
      <div class="platform-page-heading">
        <div>
          <h1>Operations</h1>
          <p>
            Provision a primary facility and missing default module grants for an approved tenant.
            Repeating this operation preserves existing settings.
          </p>
        </div>
        <button
          v-if="access.can('operations.write')"
          type="button"
          class="platform-primary-button"
          @click="editing = true">
          Provision tenant
        </button>
      </div>
      <PlatformForm
        v-if="editing"
        title="Provision tenant defaults"
        :fields="fields"
        :initial="{}"
        :error="error"
        :busy="saving"
        @save="submit"
        @cancel="editing = false" /><button
        type="button"
        class="platform-secondary-button"
        @click="refresh">
        Refresh</button
      ><PlatformState
        :loading="loading"
        :error="editing ? undefined : error"
        :empty="!data?.length"
        @retry="refresh"
        ><div class="platform-tenant-list">
          <article v-for="job in data" :key="job.id" class="platform-tenant-card">
            <div class="platform-tenant-info">
              <strong>{{ displayPlatformValue(job.jobType) }}</strong
              ><small
                >{{ tenants.find((t) => t.id === job.tenantId)?.name || job.tenantId }} ·
                {{ displayPlatformValue(job.createdAt) }}</small
              ><small v-if="job.error">{{ job.error }}</small>
            </div>
            <span>{{ job.status }}</span>
          </article>
        </div></PlatformState
      >
    </section></PlatformShell
  >
</template>
