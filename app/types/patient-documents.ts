export type PatientDocument = {
  id: string
  patient_id: string
  title: string
  original_file_name: string
  uploaded_by_name: string | null
  created_at: string
  status: string
}
export type DocumentUploadResult = { id: string; status: string }
