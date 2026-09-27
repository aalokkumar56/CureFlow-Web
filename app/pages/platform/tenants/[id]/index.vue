<script setup lang="ts">
import { usePlatformResource } from '~/composables/platform/usePlatformResource'
import { usePlatformAccess } from '~/composables/platform/usePlatformAccess'
import { subscriptionFields, tenantProfileFields } from '~/utils/platformFields'
import { displayPlatformValue, enumOptions } from '~/utils/platform'
import type { PlatformField, PlatformRow, PlatformValue } from '~/utils/platform'
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const route = useRoute()
const access = usePlatformAccess()
const base = computed(() => '/platform/tenants/' + route.params.id)
const { data, loading, error, saving, load, save } = usePlatformResource<{
  tenant: PlatformRow
  usage: { users: number; patients: number }
}>(() => base.value)
const mode = ref('')
const action = ref('')
const initial = ref<Record<string, unknown>>({})
const reason: PlatformField = { key: 'reason', label: 'Reason for change', required: true, min: 3, max: 500 }
const fields = computed<PlatformField[]>(() =>
  mode.value === 'profile'
    ? tenantProfileFields
    : mode.value === 'plan'
      ? subscriptionFields
      : mode.value === 'type'
        ? [{ key: 'tenantType', label: 'Tenant type', type: 'select', required: true, options: enumOptions(['hospital','clinic','nursing_home','laboratory','pharmacy','other']) }, reason]
        : [reason],
)
const actions = computed(
  () => (({ pending_approval: ['approve','reject'], active: ['suspend'], suspended: ['activate'], rejected: ['reopen'] })[String(data.value?.tenant.lifecycleStatus)] || []),
)
const statusClass = (s: unknown) =>
  ({ active: 'is-positive', pending_approval: 'is-warn', suspended: 'is-negative', rejected: 'is-muted' })[String(s)] || ''
const edit = (next: string, value = '') => {
  mode.value = next
  action.value = value
  initial.value = { ...data.value?.tenant, status: data.value?.tenant.subscriptionStatus, reason: '' }
  error.value = null
}
const submit = async (value: Record<string, PlatformValue>) => {
  const endpoint = mode.value === 'lifecycle' ? '/lifecycle/' + action.value : '/' + mode.value
  if (await save(base.value + endpoint, value)) mode.value = ''
}
onMounted(load)
</script>
<template>
  <PlatformShell>
    <PlatformTenantNav />
    <section class="platform-tenants-page">
      <PlatformState :loading="loading" :error="mode ? undefined : error" @retry="load">
        <template v-if="data">
          <div class="platform-page-heading">
            <div>
              <p class="platform-eyebrow">{{ displayPlatformValue(data.tenant.tenantType) }}</p>
              <h1>{{ data.tenant.name }}</h1>
              <p>{{ data.tenant.contactEmail }}</p>
            </div>
            <div class="platform-page-heading-actions">
              <span class="platform-badge is-large" :class="statusClass(data.tenant.lifecycleStatus)">
                {{ displayPlatformValue(data.tenant.lifecycleStatus) }}
              </span>
            </div>
          </div>

          <div class="platform-tenant-detail-grid">
            <div class="platform-stat-card">
              <div class="stat-value">{{ data.usage.users }}</div>
              <div class="stat-label">Users</div>
              <div class="stat-sub">of {{ data.tenant.seatLimit }} seats</div>
            </div>
            <div class="platform-stat-card">
              <div class="stat-value">{{ data.usage.patients }}</div>
              <div class="stat-label">Patients</div>
              <div class="stat-sub">of {{ data.tenant.patientLimit }} limit</div>
            </div>
            <div class="platform-stat-card is-accent">
              <div class="stat-value" style="font-size:22px">{{ displayPlatformValue(data.tenant.plan) }}</div>
              <div class="stat-label">Subscription plan</div>
              <div class="stat-sub">{{ displayPlatformValue(data.tenant.subscriptionStatus) }}</div>
            </div>
          </div>

          <div class="platform-tenant-actions" style="margin-bottom:24px">
            <template v-if="access.can('tenants.write')">
              <button
                v-for="item in actions"
                :key="item"
                type="button"
                class="platform-secondary-button"
                @click="edit('lifecycle', item)">
                {{ displayPlatformValue(item) }}
              </button>
              <button type="button" class="platform-secondary-button" @click="edit('profile')">
                Update information
              </button>
              <button type="button" class="platform-secondary-button" @click="edit('type')">
                Correct tenant type
              </button>
            </template>
            <button
              v-if="access.can('billing.write')"
              type="button"
              class="platform-secondary-button"
              @click="edit('plan')">
              Edit subscription
            </button>
          </div>

          <PlatformForm
            v-if="mode"
            :fields="fields"
            :initial="initial"
            :busy="saving"
            :error="error"
            :title="mode === 'lifecycle' ? 'Confirm: ' + displayPlatformValue(action) : mode === 'profile' ? 'Update tenant information' : mode === 'plan' ? 'Edit subscription' : 'Correct tenant type'"
            @save="submit"
            @cancel="mode = ''" />

          <div class="platform-detail-panel">
            <h2>Account details</h2>
            <dl>
              <div v-for="key in ['contactName','contactEmail','contactPhone','country','timezone','slug','onboardingComplete','messagesQuotaMonthly','trialEndsAt','subscriptionRenewsAt','createdAt']" :key="key">
                <dt>{{ displayPlatformValue(key) }}</dt>
                <dd>{{ displayPlatformValue(data.tenant[key]) }}</dd>
              </div>
            </dl>
          </div>
        </template>
      </PlatformState>
    </section>
  </PlatformShell>
</template>
