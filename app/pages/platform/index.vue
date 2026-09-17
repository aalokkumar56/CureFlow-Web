<script setup lang="ts">
definePageMeta({ middleware: 'platform-auth' })
await navigateTo('/platform/tenants', { replace: true })
</script>
