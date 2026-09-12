import { computed } from 'vue'
import { tenantNavigation } from '~/config/tenant-navigation'
import { useTenantAuth } from '~/composables/auth/useTenantAuth'
import { hasPermission } from '~/utils/permissions'

export const useTenantNavigation = () => {
  const auth = useTenantAuth()

  const canAccess = (permission?: string) => {
    if (!permission) {
      return true
    }

    return hasPermission(
      auth.user.value,
      permission as Parameters<typeof hasPermission>[1],
    )
  }

  const filterItems = (
    items: typeof tenantNavigation,
  ): typeof tenantNavigation => {
    return items
      .filter(item => canAccess(item.permission))
      .map(item => ({
        ...item,
        children: item.children
          ? filterItems(item.children)
          : undefined,
      }))
      .filter(item => !item.children || item.children.length > 0)
  }

  const items = computed(() => filterItems(tenantNavigation))

  return {
    items,
  }
}