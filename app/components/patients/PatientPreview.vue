<script setup lang="ts">
import type { PatientRecord } from '~/composables/patients/usePatients'
import { patientDate, patientInitials, patientList } from '~/utils/patients'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
import { normalizeApiError } from '~/utils/api/errors'
const props = defineProps<{ patient: PatientRecord }>()
defineEmits<{ close: [] }>()
const auth = useTenantAuth()
const { $api } = useNuxtApp()
const detail = ref<PatientRecord>(props.patient)
const activity = ref<Array<Record<string, unknown>>>([])
const error = ref('')
const copyMessage = ref('')
const loading = ref(false)
const canEdit = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.PatientEdit),
)
const canMessages = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.ConversationView),
)
const canClinical = computed(() =>
  hasPermission(auth.user.value, PERMISSIONS.ClinicalView),
)
async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await $api.get(`/patients/${props.patient.id}`)
    if (canClinical.value)
      activity.value = patientList<Record<string, unknown>>(
        await $api.get(`/patients/${props.patient.id}/timeline`),
      ).slice(0, 3)
  } catch (cause) {
    error.value = normalizeApiError(
      cause,
      'Some preview details could not be loaded.',
    )
  } finally {
    loading.value = false
  }
}
async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    copyMessage.value = `${label} copied.`
  } catch {
    copyMessage.value = `Could not copy ${label.toLowerCase()}. Select the text to copy it manually.`
  }
}
onMounted(load)
</script>
<template>
  <aside
    class="patient-preview-panel"
    aria-label="Patient preview"
    :aria-busy="loading"
  >
    <div class="preview-header">
      <span class="patient-avatar large-avatar">{{
        patientInitials(detail.name)
      }}</span
      ><strong>{{ detail.name }}</strong
      ><button
        class="close-preview"
        aria-label="Close preview"
        @click="$emit('close')"
      >
        ×
      </button>
    </div>
    <PatientsPatientStatus :status="detail.status" />
    <p v-if="error" class="appointments-error" role="alert">
      {{ error }} <button @click="load">Retry</button>
    </p>
    <div class="patients-header-actions patient-preview-actions">
      <a
        v-if="detail.phone"
        :href="`tel:${detail.phone}`"
        class="patients-secondary-btn"
        >Call</a
      ><a
        v-if="detail.email"
        :href="`mailto:${detail.email}`"
        class="patients-secondary-btn"
        >Email</a
      ><NuxtLink
        v-if="canMessages"
        :to="`/patients/${detail.id}?tab=messages`"
        class="patients-secondary-btn"
        >WhatsApp</NuxtLink
      ><NuxtLink
        v-if="canEdit"
        :to="`/patients/${detail.id}?edit=1`"
        class="patients-secondary-btn"
        >Edit</NuxtLink
      >
    </div>
    <dl class="detail-list">
      <div>
        <dt>Phone</dt>
        <dd>
          {{ detail.phone || '—' }}
          <button
            v-if="detail.phone"
            aria-label="Copy phone number"
            @click="copy(detail.phone, 'Phone')"
          >
            Copy
          </button>
        </dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>
          {{ detail.email || '—' }}
          <button
            v-if="detail.email"
            aria-label="Copy email address"
            @click="copy(detail.email, 'Email')"
          >
            Copy
          </button>
        </dd>
      </div>
      <div>
        <dt>Department</dt>
        <dd>{{ detail.department || 'Not assigned' }}</dd>
      </div>
      <div>
        <dt>Registered</dt>
        <dd>{{ patientDate(detail.created_at) }}</dd>
      </div>
      <div>
        <dt>Last contact</dt>
        <dd>{{ patientDate(detail.last_contact_at) }}</dd>
      </div>
      <div>
        <dt>Follow-up</dt>
        <dd>{{ patientDate(detail.follow_up_date) }}</dd>
      </div>
    </dl>
    <p v-if="copyMessage" role="status">{{ copyMessage }}</p>
    <p v-if="detail.notes">{{ detail.notes }}</p>
    <p v-if="detail.tags?.length">Tags: {{ detail.tags.join(', ') }}</p>
    <template v-if="canClinical"
      ><h3>Recent activity</h3>
      <p v-if="!activity.length && !loading && !error">No activity recorded.</p>
      <article v-for="(entry, index) in activity" :key="index">
        <strong>{{ entry.title || entry.event_type || entry.type }}</strong>
        <p>{{ entry.summary || entry.description }}</p>
        <small>{{
          patientDate(entry.occurred_at || entry.created_at || entry.date)
        }}</small>
      </article></template
    >
    <NuxtLink :to="`/patients/${detail.id}`" class="patients-primary-btn"
      >Open patient profile →</NuxtLink
    >
  </aside>
</template>
