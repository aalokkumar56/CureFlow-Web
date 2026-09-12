<script setup lang="ts">
definePageMeta({
  layout: 'tenant',
  middleware: ['tenant-auth', 'tenant-approval'],
})
</script>

<template>
  <section class="dashboard">
    <div class="dashboard-header">
      <h2>Patients</h2>
      <p>The patient workspace is still being migrated from the legacy frontend.</p>
    </div>
    <div class="dashboard-state">Patient management is not available in this Nuxt migration yet.</div>
  </section>
</template>
