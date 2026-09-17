<script setup lang="ts">
import { patientStatuses, patientLabel } from '~/utils/patients'
defineProps<{ status?: string }>()
</script>
<template>
  <span class="patient-status" :class="status?.replace(/_/g, '-')">{{
    patientStatuses[status || ''] || patientLabel(status)
  }}</span>
</template>
