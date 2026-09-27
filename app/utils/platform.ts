export type PlatformValue = string | number | boolean | null | string[]
export type PlatformRow = Record<string, unknown> & { id?: string }
export type PlatformField = {
  key: string
  label: string
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'number'
    | 'checkbox'
    | 'select'
    | 'datetime-local'
    | 'permissions'
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  options?: { value: string; label: string }[]
  help?: string
}
export type PlatformUser = {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
}
export const platformNavigation = [
  { label: 'Overview', route: '/platform', permission: 'overview.read' },
  { label: 'Tenants', route: '/platform/tenants', permission: 'tenants.read' },
  { label: 'Modules', route: '/platform/modules', permission: 'modules.read' },
  { label: 'Plans', route: '/platform/plans', permission: 'modules.read' },
  { label: 'Operators', route: '/platform/operators', permission: 'operators.read' },
  { label: 'Permission groups', route: '/platform/roles', permission: 'roles.read' },
  { label: 'Audit', route: '/platform/audit-logs', permission: 'audit.read' },
  { label: 'Support', route: '/platform/support-sessions', permission: 'support.read' },
  { label: 'Operations', route: '/platform/operations', permission: 'operations.read' },
]
export const displayPlatformValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  const text = String(value)
  if (/^\d{4}-\d\d-\d\dT/.test(text)) return new Date(text).toLocaleString()
  return text.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
}
export const enumOptions = (values: string[]) =>
  values.map((value) => ({ value, label: displayPlatformValue(value) }))
