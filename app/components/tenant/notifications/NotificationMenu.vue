<script setup lang="ts">
import { PhBell, PhCheck } from '@phosphor-icons/vue'
import { useNotifications, type NotificationItem } from '~/composables/notifications/useNotifications'

const open = ref(false)
const { unreadCount, items, loading, refreshList, markRead, markAllRead } = useNotifications()
const select = async (item: NotificationItem) => { await markRead(item.id); open.value = false; if (item.action_url) await navigateTo(item.action_url) }
const formatTime = (value?: string) => value ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round((new Date(value).getTime() - Date.now()) / 3_600_000), 'hour') : ''
</script>
<template>
  <div class="notification-menu">
    <button class="tenant-header-action notification-trigger" type="button" aria-label="Notifications" @click="open = !open; if (open) refreshList()"><PhBell :size="19" /><span v-if="unreadCount" class="notification-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span></button>
    <section v-if="open" class="notification-popover"><header><strong>Notifications</strong><button v-if="items.some(item => !item.is_read)" type="button" @click="markAllRead"><PhCheck :size="15" /> Mark all read</button></header><div class="notification-list"><p v-if="loading && !items.length" class="notification-empty">Loading…</p><p v-else-if="!items.length" class="notification-empty">No notifications yet</p><button v-for="item in items" v-else :key="item.id" type="button" :class="{ unread: !item.is_read }" @click="select(item)"><i v-if="!item.is_read" /><span><strong>{{ item.title }}</strong><small v-if="item.body">{{ item.body }}</small><time>{{ formatTime(item.created_at) }}</time></span></button></div></section>
  </div>
</template>
