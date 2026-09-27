<script setup lang="ts">
import type { PlatformField, PlatformValue } from '~/utils/platform'
const props = defineProps<{
  fields: PlatformField[]
  initial?: Record<string, unknown>
  busy?: boolean
  error?: unknown
  title: string
}>()
const emit = defineEmits<{ save: [value: Record<string, PlatformValue>]; cancel: [] }>()
const values = reactive<Record<string, PlatformValue>>({})
watch(
  () => [props.initial, props.fields],
  () => {
    for (const key of Object.keys(values)) delete values[key]
    for (const field of props.fields) {
      const value = props.initial?.[field.key]
      values[field.key] = (value ??
        (field.type === 'checkbox'
          ? false
          : field.type === 'permissions'
            ? []
            : '')) as PlatformValue
      if (field.type === 'datetime-local' && value) {
        const date = new Date(String(value))
        values[field.key] = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      }
    }
  },
  { immediate: true },
)
const submit = () => {
  if (props.busy) return
  const payload = { ...values }
  for (const field of props.fields) {
    if (field.type === 'number')
      payload[field.key] = values[field.key] === '' ? null : Number(values[field.key])
    if (field.type === 'datetime-local')
      payload[field.key] = values[field.key]
        ? new Date(String(values[field.key])).toISOString()
        : null
    if (field.type === 'password' && !values[field.key]) payload[field.key] = null
  }
  emit('save', payload)
}
</script>
<template>
  <section class="platform-detail-panel platform-editor">
    <h2>{{ title }}</h2>
    <ValidatedForm :error="error" @submit.prevent="submit">
      <fieldset :disabled="busy" class="platform-form-fields">
        <div class="platform-form-grid">
          <label
            v-for="field in fields"
            :key="field.key"
            :class="{
              'platform-checkbox': field.type === 'checkbox',
              'platform-span': field.type === 'permissions',
            }">
            <span>{{ field.label }}</span>
            <input
              v-if="field.type === 'checkbox'"
              v-model="values[field.key]"
              :name="field.key"
              type="checkbox" />
            <select
              v-else-if="field.type === 'select' || field.type === 'permissions'"
              v-model="values[field.key]"
              :name="field.key"
              :required="field.required"
              :multiple="field.type === 'permissions'">
              <option v-if="field.type === 'select'" disabled value="">Select…</option>
              <option v-for="option in field.options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <input
              v-else
              v-model="values[field.key]"
              :name="field.key"
              :type="field.type || 'text'"
              :required="field.required"
              :min="field.type === 'number' ? field.min : undefined"
              :max="field.type === 'number' ? field.max : undefined"
              :minlength="field.type !== 'number' ? field.min : undefined"
              :maxlength="field.type !== 'number' ? field.max : undefined"
              :pattern="field.pattern"
              :autocomplete="field.type === 'password' ? 'new-password' : 'off'" />
            <small v-if="field.help">{{ field.help }}</small>
          </label>
        </div>
        <div class="platform-modal-actions">
          <button type="button" class="platform-secondary-button" @click="emit('cancel')">
            Cancel</button
          ><button type="submit" class="platform-primary-button">
            {{ busy ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </fieldset>
    </ValidatedForm>
  </section>
</template>
