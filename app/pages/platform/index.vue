<script setup lang="ts">
import { usePlatformResource } from '~/composables/platform/usePlatformResource'
import { displayPlatformValue } from '~/utils/platform'
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const { data, loading, error, load } = usePlatformResource<Record<string, unknown>>(
  () => '/platform/overview',
)
const stats = [
  { key: 'total', label: 'Total tenants', cls: '' },
  { key: 'active', label: 'Active', cls: 'is-accent' },
  { key: 'pending', label: 'Awaiting approval', cls: 'is-warn' },
  { key: 'suspended', label: 'Suspended', cls: 'is-danger' },
  { key: 'pastDue', label: 'Past due', cls: 'is-danger' },
]
onMounted(load)
</script>
<template>
  <PlatformShell>
    <section class="platform-tenants-page">
      <div class="platform-page-heading">
        <div>
          <p class="platform-eyebrow">Platform console</p>
          <h1>Overview</h1>
          <p>Customer accounts and platform health at a glance.</p>
        </div>
        <div class="platform-page-heading-actions">
          <button type="button" class="platform-secondary-button" :disabled="loading" @click="load">
            Refresh
          </button>
          <NuxtLink to="/platform/tenants" class="platform-primary-button">View tenants</NuxtLink>
        </div>
      </div>
      <PlatformState :loading="loading" :error="error" @retry="load">
        <div class="platform-stat-grid">
          <div v-for="stat in stats" :key="stat.key" class="platform-stat-card" :class="stat.cls">
            <div class="stat-value">{{ data?.[stat.key] ?? '—' }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
        <div class="platform-detail-panel">
          <h2>Platform health</h2>
          <dl>
            <div>
              <dt>Database</dt>
              <dd>{{ data?.database }}</dd>
            </div>
            <div>
              <dt>Last checked</dt>
              <dd>{{ displayPlatformValue(data?.checkedAt) }}</dd>
            </div>
          </dl>
        </div>
        <div v-if="data?.byType" class="platform-detail-panel platform-section-panel">
          <h2>Tenants by type</h2>
          <div class="platform-tenant-list platform-list-flush">
            <div v-for="item in data.byType as any[]" :key="item.type" class="platform-type-row">
              <span class="platform-type-name">{{ displayPlatformValue(item.type) }}</span>
              <span class="platform-badge">{{ item.count }}</span>
            </div>
          </div>
        </div>
      </PlatformState>
    </section>
  </PlatformShell>
</template>
