<script setup lang="ts">
import { useDashboardData } from '~/composables/dashboard/useDashboardData'

definePageMeta({
  layout: 'tenant',
  middleware: ['tenant-auth', 'tenant-approval'],
})

const { overview, loading, error, canView, load } = useDashboardData()
const formatRupee = (value: unknown) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`

const revenue = computed(() => {
  const values = overview.value?.revenue_month
  return Array.isArray(values) ? values : []
})

const total = computed(() =>
  revenue.value.reduce(
    (sum, item) => sum + Number((item as Record<string, unknown>).amount || 0),
    0,
  ),
)

onMounted(load)
</script>

<template>
  <main class="dashboard-page">
    <header class="dashboard-heading">
      <div>
        <p class="patients-kicker">Analytics</p>
        <h1>Revenue overview</h1>
        <p>Review this month’s recorded revenue activity.</p>
      </div>
    </header>

    <div v-if="!canView" class="dashboard-state">
      You do not have permission to view analytics.
    </div>
    <div v-else-if="loading" class="dashboard-state">Loading revenue…</div>
    <div v-else-if="error" class="dashboard-state">
      <p>{{ error }}</p>
      <button class="dashboard-retry" type="button" @click="load">Try again</button>
    </div>
    <section v-else class="dashboard-panel revenue-panel">
      <div class="dashboard-panel-title">
        <div>
          <h2>This month</h2>
          <p>Recorded revenue</p>
        </div>
      </div>
      <strong class="revenue-total">{{ formatRupee(total) }}</strong>
      <div v-if="revenue.length" class="revenue-bars">
        <span
          v-for="(item, index) in revenue"
          :key="String((item as Record<string, unknown>).label || index)"
          :style="{ height: `${Math.max(8, (Number((item as Record<string, unknown>).amount || 0) / Math.max(1, ...revenue.map(value => Number((value as Record<string, unknown>).amount || 0)))) * 100)}%` }"
          :title="`${(item as Record<string, unknown>).label || ''}: ${formatRupee((item as Record<string, unknown>).amount)}`"
        />
      </div>
      <p v-else class="dashboard-empty">No revenue activity for this month.</p>
    </section>
  </main>
</template>
