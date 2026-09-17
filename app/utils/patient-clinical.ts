export type RecordValue = string | number | boolean | null
export type ClinicalRecord = { id?: string; [key: string]: unknown }
export type Field = {
  key: string
  label: string
  type?: string
  options?: string[]
  required?: boolean
  min?: number
  max?: number
}
export type RecordSection = {
  title: string
  endpoint: string
  fields: Field[]
  edit?: boolean
  remove?: boolean
}
const text = (key: string, label: string, required = false): Field => ({
  key,
  label,
  required,
})
const select = (key: string, label: string, options: string[]): Field => ({
  key,
  label,
  options,
})
const area = (key: string, label: string): Field => ({
  key,
  label,
  type: 'textarea',
})
export const clinicalSections: Record<string, RecordSection> = {
  allergies: {
    title: 'Allergies',
    endpoint: '/allergies',
    remove: true,
    fields: [
      text('allergen', 'Allergen', true),
      select('type', 'Type', [
        'drug',
        'food',
        'environmental',
        'insect',
        'other',
      ]),
      select('severity', 'Severity', [
        'mild',
        'moderate',
        'severe',
        'life_threatening',
      ]),
      text('reaction', 'Reaction'),
      { key: 'first_observed', label: 'First observed', type: 'date' },
      area('notes', 'Notes'),
    ],
  },
  vitals: {
    title: 'Vital signs',
    endpoint: '/clinical/vitals',
    fields: [
      ...[
        ['height_cm', 'Height (cm)'],
        ['weight_kg', 'Weight (kg)'],
        ['systolic_bp', 'Systolic BP (mmHg)'],
        ['diastolic_bp', 'Diastolic BP (mmHg)'],
        ['heart_rate', 'Heart rate (bpm)'],
        ['temperature', 'Temperature (°F)'],
        ['respiratory_rate', 'Respiratory rate (per min)'],
        ['oxygen_saturation', 'Oxygen saturation (%)'],
        ['blood_sugar_fasting', 'Fasting blood sugar (mg/dL)'],
        ['blood_sugar_postprandial', 'Postprandial blood sugar (mg/dL)'],
        ['hba1c', 'HbA1c (%)'],
      ].map(([key, label]) => ({
        key: key!,
        label: label!,
        type: 'number',
        min: 0,
      })),
      area('notes', 'Notes'),
    ],
  },
  notes: {
    title: 'Clinical notes (SOAP)',
    endpoint: '/clinical/notes',
    edit: true,
    fields: [
      select('note_type', 'Note type', [
        'progress',
        'soap',
        'discharge',
        'other',
      ]),
      area('subjective', 'Subjective'),
      area('objective', 'Objective'),
      area('assessment', 'Assessment'),
      area('plan', 'Plan'),
    ],
  },
  'medical-history': {
    title: 'Medical history',
    endpoint: '/clinical/medical-history',
    fields: [
      text('title', 'Condition or procedure', true),
      select('category', 'Category', [
        'condition',
        'surgery',
        'hospitalization',
        'injury',
        'other',
      ]),
      { key: 'onset_date', label: 'Onset date', type: 'date' },
      { key: 'is_ongoing', label: 'Ongoing', type: 'checkbox' },
      area('description', 'Description'),
    ],
  },
  'family-history': {
    title: 'Family history',
    endpoint: '/clinical/family-history',
    fields: [
      select('relation', 'Relationship', [
        'father',
        'mother',
        'brother',
        'sister',
        'grandfather',
        'grandmother',
        'other',
      ]),
      text('condition', 'Condition', true),
      {
        key: 'age_of_onset',
        label: 'Age of onset',
        type: 'number',
        min: 0,
        max: 150,
      },
      area('notes', 'Notes'),
    ],
  },
}
export const lifestyleFields: Field[] = [
  ...[
    ['average_sleep_hours', 'Average sleep (hours)'],
    ['water_intake_liters_per_day', 'Water intake (litres per day)'],
    ['meals_per_day', 'Meals per day'],
    ['caffeine_cups_per_day', 'Caffeine (cups/day)'],
    ['exercise_minutes_per_week', 'Exercise (minutes/week)'],
    ['cigarettes_per_day', 'Cigarettes per day'],
  ].map(([key, label]) => ({
    key: key!,
    label: label!,
    type: 'number',
    min: 0,
  })),
  ...[
    ['sleep_quality', 'Sleep quality'],
    ['diet_type', 'Diet type'],
    ['cuisine_preferences', 'Cuisine preferences'],
    ['dietary_restrictions', 'Dietary restrictions'],
    ['exercise_type', 'Exercise type'],
    ['occupation', 'Occupation'],
    ['work_schedule', 'Work schedule'],
    ['stress_level', 'Stress level'],
    ['mental_health_concerns', 'Mental health concerns'],
    ['living_environment', 'Living environment'],
  ].map(([key, label]) => text(key!, label!)),
  select('smoking_status', 'Smoking', [
    'unknown',
    'never',
    'former',
    'current',
  ]),
  select('alcohol_consumption', 'Alcohol', [
    'unknown',
    'never',
    'occasional',
    'regular',
    'heavy',
  ]),
  ...[
    ['skips_breakfast', 'Skips breakfast'],
    ['consumes_processed_food', 'Consumes processed food'],
    ['consumes_sugary_drinks', 'Consumes sugary drinks'],
    ['exercises_regularly', 'Exercises regularly'],
    ['chews_tobacco_or_paan', 'Chews tobacco or paan'],
    ['high_stress_job', 'High-stress job'],
    ['has_anxiety_or_depression', 'Anxiety or depression'],
    ['exposure_to_pollution', 'Exposure to pollution'],
  ].map(([key, label]) => ({ key: key!, label: label!, type: 'checkbox' })),
  area('additional_lifestyle_notes', 'Additional lifestyle notes'),
]
