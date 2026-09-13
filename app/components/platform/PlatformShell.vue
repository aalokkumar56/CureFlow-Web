<script setup lang="ts">
import { PhBuildings, PhSignOut } from '@phosphor-icons/vue'
const route = useRoute(); const auth = usePlatformAuth()
const signOut = () => { auth.logout(); navigateTo('/platform/login') }
</script>
<template><div class="platform-shell"><header class="platform-header"><NuxtLink to="/platform/tenants" class="platform-brand"><span class="platform-brand-mark">C</span><span><strong>CureFlow</strong><small>Platform Console</small></span></NuxtLink><nav class="platform-nav"><NuxtLink to="/platform/tenants" :class="{ active: route.path.startsWith('/platform/tenants') }"><PhBuildings :size="17" /> Tenants</NuxtLink></nav><button type="button" class="platform-signout" @click="signOut"><PhSignOut :size="17" /> Sign out</button></header><main class="platform-main"><slot /></main></div></template>
