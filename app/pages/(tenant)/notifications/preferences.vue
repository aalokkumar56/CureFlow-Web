<script setup lang="ts">
definePageMeta({ layout: 'tenant', middleware: ['tenant-auth', 'tenant-approval'] })
useHead({ title: 'Notification preferences | CureFlow' })
</script>
<template><section class="settings-page"><TenantSettingsNotificationPreferences /></section></template>
