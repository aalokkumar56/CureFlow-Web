export type StaffRole = 'doctor' | 'nurse' | 'staff' | 'reception' | string
export type StaffMember = { id: string | number; user_id?: string | number; name: string; role: StaffRole; department?: string | null; specialization?: string | null; qualification?: string | null; consultation_fee?: number | null; employment_type?: string | null; shift?: string | null; ward_assignment?: string | null; is_available?: boolean; phone?: string | null; email?: string | null }
export type StaffUser = { id: string | number; name?: string; email?: string; role?: StaffRole }
export type StaffSchedule = { id: string | number; day_of_week?: number; specific_date?: string | null; start_time?: string; end_time?: string; notes?: string | null; is_available?: boolean }
export const staffRoles: Record<string, string> = { doctor: 'Doctor', nurse: 'Nurse', staff: 'Staff', reception: 'Reception' }
export const employmentTypes: Record<string, string> = { permanent: 'Permanent', visiting: 'Visiting' }
export const staffTabs = [{ id: 'all', label: 'All staff' }, { id: 'doctors', label: 'Doctors' }, { id: 'nurses', label: 'Nurses' }] as const
export const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const list = (value: unknown) => Array.isArray(value) ? value : value && typeof value === 'object' && Array.isArray((value as { items?: unknown[] }).items) ? (value as { items: unknown[] }).items : []
export const normalizeStaff = (value: unknown): StaffMember[] => list(value).filter(Boolean).map(item => ({ ...(item as StaffMember), id: String((item as StaffMember).id), name: String((item as StaffMember).name || 'Unnamed staff member') })).filter(item => Boolean(item.id))
export const normalizeUsers = (value: unknown): StaffUser[] => list(value).filter(Boolean).map(item => ({ ...(item as StaffUser), id: String((item as StaffUser).id) })).filter(item => Boolean(item.id))
export const normalizeSchedules = (value: unknown): StaffSchedule[] => list(value).map(item => ({ ...(item as StaffSchedule), id: String((item as StaffSchedule).id) }))
export const staffDepartments = (value: unknown) => list(value).map(item => typeof item === 'string' ? item : String((item as { name?: unknown }).name || '')).filter(Boolean)
export const formatStaffMoney = (value: unknown) => value == null || value === '' ? '—' : `₹${Number(value).toLocaleString('en-IN')}`
export const formatScheduleDay = (schedule: StaffSchedule) => schedule.specific_date ? new Intl.DateTimeFormat('en-IN').format(new Date(schedule.specific_date)) : weekDays[schedule.day_of_week ?? 0] || '—'
