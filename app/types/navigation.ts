import type { Permission } from '~/utils/permissions'

export type NavigationItem = {
  id: string
  label: string
  to: string
  permission?: Permission
  module?: string
  children?: NavigationItem[]
}
