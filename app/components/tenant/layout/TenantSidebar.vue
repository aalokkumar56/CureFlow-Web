<script setup lang="ts">
import TenantNavigation from '~/components/tenant/navigation/TenantNavigation.vue'

const collapsed = ref(false)

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <aside
    class="tenant-sidebar"
    :class="{ 'is-collapsed': collapsed }"
  >
    <!-- Brand -->
    <div class="tenant-sidebar-header">
      <NuxtLink
        to="/"
        class="tenant-brand"
        aria-label="CureFlow Dashboard"
      >
        <span class="tenant-brand-mark">
          C
        </span>

        <span
          v-if="!collapsed"
          class="tenant-brand-name"
        >
          CureFlow
        </span>
      </NuxtLink>

      <button
        type="button"
        class="tenant-sidebar-toggle"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleCollapsed"
      >
        {{ collapsed ? '→' : '←' }}
      </button>
    </div>

    <!-- Navigation -->
    <div class="tenant-sidebar-navigation">
      <TenantNavigation />
    </div>

    <!-- Bottom section -->
    <div class="tenant-sidebar-footer">
      <NuxtLink
        to="/settings"
        class="tenant-sidebar-footer-link"
      >
        <span class="tenant-sidebar-footer-icon">
          ⚙
        </span>

        <span v-if="!collapsed">
          Settings
        </span>
      </NuxtLink>
    </div>
  </aside>
</template>