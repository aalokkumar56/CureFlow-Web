<script setup lang="ts">
definePageMeta({ middleware: ['tenant-auth', 'tenant-approval'] })
await navigateTo({ path: '/settings', query: { section: 'users' } }, { replace: true })
</script>
