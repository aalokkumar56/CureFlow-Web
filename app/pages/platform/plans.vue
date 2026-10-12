<script setup lang="ts">
import { usePlatformResource } from '~/composables/platform/usePlatformResource'
import { usePlatformAccess } from '~/composables/platform/usePlatformAccess'
import { platformPut } from '../../utils/auth/platformClient'
import { displayPlatformValue } from '~/utils/platform'
import type { PlatformField, PlatformValue } from '~/utils/platform'
type PlanModule = { moduleId: string; key: string; name: string; isEnabled: boolean }
type Plan = { plan: string; modules: PlanModule[] }
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const access = usePlatformAccess()
const { data, loading, error, load } = usePlatformResource<Plan[]>(() => '/platform/plans')
const selected = ref('starter')
const plan = computed(() => data.value?.find((row) => row.plan === selected.value))
const editing = ref<PlanModule | null>(null)
const busy = ref(false)
const toast = useToast()
const initial = computed(() => ({ isEnabled: editing.value?.isEnabled, reason: '' }))
const fields: PlatformField[] = [
  { key: 'isEnabled', label: 'Included in this plan', type: 'checkbox' },
  { key: 'reason', label: 'Reason for change', required: true, min: 3, max: 500 },
]
const submit = async (value: Record<string, PlatformValue>) => {
  if (!editing.value || busy.value) return
  busy.value = true
  try {
    await platformPut(
      '/platform/plans/' + selected.value + '/modules/' + editing.value.moduleId,
      value,
    )
    editing.value = null
    toast.show('Plan module policy saved.')
    await load()
  } catch (cause) {
    error.value = cause
  } finally {
    busy.value = false
  }
}
const choose = (value: string) => {
  selected.value = value
  editing.value = null
}
const beginEdit = (item: PlanModule) => {
  editing.value = item
  error.value = null
}
const planLabels: Record<string, string> = {
  trial: 'Trial',
  starter: 'Starter',
  growth: 'Growth',
  enterprise: 'Enterprise',
}
const enabledCount = computed(() => plan.value?.modules.filter((m) => m.isEnabled).length ?? 0)
onMounted(load)
</script>
<template>
  <PlatformShell>
    <section class="platform-tenants-page">
      <div class="platform-page-heading">
        <div>
          <p class="platform-eyebrow">Commercial configuration</p>
          <h1>Subscription plans</h1>
          <p>
            Define which modules are included in each plan. Tenant-level overrides always take
            priority.
          </p>
        </div>
        <div class="platform-page-heading-actions">
          <NuxtLink to="/platform/modules" class="platform-secondary-button"
            >View module catalog</NuxtLink
          >
        </div>
      </div>

      <div class="platform-info-banner">
        Changes apply to every tenant on this plan that uses its default policy. To override access
        for a specific tenant, open that tenant's Modules page.
      </div>

      <nav class="platform-tabs" aria-label="Subscription plans">
        <button
          v-for="item in data"
          :key="item.plan"
          type="button"
          :class="{ active: selected === item.plan }"
          @click="choose(item.plan)">
          {{ planLabels[item.plan] || displayPlatformValue(item.plan) }}
        </button>
      </nav>

      <PlatformForm
        v-if="editing"
        :fields="fields"
        :initial="initial"
        :busy="busy"
        :error="error"
        :title="
          (planLabels[selected] || displayPlatformValue(selected)) + ' plan · ' + editing.name
        "
        @save="submit"
        @cancel="editing = null" />

      <PlatformState
        :loading="loading"
        :error="editing ? undefined : error"
        :empty="!plan"
        @retry="load">
        <div class="platform-summary-badges">
          <span class="platform-badge is-positive is-large"
            >{{ enabledCount }} modules included</span
          >
          <span class="platform-badge is-muted is-large"
            >{{ (plan?.modules.length ?? 0) - enabledCount }} not included</span
          >
        </div>
        <div class="platform-module-grid">
          <article v-for="item in plan?.modules" :key="item.moduleId" class="platform-module-card">
            <div class="platform-card-heading">
              <h2>{{ item.name }}</h2>
              <span class="platform-badge" :class="item.isEnabled ? 'is-positive' : 'is-muted'">
                {{ item.isEnabled ? 'Included' : 'Not included' }}
              </span>
            </div>
            <p>
              {{
                item.isEnabled
                  ? "Available to tenants using this plan's default access."
                  : 'Requires an individual tenant grant to enable access.'
              }}
            </p>
            <button
              v-if="access.can('modules.write')"
              class="platform-secondary-button"
              type="button"
              @click="beginEdit(item)">
              Change plan access
            </button>
          </article>
        </div>
      </PlatformState>
    </section>
  </PlatformShell>
</template>
