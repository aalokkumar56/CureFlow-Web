// Mirrors CureFlow.Application/Validation in the dotnet-backend project.
// Keep these in sync when the backend validators change.
export const patientConstraints = {
  name: { required: true, maxlength: 200 },
  phone: { required: true, maxlength: 20 },
  age: { min: 0, max: 150, step: 1 },
  email: { type: 'email' },
} as const
export const vitalConstraints: Record<
  string,
  { min: number; max: number; step?: number | string }
> = {
  height_cm: { min: 30, max: 300, step: 'any' },
  weight_kg: { min: 0.5, max: 500, step: 'any' },
  systolic_bp: { min: 50, max: 300, step: 1 },
  diastolic_bp: { min: 30, max: 200, step: 1 },
  heart_rate: { min: 20, max: 300, step: 1 },
  temperature: { min: 90, max: 115, step: 'any' },
  respiratory_rate: { min: 5, max: 80, step: 1 },
  oxygen_saturation: { min: 50, max: 100, step: 'any' },
}
