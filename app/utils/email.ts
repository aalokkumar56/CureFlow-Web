export type EmailThread = { patient_id: string; patient_name?: string; to_email?: string; last_preview?: string; updated_at?: string; unread_count?: number }
export type EmailMessage = { id: string | number; subject?: string; body?: string; status?: string; created_at?: string; from_email?: string; to_email?: string }
export type EmailThreadDetail = { patient_id: string; patient_name?: string; to_email?: string; messages?: EmailMessage[] }
export type EmailStatus = { enabled?: boolean; is_configured?: boolean; message?: string; [key: string]: unknown }
export const emailIsActive = (status: EmailStatus | null) => Boolean(status?.enabled && status?.is_configured)
