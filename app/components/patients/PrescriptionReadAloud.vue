<script setup lang="ts">
import type { ClinicalRecord } from '~/utils/patient-clinical'
import { noteLanguages, type NoteLanguage } from '~/types/doctor-note'
import { useClinicalReadAloud } from '~/composables/patients/useClinicalSpeech'
const props = defineProps<{ prescription: ClinicalRecord }>()
const language = ref<NoteLanguage>('en-IN')
const { speaking, readError, listen, stop } = useClinicalReadAloud()
const text = computed(() => {
  const record = props.prescription
  const fields = ['diagnosis', 'chief_complaint', 'clinical_notes', 'follow_up_advice', 'next_visit_date']
  const parts = fields.filter(key => record[key]).map(key => `${key.replaceAll('_', ' ')}: ${record[key]}`)
  for (const item of (record.items as ClinicalRecord[] || [])) {
    parts.push(['drug_name', 'strength', 'dosage', 'frequency', 'duration', 'route', 'timing', 'quantity', 'patient_instructions', 'possible_side_effects']
      .filter(key => item[key] != null && item[key] !== '').map(key => `${key.replaceAll('_', ' ')}: ${item[key]}`).join('. '))
  }
  for (const item of (record.injections as ClinicalRecord[] || [])) {
    parts.push(['name', 'strength', 'route', 'site', 'administered_at', 'notes']
      .filter(key => item[key]).map(key => `${key.replaceAll('_', ' ')}: ${item[key]}`).join('. '))
  }
  return parts.join('.\n')
})
</script>
<template>
  <div class="prescription-reading">
    <label>Prescription voice
      <select v-model="language" @change="stop">
        <option v-for="item in noteLanguages" :key="item.value" :value="item.value">{{ item.label }}</option>
      </select>
    </label>
    <button v-if="speaking" class="patients-secondary-btn" @click="stop">Stop listening</button>
    <button v-else class="patients-secondary-btn" :disabled="!text" @click="listen(text, language)">Listen to prescription</button>
    <small>Reads the original prescription. Select its written language; this does not translate or change it.</small>
    <p v-if="readError" class="appointments-error" role="alert">{{ readError }}</p>
  </div>
</template>
<style scoped>
.prescription-reading { display: flex; align-items: center; flex-wrap: wrap; gap: .6rem; margin-block: 1rem; }
select { margin-left: .5rem; padding: .5rem; border-radius: 6px; }
small { flex-basis: 100%; }
</style>
