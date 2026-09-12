<script setup lang="ts">
import TenantNavigation from '~/components/tenant/navigation/TenantNavigation.vue'

const collapsed = ref(false)

const toggleCollapsed = () => {
  collapsed.value = !collapsed.value
}
</script>

<template>
  <aside>
    <div>
      <button
        type="button"
        @click="toggleCollapsed"
      >
        {{ collapsed ? 'Expand' : 'Collapse' }}
      </button>
    </div>

    <TenantNavigation />
  </aside>
</template>