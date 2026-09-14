export const patientImportTemplate = [
  [
    'Patient Name',
    'Mobile Number',
    'Email',
    'Age',
    'Gender',
    'Department',
    'Source',
    'Tags',
    'Notes',
  ],
  [
    'Sample Patient',
    '9876543210',
    '',
    '45',
    'Male',
    'General',
    'manual',
    '',
    'Replace this sample before importing',
  ],
]

export function validatePatientImport(file: {
  name: string
  size: number
}): string {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name))
    return 'Choose an Excel (.xlsx or .xls) or CSV file.'
  if (!file.size) return 'The selected file is empty.'
  if (file.size > 10 * 1024 * 1024) return 'Choose a file smaller than 10 MB.'
  return ''
}

export type PatientImportResult = {
  inserted?: number
  skipped?: number
  blankRows?: number
  blank_rows?: number
  skipLog?: Array<string | Record<string, unknown>>
  skip_log?: Array<string | Record<string, unknown>>
}
export function importSkippedRow(
  row: string | Record<string, unknown>,
): string {
  if (typeof row === 'string') return row
  return `Row ${row.rowNumber ?? row.row_number ?? '—'}: ${row.name || 'No name'} (${row.phoneRaw ?? row.phone_raw ?? 'No phone'}) — ${row.reason || 'Skipped by import validation'}`
}
