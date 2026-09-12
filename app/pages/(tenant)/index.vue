<script setup lang="ts">
definePageMeta({
  layout: 'tenant',
  middleware: ['tenant-auth'],
})

const auth = useTenantAuth()
</script>

<template>
  <section class="dashboard">
    <div class="dashboard-header">
      <div>
        <h1>Dashboard</h1>

        <p>
          Welcome back{{ auth.user.value?.name
            ? `, ${auth.user.value.name}`
            : '' }}.
        </p>
      </div>
    </div>

    <div class="dashboard-cards">
      <article class="dashboard-card">
        <h2>Patients</h2>
        <strong>—</strong>
      </article>

      <article class="dashboard-card">
        <h2>Appointments</h2>
        <strong>—</strong>
      </article>

      <article class="dashboard-card">
        <h2>Doctors</h2>
        <strong>—</strong>
      </article>

      <article class="dashboard-card">
        <h2>Pending Tasks</h2>
        <strong>—</strong>
      </article>
    </div>

    <div class="dashboard-grid">
      <section class="dashboard-panel">
        <h2>Upcoming Appointments</h2>
        <p>No appointment data loaded yet.</p>
      </section>

      <section class="dashboard-panel">
        <h2>Recent Activity</h2>
        <p>No recent activity.</p>
      </section>
    </div>
  </section>
</template>