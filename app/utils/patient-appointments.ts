import type { Appointment } from '../composables/appointments/useAppointments'
import { patientList } from './patients'

export async function collectAppointments(
  fetchPage: (page: number) => Promise<unknown>,
): Promise<Appointment[]> {
  const appointments: Appointment[] = []
  for (let page = 1; ; page++) {
    const response = await fetchPage(page)
    const rows = patientList<Appointment>(response)
    appointments.push(...rows)
    const total = Number(
      (response as { total?: number })?.total ?? appointments.length,
    )
    if (!rows.length || appointments.length >= total) break
  }
  return appointments
}

export function nextPatientAppointments(
  appointments: Appointment[],
  now = Date.now(),
) {
  const result: Record<string, Appointment> = {}
  for (const item of appointments) {
    const time = Date.parse(item.scheduled_at || '')
    if (
      !item.patient_id ||
      !Number.isFinite(time) ||
      time < now ||
      !['scheduled', 'confirmed'].includes(item.status)
    )
      continue
    const key = String(item.patient_id)
    if (!result[key] || time < Date.parse(result[key].scheduled_at || ''))
      result[key] = item
  }
  return result
}
