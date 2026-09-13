export type SettingsSection = 'hospital' | 'integrations' | 'notifications' | 'templates' | 'users' | 'roles' | 'permissions'
export type HospitalProfile = { name?: string; phone?: string; email?: string; address?: string; timezone?: string; departments?: unknown[]; [key: string]: unknown }
export type MessageTemplate = { id: string | number; name: string; body?: string; category?: string; enabled?: boolean }
export const settingsSections: Array<{ id: SettingsSection; label: string; description: string }> = [
  { id: 'users', label: 'Users', description: 'Manage team members' },
  { id: 'roles', label: 'Roles', description: 'Assign permissions to roles' },
  { id: 'permissions', label: 'Permissions', description: 'Review available access controls' },
  { id: 'hospital', label: 'Hospital', description: 'Profile, timezone, and departments' },
  { id: 'integrations', label: 'Integrations', description: 'WhatsApp, SMS, and email connections' },
  { id: 'notifications', label: 'Notifications', description: 'In-app notification preferences' },
  { id: 'templates', label: 'Templates', description: 'Reusable message templates' },
]
export const normalizeSettingsList = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : value && typeof value === 'object' && Array.isArray((value as { items?: unknown[] }).items) ? (value as { items: unknown[] }).items as T[] : []
export const normalizeDepartments = (value: unknown) => normalizeSettingsList<unknown>(value).map(item => typeof item === 'string' ? item : String((item as { name?: unknown }).name || '')).filter(Boolean)
export const shouldSendSecret = (value: unknown) => Boolean(value && !String(value).includes('...') && value !== '********')
