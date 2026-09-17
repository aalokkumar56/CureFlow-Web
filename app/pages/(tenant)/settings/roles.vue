<script setup lang="ts">
definePageMeta({ middleware: ['tenant-auth', 'tenant-approval'] })
await navigateTo({ path: '/settings', query: { section: 'roles' } }, { replace: true })
</script>
