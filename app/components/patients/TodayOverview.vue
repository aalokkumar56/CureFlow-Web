<script setup lang="ts">
import { clinicalSections, type ClinicalRecord } from '~/utils/patient-clinical'
import { patientList } from '~/utils/patients'
import { hospitalDay, hospitalTime } from '~/utils/tenant-time'
import { normalizeApiError } from '~/utils/api/errors'
import { usePrescriptionPrint } from '~/composables/patients/usePrescriptionPrint'
const props = defineProps<{ patientId: string; timezone: string }>()
const emit = defineEmits<{ navigate: [tab: string] }>()
const { $api } = useNuxtApp()
const { printing, printError, printPrescription } = usePrescriptionPrint()
const loading = ref(false)
const sections = ref<
  Array<{
    key: string
    title: string
    endpoint: string
    date: string
    items: ClinicalRecord[]
    error: string
  }>
>([
  {
    key: 'vitals',
    title: 'Today’s vitals',
    endpoint: '/clinical/vitals',
    date: 'measured_at',
    items: [],
    error: '',
  },
  {
    key: 'notes',
    title: 'Today’s clinical notes',
    endpoint: '/clinical/notes',
    date: 'created_at',
    items: [],
    error: '',
  },
  {
    key: 'prescriptions',
    title: 'Today’s prescriptions',
    endpoint: '/prescriptions',
    date: 'prescribed_at',
    items: [],
    error: '',
  },
])
async function load() {
  if (loading.value) return
  loading.value = true
  const today = hospitalDay(new Date().toISOString(), props.timezone)
  await Promise.all(
    sections.value.map(async (section) => {
      section.error = ''
      try {
        section.items = patientList<ClinicalRecord>(
          await $api.get(`${section.endpoint}/patient/${props.patientId}`),
        )
          .filter(
            (item) => hospitalDay(item[section.date], props.timezone) === today,
          )
          .sort(
            (a, b) =>
              Date.parse(String(b[section.date])) -
              Date.parse(String(a[section.date])),
          )
      } catch (cause) {
        section.error = normalizeApiError(cause, 'Records could not be loaded.')
      }
    }),
  )
  loading.value = false
}
onMounted(load)
</script>
<template>
  <section class="patient-clinical-panel">
    <header class="patient-section-header">
      <h2>Today’s clinical summary</h2>
      <button class="patients-secondary-btn" :disabled="loading" @click="load">
        Refresh
      </button>
    </header>
    <p v-if="loading" role="status">Loading today’s records…</p>
    <p v-if="printError" class="appointments-error" role="alert">
      {{ printError }}
    </p>
    <div class="patient-overview-grid">
      <section v-for="section in sections" :key="section.key">
        <header class="patient-section-header">
          <h3>{{ section.title }}</h3>
          <button
            class="patients-secondary-btn"
            @click="emit('navigate', section.key)"
          >
            View all
          </button>
        </header>
        <p v-if="section.error" class="appointments-error" role="alert">
          {{ section.error }}
        </p>
        <p v-else-if="!loading && !section.items.length">
          Nothing recorded today.
        </p>
        <article
          v-for="item in section.items"
          :key="item.id"
          class="patient-record-card"
        >
          <small
            >{{ hospitalTime(item[section.date], timezone) }} ·
            {{
              item.author_name || item.doctor_name || item.measured_by_name
            }}</small
          ><template v-if="section.key === 'prescriptions'"
            ><h4>{{ item.diagnosis || 'Prescription' }}</h4>
            <p>{{ item.chief_complaint }}</p>
            <p
              v-for="(medicine, i) in (item.items as ClinicalRecord[]) || []"
              :key="i"
            >
              {{ medicine.drug_name }} {{ medicine.strength }} ·
              {{ medicine.dosage }} · {{ medicine.frequency }}
            </p>
            <button
              v-if="item.id"
              class="patients-secondary-btn"
              :disabled="printing"
              @click="printPrescription(item.id)"
            >
              Print prescription
            </button></template
          >
          <dl v-else class="patient-record-values">
            <template
              v-for="field in clinicalSections[section.key]?.fields"
              :key="field.key"
              ><div v-if="item[field.key] != null && item[field.key] !== ''">
                <dt>{{ field.label }}</dt>
                <dd class="patient-preserve-text">{{ item[field.key] }}</dd>
              </div></template
            >
          </dl>
        </article>
      </section>
    </div>
  </section>
</template>
