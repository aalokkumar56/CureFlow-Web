const STORAGE_KEY = 'cureflow_sidebar_collapsed'

export const useTenantShell = () => {
  const collapsed = useState('tenant-sidebar-collapsed', () => false)
  const mobileOpen = useState('tenant-sidebar-mobile-open', () => false)

  const initialize = () => {
    if (!import.meta.client) return
    collapsed.value = localStorage.getItem(STORAGE_KEY) === 'true'
  }

  const toggleCollapsed = () => {
    collapsed.value = !collapsed.value
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, String(collapsed.value))
    }
  }

  return { collapsed, mobileOpen, initialize, toggleCollapsed }
}
