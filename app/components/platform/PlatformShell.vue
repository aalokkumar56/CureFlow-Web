<script setup lang="ts">
import { platformNavigation } from '~/utils/platform'
import { usePlatformAccess } from '~/composables/platform/usePlatformAccess'
const route = useRoute()
const auth = usePlatformAuth()
const access = usePlatformAccess()
const navigation = computed(() => platformNavigation.filter((item) => access.can(item.permission)))
const signOut = async () => {
  auth.logout()
  access.user.value = null
  await navigateTo('/platform/login')
}
const isActive = (item: { route: string }) =>
  route.path === item.route ||
  (item.route !== '/platform' && route.path.startsWith(item.route + '/')) ||
  (item.route !== '/platform' && route.path.startsWith(item.route))
const pagePermission = computed(
  () => platformNavigation.find((item) => route.path.startsWith(item.route))?.permission,
)
const allowed = computed(() => !pagePermission.value || access.can(pagePermission.value))
</script>
<template>
  <div class="platform-shell">
    <header class="platform-header">
      <NuxtLink to="/platform" class="platform-brand">
        <span class="platform-brand-mark">C</span>
        <span>
          <strong>CureFlow</strong>
          <small>Platform Console</small>
        </span>
      </NuxtLink>
      <nav class="platform-nav" aria-label="Platform">
        <NuxtLink
          v-for="item in navigation"
          :key="item.route"
          :to="item.route"
          :class="{ active: isActive(item) }">
          {{ item.label }}
        </NuxtLink>
      </nav>
      <button type="button" class="platform-signout" @click="signOut">Sign out</button>
    </header>
    <main class="platform-main">
      <slot v-if="allowed" />
      <section v-else class="platform-tenants-state" role="alert">
        Your permission group does not allow access to this page.
      </section>
    </main>
  </div>
</template>
