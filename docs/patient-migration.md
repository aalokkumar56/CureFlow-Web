# Patient migration

The Nuxt patient workspace was rebuilt against the legacy Next.js views and the
local .NET controller/DTO contracts, rather than translating JSX mechanically.

## Routes and features

| Route | Features |
| --- | --- |
| `/patients` | Debounced search; status, department and source filters; URL pagination; profile preview; current-page CSV export; admin Excel/CSV import with skipped-row results and template download |
| `/patients/new` | Reusable validated registration form, hospital departments, referring-doctor selection and permission-aware referral logging |
| `/patients/:id` | Overview, contact/emergency details, care notes, tags and existing AI summary |
| `?tab=details` or `?edit=1` | Profile editing, demographics, address, government ID, notification preference and follow-up |
| `?tab=appointments` | Appointment history, booking, status updates and explicit consultation start/completion |
| `?tab=allergies`, `vitals`, `notes`, `history`, `lifestyle` | API-backed clinical records with permission-aware forms; allergy deletion and SOAP editing |
| `?tab=prescriptions` | Multiple medicines, optional injections, follow-up advice and printable record |
| `?tab=documents` | PDF/JPEG/PNG paper notes, authenticated downloads and deletion |
| `?tab=visit-chart`, `timeline` | Visit-grouped records and longitudinal activity |
| `?tab=messages` | Conversation history, quick reply drafts, text/media sending and authenticated attachment downloads |

## Implementation decisions

- Patient state belongs to component scopes, avoiding cross-session global caches.
- Only the newest directory response updates the table. Search/filter state lives
  in route queries. Counts reflect the filtered backend total, not the current page.
- Lifecycle statuses and blood-group values match backend enums. Temperature uses
  Fahrenheit, matching `CreateVitalSignsValidator`.
- Shared `PatientForm`, `RecordFields`, and `ClinicalRecords` components centralize
  rendering and payload conversion. Empty numeric values become null; age zero is
  preserved; tags are arrays.
- Writes disable duplicate submission and retain drafts on failure. A registration
  whose referral log fails exposes the created patient instead of creating another.
- Clinical and conversation access use their actual API permissions. Explicit empty
  permission arrays remain denied. Backend authorization remains authoritative.
- File uploads let the browser generate multipart boundaries; downloads retain the
  existing authenticated API client. CSV cells that can evaluate as formulas are escaped.
- Consultations start on an explicit user action, not merely opening a patient URL.
  Clinical writes made during the active consultation include its visit ID.

## Verification

The migration audit includes manual source and contract verification for request
ordering, state isolation, permission denial, CSV formula protection, date handling,
form normalization, duplicate/read-only save protection, and clinical draft
preservation after an API failure. No test runner is included in the Nuxt project.

`pnpm typecheck` validates the Nuxt application. `pnpm build` produces the production
client/server build.

Browser discovery returned no available browser in this session. Pixel-level QA,
print pagination, and authenticated live-backend workflows still require verification.
No real patient data was created, uploaded, messaged, or deleted during development.

## Backend constraints and follow-up

- `GET /appointments` has no patient filter. The profile currently traverses its
  pages and filters by patient locally to avoid silently missing appointments.
  Add a tenant-scoped patient filter on the backend for efficient large installations.
- Consultation state lives in the open profile; reloading requires starting/resuming
  through the appointment action. The backend controls visit creation semantics.
- Directory export is explicitly the current page. No spending or next-visit values
  are fabricated when the patient list DTO does not provide them.
- The existing holistic endpoint returns clinical information under Patient.View.
  This migration uses permission-specific clinical endpoints instead. Audit the
  holistic endpoint authorization separately before exposing it to nonclinical roles.
- Patient documents follow the server's 10 MB PDF/JPEG/PNG policy. The server remains
  responsible for validating content and tenant ownership.
- Verify desktop/mobile directory, preview, forms and each profile tab with realistic
  records; test restricted roles, failed requests, import duplicates, consultation
  completion, printed prescriptions and message delivery against a test tenant.
