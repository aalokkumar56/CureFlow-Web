export type FollowUpStatus = 'pending' | 'in_progress' | 'done' | 'cancelled' | string
export type FollowUpPriority = 'low' | 'medium' | 'high' | 'emergency' | string

export type FollowUp = {
  id: string | number
  title: string
  type?: string
  priority?: FollowUpPriority
  status?: FollowUpStatus
  due_at?: string | null
  notes?: string | null
  patient_id?: string | number | null
  patient_name?: string | null
  created_at?: string
}

export type FollowUpDraft = {
  title: string
  type: string
  priority: string
  due_at: string
  notes: string
}

export const followUpColumns = [
  { id: 'due_today', label: 'Due today', tone: 'blue', empty: 'No follow-ups due today' },
  { id: 'this_week', label: 'This week', tone: 'amber', empty: 'No follow-ups scheduled this week' },
  { id: 'overdue', label: 'Overdue', tone: 'red', empty: 'No overdue follow-ups' },
  { id: 'completed', label: 'Completed', tone: 'green', empty: 'Drop here to mark completed' },
] as const

export const followUpTypes = ['follow_up', 'callback', 'appointment_reminder', 'post_visit_checkin', 're_engagement', 'custom']
export const followUpPriorities = ['low', 'medium', 'high', 'emergency']

export const normalizeFollowUpStatus = (status: unknown): FollowUpStatus => {
  const value = String(status || 'pending').toLowerCase()
  if (value === 'completed') return 'done'
  if (value === 'inprogress') return 'in_progress'
  if (value === 'canceled') return 'cancelled'
  return value
}

export const normalizeFollowUps = (value: unknown): FollowUp[] => {
  const items = Array.isArray(value) ? value : value && typeof value === 'object' && Array.isArray((value as { items?: unknown[] }).items) ? (value as { items: unknown[] }).items : []
  return items.filter(item => item && typeof item === 'object').map(item => {
    const task = item as Record<string, unknown>
    return {
      ...task,
      id: String(task.id || ''),
      title: String(task.title || 'Untitled follow-up'),
      status: normalizeFollowUpStatus(task.status),
    } as FollowUp
  }).filter(item => Boolean(item.id))
}

export const isFollowUpDone = (status: unknown) => normalizeFollowUpStatus(status) === 'done'

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

export const followUpColumn = (task: FollowUp, now = new Date()) => {
  if (isFollowUpDone(task.status)) return 'completed'
  if (!task.due_at) return 'this_week'
  const due = new Date(task.due_at)
  if (Number.isNaN(due.getTime())) return 'this_week'
  const dueDay = startOfDay(due)
  const today = startOfDay(now)
  if (dueDay < today) return 'overdue'
  if (dueDay === today) return 'due_today'
  const weekEnd = today + (6 - now.getDay()) * 86400000
  return dueDay <= weekEnd ? 'this_week' : 'this_week'
}

export const formatFollowUpDate = (value: string | null | undefined) => {
  if (!value) return 'No due date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No due date'
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

export const displayFollowUpType = (value: unknown) => String(value || 'follow-up').replace(/_/g, ' ')
