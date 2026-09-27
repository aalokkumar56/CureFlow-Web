<script setup lang="ts">
definePageMeta({ layout: 'platform', middleware: 'platform-auth' })
const route = useRoute()
await navigateTo('/platform/tenants/' + route.params.id + '/modules', { replace: true })
</script>
<template><div></div></template>
