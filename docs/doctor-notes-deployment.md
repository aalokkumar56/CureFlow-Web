# Doctor Notes deployment

The feature extends the existing ClinicalNotes records and Visit Chart. Appointments now open the selected patient's Visit Chart; starting the consultation resolves its visit. Existing SOAP content is preserved. The old Clinical notes tab points to the same chart rather than maintaining another editor.

## Deploy

1. Deploy the backend changes in `D:/Projects/Sarvik/Care-Flow/Cure-Flow/dotnet-backend` first.
2. Apply migration `20260920172752_DoctorNoteLifecycle` using your normal migration process. Startup already runs migrations when `Database:AutoMigrate` is enabled (the existing default). The migration has been generated but has not been applied to your database by this task.
3. For Google Cloud Translation Basic v2, enable the API in your Google Cloud project and set **ClinicalTranslation__GoogleApiKey** in the backend's Render environment. Use a private API key restricted to the Translation API. Do not put it in a public Nuxt variable. The Translate action sends only the saved note's content and language codes to Google, following the authorization given for this feature. No translation is sent while typing or auto-saving.
4. Deploy the frontend. Vercel's **NUXT_BACKEND_API_URL** should be `https://careflow-ujh5.onrender.com`.
5. Verify with a doctor account linked to an actual User record with the Doctor role and Clinical.View/Clinical.Edit permissions. Other roles with chart-view permission can view, translate, and listen, but cannot write.

## Data rules

- A new note is a draft. Save progress and one-minute auto-save do not finalize it.
- Save & Finish sets the server finalization timestamp once and a deadline exactly 24 hours later. Later saves never extend the deadline.
- The backend derives author ID and name from the authenticated user, validates the tenant/patient/visit/appointment, and requires the current revision for edits.
- Existing saved notes are backfilled as locked records, not drafts. Their original language is marked unknown rather than guessed; select a translation language when reading them.
- The legacy Visit.DoctorNotes text remains visible as read-only history. The old visit create/update fields cannot write Doctor Notes; the ClinicalNotes endpoints are the single writing workflow.
- A database trigger prevents deleting finalized notes, soft deletion, reopening, association changes, or editing after the deadline. There is no normal note deletion API.
- Drafts are visible only to their author, including through chart, timeline, and holistic patient responses. The holistic endpoint now also requires Clinical.View.
- A same-note write is serialized in a database transaction. Revision checks reject stale tab contents. Conflicts preserve the unsaved editor text and display the server version for comparison.

## Recovery and browser support

- Last successfully synchronized drafts recover from the server after refresh/sign-in. Unsynchronized text is held in memory; it is not copied into localStorage. A sudden browser/device failure may lose changes since the last successful save.
- Leaving a patient, section, or signing out prompts to save. A failed save blocks that navigation. Stop Recording saves progress. Visibility/page lifecycle events make additional best-effort save attempts; browser shutdown delivery cannot be guaranteed.
- Speech recognition uses the browser's available SpeechRecognition/webkitSpeechRecognition service. Select English, Hindi, Gujarati, or Marathi. This API does not reliably auto-detect those languages, so the UI explicitly uses the permitted manual fallback. Browser service and microphone support vary.
- Read aloud uses installed browser/device voices. Missing voices and speech errors are shown, not silently replaced with another language. Translated reading first obtains a translation; original text is unchanged.
- Prescription reading reads its existing content, medication instructions, and injections; it does not translate or edit the prescription.
- Google credentials/service availability and installed voices must be checked in the deployment environment. No real clinical text or microphone audio was used in automated tests.

## Validation

Frontend:

```powershell
npm run typecheck
npm run build
node --test tests/doctor-note-editor.test.mjs tests/clinical-speech.test.mjs tests/clinical-navigation.test.mjs
```

Backend (from the backend directory):

```powershell
dotnet build src/CureFlow.Api
dotnet test tests/CureFlow.Tests --filter FullyQualifiedName~DoctorNoteLifecycleTests
```

Before rollout, use a staging database and two doctor accounts to check migration/backfill, the PostgreSQL protection trigger, tenant isolation, browser refresh, simultaneous tabs, and the full appointment-to-note flow. Verify translation with a nonclinical sample using the configured Google project, and test each required installed voice with a microphone-enabled browser.
