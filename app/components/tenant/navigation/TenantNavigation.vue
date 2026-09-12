<script setup lang="ts">
import { useTenantNavigation } from '~/composables/tenant/useTenantNavigation'

const { items } = useTenantNavigation()
</script>

<template>
  <nav aria-label="Tenant navigation">
    <ul>
      <li
        v-for="item in items"
        :key="item.id"
      >
        <NuxtLink :to="item.to">
          {{ item.label }}
        </NuxtLink>

        <ul v-if="item.children?.length">
          <li
            v-for="child in item.children"
            :key="child.id"
          >
            <NuxtLink :to="child.to">
              {{ child.label }}
            </NuxtLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>