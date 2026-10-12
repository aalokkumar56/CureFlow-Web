<script setup lang="ts">
import { usePlatformResource } from '~/composables/platform/usePlatformResource'
import type { PlatformRow } from '~/utils/platform'
import { displayPlatformValue } from '~/utils/platform'
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const tab = ref('activity')
const search = ref('')
const errorsOnly = ref(false)
const method = ref('')
const from = ref('')
const to = ref('')
const page = ref(1)
const applied = ref('')
const activity = usePlatformResource<{
  items: PlatformRow[]
  total: number
  page: number
  pageSize: number
}>(() => '/platform/api-activity?page=' + page.value + '&pageSize=50' + applied.value)
const changes = usePlatformResource<PlatformRow[]>(
  () => '/platform/audit-logs?page=' + page.value + '&search=' + encodeURIComponent(search.value),
)
const loading = computed(() =>
  tab.value === 'activity' ? activity.loading.value : changes.loading.value,
)
const error = computed(() =>
  tab.value === 'activity' ? activity.error.value : changes.error.value,
)
const rows = computed(() =>
  tab.value === 'activity' ? activity.data.value?.items : changes.data.value,
)
const total = computed(() => activity.data.value?.total ?? 0)
const load = () => (tab.value === 'activity' ? activity.load() : changes.load())
const apply = () => {
  page.value = 1
  const query = new URLSearchParams({
    search: search.value,
    errorsOnly: String(errorsOnly.value),
    method: method.value,
  })
  if (from.value) query.set('from', new Date(from.value).toISOString())
  if (to.value) query.set('to', new Date(to.value).toISOString())
  applied.value = '&' + query.toString()
  load()
}
const choose = (value: string) => {
  tab.value = value
  page.value = 1
  load()
}
const step = (delta: number) => {
  page.value += delta
  load()
}
const details = ref<PlatformRow | null>(null)
const statusClass = (code: unknown) =>
  Number(code) >= 500 ? 'is-negative' : Number(code) >= 400 ? 'is-warn' : 'is-positive'
onMounted(load)
</script>
<template>
  <PlatformShell>
    <section class="platform-tenants-page">
      <div class="platform-page-heading">
        <div>
          <p class="platform-eyebrow">Governance & observability</p>
          <h1>Audit & API activity</h1>
          <p>
            Trace tenant API usage, investigate failures and review platform configuration changes.
          </p>
        </div>
        <div class="platform-page-heading-actions">
          <button type="button" class="platform-secondary-button" :disabled="loading" @click="load">
            Refresh
          </button>
        </div>
      </div>

      <nav class="platform-tabs" aria-label="Audit views">
        <button type="button" :class="{ active: tab === 'activity' }" @click="choose('activity')">
          Tenant API activity
        </button>
        <button type="button" :class="{ active: tab === 'changes' }" @click="choose('changes')">
          Platform changes
        </button>
      </nav>

      <form class="platform-filter-panel" @submit.prevent="apply">
        <div class="platform-form-grid platform-audit-filter-grid">
          <label>
            Search
            <input v-model="search" type="search" placeholder="Tenant, route or correlation ID" />
          </label>
          <template v-if="tab === 'activity'">
            <label>
              HTTP method
              <select v-model="method">
                <option value="">All methods</option>
                <option v-for="m in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']" :key="m">
                  {{ m }}
                </option>
              </select>
            </label>
            <label>From<input v-model="from" type="datetime-local" /></label>
            <label>Until<input v-model="to" type="datetime-local" :min="from" /></label>
          </template>
        </div>
        <div class="platform-inline-actions">
          <label v-if="tab === 'activity'" class="platform-checkbox platform-filter-checkbox">
            <input v-model="errorsOnly" type="checkbox" />
            Failures only
          </label>
          <button type="submit" class="platform-primary-button" :disabled="loading">
            Apply filters
          </button>
        </div>
      </form>

      <PlatformState :loading="loading" :error="error" :empty="!rows?.length" @retry="load">
        <!-- API Activity table -->
        <div v-if="tab === 'activity'" class="platform-table-scroll">
          <table class="platform-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Request</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id">
                <td>
                  <strong>{{ row.tenantName || '—' }}</strong>
                </td>
                <td>
                  <span class="platform-method">{{ row.method }}</span>
                  <code class="platform-route-code">{{ row.route }}</code>
                </td>
                <td>
                  <span class="platform-badge" :class="statusClass(row.statusCode)">{{
                    row.statusCode
                  }}</span>
                  <small v-if="row.errorCode" class="platform-cell-meta platform-error-text">{{
                    row.errorCode
                  }}</small>
                </td>
                <td>{{ row.durationMs }} ms</td>
                <td>
                  <small>{{ displayPlatformValue(row.createdAt) }}</small>
                </td>
                <td>
                  <button type="button" class="platform-secondary-button" @click="details = row">
                    Details
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Platform changes list -->
        <div v-else class="platform-tenant-list">
          <article
            v-for="row in rows"
            :key="row.id"
            class="platform-detail-panel platform-audit-entry">
            <div class="platform-audit-entry-heading">
              <div>
                <strong class="platform-audit-action">{{
                  displayPlatformValue(row.action)
                }}</strong>
                <small class="platform-cell-meta"
                  >{{ row.actor || 'System' }} · {{ row.tenant || 'Platform' }}</small
                >
              </div>
              <small class="platform-muted platform-nowrap">{{
                displayPlatformValue(row.createdAt)
              }}</small>
            </div>
            <details>
              <summary class="platform-details-summary">View changes and reason</summary>
              <pre class="platform-audit-json">{{ row.metadataJson }}</pre>
            </details>
          </article>
        </div>
      </PlatformState>

      <!-- Pagination -->
      <div class="platform-modal-actions platform-pagination">
        <span class="platform-muted platform-small-text">
          <template v-if="tab === 'activity'">{{ total.toLocaleString() }} requests total</template>
          <template v-else>Page {{ page }}</template>
        </span>
        <div class="platform-pagination-controls">
          <button
            type="button"
            class="platform-secondary-button"
            :disabled="loading || page === 1"
            @click="step(-1)">
            ← Previous
          </button>
          <span class="platform-page-number">Page {{ page }}</span>
          <button
            type="button"
            class="platform-secondary-button"
            :disabled="
              loading || (tab === 'activity' ? page * 50 >= total : (rows?.length || 0) < 50)
            "
            @click="step(1)">
            Next →
          </button>
        </div>
      </div>

      <!-- Detail drawer -->
      <Transition name="slide-up">
        <section
          v-if="details"
          class="platform-detail-panel platform-editor platform-request-details">
          <div class="platform-request-details-heading">
            <h2>Request details</h2>
            <button type="button" class="platform-secondary-button" @click="details = null">
              Close
            </button>
          </div>
          <dl class="platform-detail-panel platform-detail-list-flat">
            <div
              v-for="key in [
                'tenantName',
                'method',
                'route',
                'statusCode',
                'durationMs',
                'correlationId',
                'errorCode',
                'errorSummary',
                'createdAt',
              ]"
              :key="key">
              <dt>{{ displayPlatformValue(key) }}</dt>
              <dd>{{ displayPlatformValue(details[key]) }}</dd>
            </div>
          </dl>
          <p class="platform-muted platform-detail-note">
            Use the correlation ID to match this request with server diagnostics. Request bodies and
            clinical data are excluded.
          </p>
        </section>
      </Transition>
    </section>
  </PlatformShell>
</template>
