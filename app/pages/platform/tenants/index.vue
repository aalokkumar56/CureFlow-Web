<script setup lang="ts">
import { usePlatformResource } from '~/composables/platform/usePlatformResource'
import { displayPlatformValue, enumOptions } from '~/utils/platform'
import type { PlatformRow } from '~/utils/platform'
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const { data, loading, error, load } = usePlatformResource<PlatformRow[]>(() => '/platform/tenants')
const search = ref('')
const status = ref('')
const type = ref('')
const statuses = enumOptions(['pending_approval', 'active', 'suspended', 'rejected'])
const types = enumOptions(['hospital', 'clinic', 'nursing_home', 'laboratory', 'pharmacy', 'other'])
const rows = computed(() =>
  (data.value || []).filter(
    (t) =>
      (!status.value || t.lifecycleStatus === status.value) &&
      (!type.value || t.tenantType === type.value) &&
      [t.name, t.slug, t.contactEmail].join(' ').toLowerCase().includes(search.value.toLowerCase()),
  ),
)
const statusClass = (s: unknown) =>
  ({ active: 'is-positive', pending_approval: 'is-warn', suspended: 'is-negative', rejected: 'is-muted' })[String(s)] || ''
onMounted(load)
</script>
<template>
  <PlatformShell>
    <section class="platform-tenants-page">
      <div class="platform-page-heading">
        <div>
          <p class="platform-eyebrow">Customer management</p>
          <h1>Tenants</h1>
          <p>Manage healthcare businesses registered with CureFlow.</p>
        </div>
        <div class="platform-page-heading-actions">
          <button type="button" class="platform-secondary-button" :disabled="loading" @click="load">Refresh</button>
        </div>
      </div>
      <div class="platform-filter-panel" style="padding:16px 20px">
        <div class="platform-form-grid" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:0">
          <label>
            Search
            <input v-model="search" type="search" placeholder="Name, email or slug" />
          </label>
          <label>
            Status
            <select v-model="status">
              <option value="">All statuses</option>
              <option v-for="s in statuses" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </label>
          <label>
            Tenant type
            <select v-model="type">
              <option value="">All types</option>
              <option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </label>
        </div>
      </div>
      <PlatformState :loading="loading" :error="error" :empty="!rows.length" @retry="load">
        <div class="platform-tenant-list">
          <article v-for="tenant in rows" :key="tenant.id" class="platform-tenant-card">
            <div class="platform-tenant-info">
              <NuxtLink :to="'/platform/tenants/' + tenant.id" class="platform-tenant-name">
                {{ tenant.name }}
              </NuxtLink>
              <small>
                {{ displayPlatformValue(tenant.tenantType) }}
                <template v-if="tenant.contactEmail"> · {{ tenant.contactEmail }}</template>
                <template v-if="tenant.plan"> · {{ displayPlatformValue(tenant.plan) }} plan</template>
              </small>
            </div>
            <div class="platform-tenant-actions">
              <span class="platform-badge" :class="statusClass(tenant.lifecycleStatus)">
                {{ displayPlatformValue(tenant.lifecycleStatus) }}
              </span>
              <NuxtLink :to="'/platform/tenants/' + tenant.id" class="platform-secondary-button">
                Manage
              </NuxtLink>
            </div>
          </article>
        </div>
        <p v-if="rows.length" class="platform-muted" style="margin-top:14px;font-size:12px">
          {{ rows.length }} tenant{{ rows.length !== 1 ? 's' : '' }}
        </p>
      </PlatformState>
    </section>
  </PlatformShell>
</template>
