<script setup lang="ts">
import type { Field, RecordValue } from '~/utils/patient-clinical'
import { patientLabel } from '~/utils/patients'
defineProps<{ fields: Field[]; disabled?: boolean }>()
const model = defineModel<Record<string, RecordValue>>({ required: true })
</script>
<template>
  <fieldset class="patient-form-grid patient-fields" :disabled="disabled">
    <label
      v-for="field in fields"
      :key="field.key"
      :class="{
        'full-width': field.type === 'textarea',
        'patient-checkbox': field.type === 'checkbox',
      }"
      ><span>{{ field.label }}{{ field.required ? ' *' : '' }}</span
      ><select
        v-if="field.options"
        v-model="model[field.key]"
        :required="field.required"
      >
        <option value="">Not specified</option>
        <option v-for="option in field.options" :key="option" :value="option">
          {{ patientLabel(option) }}
        </option></select
      ><textarea
        v-else-if="field.type === 'textarea'"
        v-model="model[field.key] as string"
        rows="3"
        :required="field.required"
        maxlength="10000" /><input
        v-else-if="field.type === 'checkbox'"
        v-model="model[field.key]"
        type="checkbox" /><input
        v-else
        v-model="model[field.key]"
        :type="field.type || 'text'"
        :required="field.required"
        :min="field.min"
        :max="field.max"
        :step="field.type === 'number' ? 'any' : undefined"
    /></label>
  </fieldset>
</template>
