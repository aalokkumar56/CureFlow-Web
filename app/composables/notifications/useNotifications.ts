export type NotificationItem = { id: string | number; title: string; body?: string; created_at?: string; is_read: boolean; action_url?: string }

export const useNotifications = () => {
  const auth = useTenantAuth()
  const unreadCount = useState('notifications-unread-count', () => 0)
  const items = useState<NotificationItem[]>('notifications-items', () => [])
  const loading = useState('notifications-loading', () => false)

  const refreshCount = async () => {
    if (!auth.isAuthenticated.value) return
    try { const { $api } = useNuxtApp(); const data = await $api.get<{ count?: number }>('/notifications/unread-count'); unreadCount.value = Number(data?.count || 0) } catch { /* badge polling remains silent */ }
  }
  const refreshList = async () => {
    if (!auth.isAuthenticated.value) return
    loading.value = true
    try { const { $api } = useNuxtApp(); const data = await $api.get<NotificationItem[]>('/notifications', { limit: 50 }); items.value = Array.isArray(data) ? data : [] } finally { loading.value = false }
  }
  const markRead = async (id: NotificationItem['id']) => {
    const item = items.value.find(notification => notification.id === id)
    if (!item || item.is_read) return
    const { $api } = useNuxtApp(); await $api.patch(`/notifications/${id}/read`); item.is_read = true; unreadCount.value = Math.max(0, unreadCount.value - 1)
  }
  const markAllRead = async () => {
    const { $api } = useNuxtApp(); await $api.post('/notifications/mark-all-read'); items.value.forEach(item => { item.is_read = true }); unreadCount.value = 0
  }

  onMounted(() => {
    void refreshCount()
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') void refreshCount() }
    const interval = window.setInterval(refreshWhenVisible, 30_000)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    onBeforeUnmount(() => { window.clearInterval(interval); document.removeEventListener('visibilitychange', refreshWhenVisible) })
  })
  return { unreadCount, items, loading, refreshCount, refreshList, markRead, markAllRead }
}
