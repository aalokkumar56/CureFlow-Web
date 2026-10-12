<script setup lang="ts">
import { usePlatformResource } from '~/composables/platform/usePlatformResource'
import { usePlatformAccess } from '~/composables/platform/usePlatformAccess'
import { moduleFields } from '~/utils/platformFields'
import type { PlatformField, PlatformRow, PlatformValue } from '~/utils/platform'
// No direct platformClient import needed — save() uses usePlatformResource
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const access = usePlatformAccess()
const { data, loading, saving, error, load, save } = usePlatformResource<PlatformRow[]>(
  () => '/platform/modules',
)
const search = ref('')
const editing = ref<PlatformRow | null>(null)

// All supported modules from the backend catalog
const supported = [
  {
    key: 'patients',
    name: 'Patients',
    description: 'Patient registration, profiles and documents',
  },
  { key: 'appointments', name: 'Appointments', description: 'Appointment scheduling and booking' },
  { key: 'leads', name: 'Leads', description: 'Lead acquisition and conversion' },
  {
    key: 'communications',
    name: 'Communications',
    description: 'WhatsApp, email, templates and message assistance',
  },
  { key: 'campaigns', name: 'Campaigns', description: 'Patient outreach campaigns' },
  {
    key: 'clinical',
    name: 'Clinical records',
    description: 'Visits, notes, prescriptions, allergies and laboratory reports',
  },
  {
    key: 'referrals',
    name: 'Referral CRM',
    description: 'Referring doctors and referral relationships',
  },
  { key: 'follow-ups', name: 'Follow-ups', description: 'Follow-up tasks and reminders' },
  { key: 'analytics', name: 'Analytics', description: 'Dashboard and clinical reporting' },
  { key: 'staff', name: 'Hospital staff', description: 'Staff profiles and schedules' },
]

type CatalogModule = (typeof supported)[number] & {
  registered: boolean
  id?: string
  isActive?: boolean
  isCore?: boolean
}

const merged = computed<CatalogModule[]>(() =>
  supported
    .filter(
      (s) =>
        !search.value ||
        [s.name, s.description, s.key].join(' ').toLowerCase().includes(search.value.toLowerCase()),
    )
    .map((s) => {
      const db = (data.value || []).find((r) => r.key === s.key)
      return {
        ...s,
        ...db,
        key: s.key,
        name: typeof db?.name === 'string' ? db.name : s.name,
        description: typeof db?.description === 'string' ? db.description : s.description,
        registered: !!db,
        isActive: typeof db?.isActive === 'boolean' ? db.isActive : undefined,
        isCore: typeof db?.isCore === 'boolean' ? db.isCore : undefined,
      }
    }),
)

const formFields: PlatformField[] = [
  ...moduleFields.filter((f) => f.key !== 'key'),
  { key: 'reason', label: 'Reason for change', required: true, min: 3, max: 500 },
]

const begin = (row: (typeof merged.value)[0]) => {
  error.value = null
  editing.value = {
    ...row,
    isActive: row.isActive ?? true,
    isCore: row.isCore ?? false,
    reason: '',
  }
}

const submit = async (value: Record<string, PlatformValue>) => {
  if (!editing.value?.id) return
  if (await save('/platform/modules/' + editing.value.id, { ...value, key: editing.value.key }))
    editing.value = null
}

onMounted(load)
</script>
<template>
  <PlatformShell>
    <section class="platform-tenants-page">
      <div class="platform-page-heading">
        <div>
          <p class="platform-eyebrow">Product capabilities</p>
          <h1>Module catalog</h1>
          <p>
            All capabilities supported by CureFlow. Configure plan defaults or manage per-tenant
            access from the tenant's Modules page.
          </p>
        </div>
        <div class="platform-page-heading-actions">
          <NuxtLink class="platform-secondary-button" to="/platform/plans"
            >Manage plan access</NuxtLink
          >
        </div>
      </div>

      <div class="platform-info-banner">
        Modules represent implemented application screens and APIs. New capabilities appear here
        when released by an application update. You can customise the display name and description —
        the capability key is fixed by the release.
      </div>

      <PlatformForm
        v-if="editing"
        :fields="formFields"
        :initial="editing"
        :busy="saving"
        :error="error"
        :title="'Configure · ' + editing.name"
        @save="submit"
        @cancel="editing = null" />

      <label class="platform-search">
        Find a capability
        <input v-model="search" type="search" placeholder="Search modules" />
      </label>

      <PlatformState
        :loading="loading"
        :error="editing ? undefined : error"
        :empty="!merged.length"
        @retry="load">
        <div class="platform-module-grid">
          <article v-for="row in merged" :key="row.key" class="platform-module-card">
            <div class="platform-card-heading">
              <h2>{{ row.name }}</h2>
              <span
                class="platform-badge"
                :class="row.registered ? (row.isActive ? 'is-positive' : 'is-muted') : ''">
                {{ row.registered ? (row.isActive ? 'Active' : 'Inactive') : 'Supported' }}
              </span>
            </div>
            <p>{{ row.description }}</p>
            <dl class="platform-compact-details">
              <div>
                <dt>Capability key</dt>
                <dd>
                  <code>{{ row.key }}</code>
                </dd>
              </div>
              <div v-if="row.registered">
                <dt>Core module</dt>
                <dd>{{ row.isCore ? 'Yes — on by default' : 'No — plan or override required' }}</dd>
              </div>
            </dl>
            <button
              v-if="access.can('modules.write') && row.registered"
              type="button"
              class="platform-secondary-button"
              @click="begin(row)">
              Configure
            </button>
            <span v-else-if="!row.registered" class="platform-muted platform-caption">
              Registered automatically on first use
            </span>
          </article>
        </div>
      </PlatformState>
    </section>
  </PlatformShell>
</template>
