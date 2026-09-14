<script setup lang="ts">
useHead({ title: 'Registration received | CureFlow' })
</script>
<template>
  <main class="lifecycle-page">
    <section class="patient-record-card">
      <h1>Registration received</h1>
      <p>
        Your hospital registration has been submitted for review. Sign in to
        check your approval status.
      </p>
      <NuxtLink class="patients-primary-btn" to="/login">Sign in</NuxtLink>
    </section>
  </main>
</template>
