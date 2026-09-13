<script setup lang="ts">
import { settingsSections, type SettingsSection } from '~/utils/settings'
import { hasPermission, PERMISSIONS } from '~/utils/permissions'
const props = defineProps<{ section: SettingsSection }>()
const emit = defineEmits<{ select: [section: SettingsSection] }>()
const auth = useTenantAuth()
const visibleSections = computed(() => settingsSections.filter(item => !['users', 'roles', 'permissions'].includes(item.id) || hasPermission(auth.user.value, PERMISSIONS.UserView)))
</script>
<template>
<nav class="settings-navigation" aria-label="Settings sections"><button v-for="item in visibleSections" :key="item.id" type="button" :class="{ active: props.section === item.id }" @click="emit('select', item.id)"><strong>{{ item.label }}</strong><small>{{ item.description }}</small></button></nav>
</template>
