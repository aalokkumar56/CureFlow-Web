# Legacy / Nuxt functionality audit

Audit date: 14 September 2026.

Compared the current working tree in `D:/Projects/Sarvik/web/cureflow-web-nuxt` with the legacy Next.js application in `D:/Projects/Sarvik/care-flow-web`. Checked patient import contracts against `D:/Projects/Sarvik/Care-Flow/Cure-Flow/dotnet-backend`. Backend conclusions depend on the deployed API matching this local source.

This is a source and contract audit, with an executed CSV reproduction and successful `pnpm typecheck`. It is not an authenticated browser acceptance test. No patient records were imported, changed, deleted, or messaged. Existing uncommitted application edits were included in the review and left intact.

## Highest-priority findings

| Priority | Finding | Impact and evidence |
| --- | --- | --- |
| P1 | Downloaded patient CSV template is incompatible with the local backend CSV parser | `app/utils/patients.ts:downloadPatientCsv` quotes every cell. `PatientService.cs:ImportCsvAsync` uses `Split(',')` and does not unquote cells. The current template's age `"45"` cannot parse as a number, gender `"Male"` cannot parse as an enum, and names retain literal quotes. The legacy sample emitted unquoted simple fields, so this is a regression in the template/backend combination. |
| P1 | Required tenant lifecycle pages are absent | `app/middleware/tenant-approval.ts`, login, and signup redirect to `/pending-approval` and `/onboarding`, but neither route exists. `/registration-received` is also absent. The old application has all three pages. New or unapproved tenants cannot finish the intended flow. No replacement or redirect was found in Nuxt configuration. |
| P1 | WhatsBiz credential entry is wired to the wrong field | In `app/pages/(tenant)/settings/index.vue`, the shared Access/API token input writes `access_token` for either provider. `useSettings.ts` sends WhatsBiz credentials from `api_token`. A new WhatsBiz API token entered in the UI therefore does not populate the expected payload field. |
| P1 | Integration configuration fields were removed | The current settings form lacks SMTP username, from name, SSL/TLS selection, and send-email-with-WhatsApp selection. It also lacks WhatsApp WABA ID, verify token, app secret, and WhatsBiz base URL/API-token fields. The legacy `src/components/settings/IntegrationsPanel.jsx` exposes these. Existing loaded values may survive saving, but users cannot configure or correct them through the new UI. |
| P2 | Doctor-specific dashboard missing | Legacy `src/views/Dashboard.jsx` routes doctors to `DoctorDashboard`, with a date selector, mine/all scope, doctor filter, clinical statistics, check-in, and chart opening. Nuxt `app/pages/(tenant)/index.vue` always renders the operations dashboard and uses `/dashboard/overview`. |
| P2 | Patient directory next appointment can be falsely empty | `app/pages/(tenant)/patients/index.vue:loadUpcomingAppointments` reads only page 1, limited to 100 appointments and the next 30 days. A patient's actual next appointment on another page or beyond the window is displayed as a dash. The heading does not disclose the window. Errors also become an empty map. |
| P2 | Appointment request ignores the directory user's appointment permission | The same directory loader runs unconditionally on mount, unlike the profile's guarded appointment loader. A user allowed to view patients but denied Appointment.View still sends the request; a backend rejection is silently displayed as no appointment. Backend authorization remains authoritative. |
| P2 | Patient preview actions and information were reduced | Legacy `PatientPreviewPanel.jsx` provides call, WhatsApp, email, edit, copy phone/email, and additional fetched patient/activity information. The Nuxt preview contains basic identity/contact details and an Open patient profile link. The row's direct Edit menu action is also absent, although editing remains available inside the profile. |
| P2 | Today's clinical overview was reduced | Legacy `PatientDetail.jsx:TodayOverview` includes today's vitals, clinical notes, and prescriptions with print access. Nuxt's Overview presents appointment/contact/care-note information, but not the equivalent consolidated clinical snapshot. Separate Vitals, Clinical notes, and Prescriptions tabs still exist. |
| P2 | Legacy settings and personal-notification URLs are missing | Old `/settings/hospital`, `/settings/integrations`, `/settings/templates`, `/settings/notifications`, and `/notifications/preferences` have no corresponding Nuxt pages or configured redirects. Several settings features moved to `/settings?section=...`, so these are broken routes rather than all being absent features. Middleware still explicitly allows the obsolete hospital/integrations URLs during onboarding. |
| P2 | Migration documentation claims tests that are unavailable | `docs/patient-migration.md` says `pnpm test` exercises patient regressions. The current `package.json` has no test script, and no matching project test suite was found. Successful type checking does not verify imports, permissions, request failures, printing, or consultations. |

## Patient Excel/CSV import verification

