<script setup lang="ts">
import type { PlatformField, PlatformRow, PlatformValue } from '~/utils/platform'
import { displayPlatformValue } from '~/utils/platform'
import { usePlatformResource } from '~/composables/platform/usePlatformResource'
import { usePlatformAccess } from '~/composables/platform/usePlatformAccess'
const props = defineProps<{
  title: string
  description: string
  endpoint: string
  permission: string
  fields: PlatformField[]
  columns: { key: string; label: string }[]
  defaults?: Record<string, unknown>
  create?: boolean
  idKey?: string
  noEdit?: boolean
  editLabel?: string
}>()
const access = usePlatformAccess()
const resource = usePlatformResource<PlatformRow[]>(() => props.endpoint)
const { data, loading, saving, error, load, save } = resource
const editing = ref<Record<string, unknown> | null>(null)
const createMode = ref(false)
const search = ref('')
const rows = computed(() =>
  (data.value || []).filter((row) =>
    Object.values(row).some((value) =>
      String(value).toLowerCase().includes(search.value.toLowerCase()),
    ),
  ),
)
const formFields = computed(() => [
  ...props.fields.map((field) =>
    field.type === 'password' ? { ...field, required: createMode.value } : field,
  ),
  { key: 'reason', label: 'Reason for change', required: true, min: 3, max: 500 },
])
const begin = (row?: PlatformRow) => {
  error.value = null
  createMode.value = !row
  editing.value = { ...props.defaults, ...row, password: null, reason: '' }
}
const submit = async (value: Record<string, PlatformValue>) => {
  const id = editing.value?.[props.idKey || 'id']
  if (
    await save(
      createMode.value ? props.endpoint : props.endpoint + '/' + id,
      value,
      createMode.value,
    )
  )
    editing.value = null
}
onMounted(load)
watch(
  () => props.endpoint,
  () => {
    editing.value = null
    load()
  },
)
</script>
<template>
  <section class="platform-tenants-page">
    <div class="platform-page-heading">
      <div>
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <button
        v-if="create && access.can(permission)"
        type="button"
        class="platform-primary-button"
        @click="begin()">
        Add {{ title.toLowerCase().replace(/s$/, '') }}
      </button>
    </div>
    <PlatformForm
      v-if="editing"
      :fields="formFields"
      :initial="editing"
      :busy="saving"
      :error="error"
      :title="createMode ? 'Add ' + title.toLowerCase().replace(/s$/, '') : 'Update information'"
      @save="submit"
      @cancel="editing = null" />
    <label class="platform-search"
      >Search<input v-model="search" type="search" :aria-label="'Search ' + title"
    /></label>
    <PlatformState
      :loading="loading"
      :error="editing ? undefined : error"
      :empty="!rows.length"
      @retry="load">
      <div class="platform-table-scroll">
        <table class="platform-table">
          <thead>
            <tr>
              <th v-for="column in columns" :key="column.key">{{ column.label }}</th>
              <th v-if="!noEdit && access.can(permission)">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="String(row[idKey || 'id'])">
              <td v-for="column in columns" :key="column.key">
                {{ displayPlatformValue(row[column.key]) }}
              </td>
              <td v-if="!noEdit && access.can(permission)">
                <button
                  type="button"
                  class="platform-secondary-button"
                  :disabled="saving || row.key === 'owner'"
                  @click="begin(row)">
                  {{ editLabel || 'Edit' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </PlatformState>
  </section>
</template>
