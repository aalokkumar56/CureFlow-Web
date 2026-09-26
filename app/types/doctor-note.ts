export type NoteLanguage = 'en-IN' | 'hi-IN' | 'gu-IN' | 'mr-IN'
export type NoteStatus = 'draft' | 'final_editable' | 'final_locked'
export interface DoctorNote {
  id: string
  patient_id: string
  visit_id: string | null
  appointment_id: string | null
  author_user_id: string
  author_name: string
  note_type: string
  subjective: string
  objective: string
  assessment: string
  plan: string
  original_language: NoteLanguage | 'und'
  status: NoteStatus
  created_at: string
  updated_at: string
  finalized_at: string | null
  editable_until: string | null
  last_auto_saved_at: string | null
  revision: number
  can_edit: boolean
  server_time: string
}
export const noteLanguages: { value: NoteLanguage; label: string }[] = [
  { value: 'en-IN', label: 'English' },
  { value: 'hi-IN', label: 'Hindi · हिन्दी' },
  { value: 'gu-IN', label: 'Gujarati · ગુજરાતી' },
  { value: 'mr-IN', label: 'Marathi · मराठी' },
]
export const noteText = (note: Pick<DoctorNote, 'subjective' | 'objective' | 'assessment' | 'plan'>) =>
  [note.subjective, note.objective, note.assessment, note.plan].filter(Boolean).join('\n\n')