| Check | Result |
| --- | --- |
| Import option exists | Yes: Import patients button, with admin-role visibility. |
| Supported extensions | `.xlsx`, `.xls`, `.csv` in both the input and local backend controller. |
| Endpoint and field | Correct: POST `/patients/import-excel`, multipart field `file`. |
| Multipart handling | Current API interceptor recognizes FormData, avoids JSON key conversion, and removes the default JSON content type so the browser can generate the boundary. This includes an existing uncommitted edit. |
| Response handling | Supports `inserted`, `skipped`, `blankRows`/`blank_rows`, and `skipLog`/`skip_log`; skipped-row formatting supports camelCase and snake_case. |
| Required columns guidance | Present for Patient Name and Mobile Number. Legacy UI explains more header aliases and optional fields. |
| Template download | Present, but the quoted CSV/backend incompatibility above must be resolved before considering it reliable. |
| File selection workflow | Changed: selecting a file starts the upload immediately. The old dialog showed the filename and required Upload & Import, with Cancel. This is a removed review step, not a missing upload endpoint. |
| Duplicate submission | Prevented while an import is running; input is reset after an attempted upload. |
| Client validation | Extension only. No empty-file or size check. The old UI advertised 10 MB, but the inspected old handler did not enforce that limit either. The local controller rejects empty files but contains no explicit 10 MB import limit. |
| Results and retry | Counts, error messages, skipped-row details, and list refresh exist. The import can be retried by choosing another file. Invalid-extension rejection exits before the usual input reset. |
| Duplicate matching | Backend uses name + normalized phone + age + gender, both within the file and against the database. It is not phone-only deduplication. Quoted names/failed age or gender parsing can affect duplicate recognition. |
| Excel workbook scope | Backend reads only the first worksheet and searches the first five rows for headers. If no matching header is found, it falls back to positional columns and treats row 1 as the header. This is inherited behavior, not a Nuxt regression. |
| CSV limitations | Backend splits physical lines and commas directly; quoted commas, escaped quotes, and multiline fields are not supported correctly. CSV also lacks the Excel importer's email mapping. These are backend limitations shared by clients. |
| Live import | Not performed. Database insertion, duplicate skips, malformed workbooks, large files, and role enforcement require an isolated test tenant. |

### Executed CSV reproduction

Executed the current `downloadPatientCsv` helper with browser download objects stubbed and a synthetic patient. Applied the backend's comma-split/trim behavior to the resulting row.

```text
Generated: "Test Patient","9876543210","45","Male"
Backend name: "Test Patient" (quotes remain)
Age parses: false
Gender matches enum: false
```

This validates the serialization mismatch without touching patient data. It does not execute the .NET importer or database transaction. Fix the backend with a proper CSV reader; do not remove correct CSV escaping from the export helper to conceal the parser problem.

## Other patient options

| Feature | Current implementation / caveat |
| --- | --- |
| Search, status, department, source | Present; URL state, debounce, pagination, and stale-response protection implemented. |
| CSV export | Present and clearly labeled Export page; exports only loaded rows. Legacy export also used the current loaded patients, so a full-directory export is not a confirmed regression. |
| New patient and edit | Present through `/patients/new` and the profile details form. Direct row/preview edit shortcut is missing. |
| Registration referral | Referring-doctor selection and referral logging exist in the new-patient workflow. |
| Appointments and consultations | Profile appointment loading traverses pages; start/completion actions and visit-linked records exist. Active visit state is component-local and does not survive a reload. Live resume/completion behavior remains unverified. |
| Allergies, vitals, notes, history, lifestyle | Components/tabs and API-backed controls exist; presence does not establish successful live saves. |
| Prescriptions and printing | Present, including multiple medicines and injections. Printing now uses the page and print CSS, whereas legacy used the authenticated server print endpoint. Print layout and pagination need visual acceptance testing. |
| Documents | Upload/download/delete implementation exists. |
| Visit chart and timeline | Present. |
| Patient conversation | Present as a WhatsApp tab with conversation controls. |
| AI summary | Existing summary displayed; no missing generation feature established from the old patient page. |
| Delete patient / bulk selection | Backend has patient deletion, but an equivalent old patient UI action was not established. Do not classify these as migration regressions merely because the API supports them. |
| Hospital timezone | Current patient dates/today grouping use browser-local time; the legacy detail page uses hospital-timezone helpers. This can change which appointment appears under Today for staff in a different timezone. |

## Wider project coverage

Current routes exist for appointments, inbox, email inbox, campaigns and campaign detail, tasks, missed revenue, referring doctors and detail, staff, settings/users/roles/permissions, and platform tenant management. Their presence was checked; this audit does not certify every action in those modules. The confirmed broader gaps above came from lifecycle, dashboard, and settings comparisons.

## Recommended implementation order

1. Correct CSV parsing and add a real round-trip fixture using the downloaded template. Cover commas, quotes, multiline notes, optional fields, duplicate keys, and `.xlsx`/`.xls` separately.
2. Restore lifecycle pages and old settings URL redirects; verify new-tenant and pending-approval flows.
3. Restore provider-specific integration inputs and fix WhatsBiz token binding.
4. Restore the doctor dashboard and clinical overview.
5. Correct directory appointment pagination/permission/error states; restore preview shortcuts and the import review step.
6. Establish executable regression checks and run authenticated desktop/mobile patient workflows in a test tenant, including prescription print preview.

Validation completed: `pnpm typecheck` passed. Application source was not changed during this audit; this report is the only added file.
