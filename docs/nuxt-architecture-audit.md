# Nuxt architecture and reliability audit

Audit date: 14 September 2026.

This review covers the current Nuxt application in this workspace, its runtime and authentication boundaries, and the reusable code already available. It uses Nuxt's current rendering and data-fetching guidance, Microsoft's Backends for Frontends guidance, and Google's code-review guidance on complexity and small changes.

## Executive finding

Nuxt SSR is not disabled in `nuxt.config.ts`; it is bypassed at the application root. `app/app.vue` wraps the entire layout and page tree in `<ClientOnly>`. The tenant auth guard also returns immediately on the server, because credentials live in `localStorage`. Almost every page then fetches its initial data inside `onMounted`, after hydration. The result behaves like a client-rendered SPA inside a Nuxt server build.

That explains the current experience:

1. The server can generate the shell, but `ClientOnly` replaces the application with a fallback until the browser runs JavaScript.
2. The browser has no server-readable session, so the server cannot know the tenant or permissions.
3. Data requests start only after `onMounted`; the first HTML contains loading states rather than patient, appointment, or dashboard data.
4. The API plugin calls the .NET API directly from the browser with a bearer token. There are no `server/api` routes in this project to act as a Nuxt server boundary.

Nuxt's documented model is to use `useFetch`/`useAsyncData` for SSR-safe reads and Nitro server routes when the server needs to keep secrets or adapt a backend response. Nuxt also provides `useState` as SSR-friendly shared state. See [Nuxt data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching), [Nuxt rendering modes](https://nuxt.com/docs/4.x/guide/concepts/rendering), and [Nuxt state management](https://nuxt.com/docs/4.x/getting-started/state-management).

## Findings by priority

| Priority | Finding | Evidence | Consequence |
| --- | --- | --- | --- |
| P0 | Global `ClientOnly` disables useful SSR | `app/app.vue` wraps `<NuxtLayout><NuxtPage /></NuxtLayout>` in `<ClientOnly>`. | Every route waits for client JavaScript. SSR output cannot contain authenticated page content or useful loading structure. |
| P0 | Auth cannot work during SSR | `app/utils/auth/storage.ts` stores token, user, and tenant only in `localStorage`; `app/middleware/tenant-auth.ts` returns on the server. | The server cannot authenticate a request, enforce tenant lifecycle, or render personalized data. This is the main prerequisite for safe SSR. |
| P1 | Initial reads are client-only | Pages and composables use `onMounted(load)` throughout: dashboard, patients, appointments, staff, settings, campaigns, inbox, email inbox, doctors, and platform pages. No `useFetch` or `useAsyncData` call exists. | Slow first content, empty server HTML, duplicate loading states, and more work in the browser. |
| P1 | Browser calls the backend directly | `app/plugins/api.ts` exposes `runtimeConfig.public.apiBaseUrl` and creates an Axios client in the browser. `server/` has no API handlers. | Backend URL and CORS become part of the browser contract. There is no central server-side token forwarding, response shaping, timeout policy, or secret protection. |
| P1 | Session state can be stale across users/tenants | `useState` keys such as `dashboard-overview`, `tenant-patient-total`, and notification state are fixed globally. Logout clears local storage but does not explicitly clear all Nuxt state. | A logout/login or tenant switch can retain old counts, dashboard data, and notification items until a later request replaces them. |
| P1 | Request cancellation and error policy are inconsistent | Patients and inbox use request counters; appointments and dashboard do not consistently abort stale requests. Several composables swallow errors or replace them with empty arrays. | Slow responses can overwrite newer data; permission failures can look like empty data; network faults are harder to diagnose. |
| P1 | Sensitive token storage is exposed to XSS | Access tokens are readable by every script running in the origin through `localStorage`. | A script injection can copy the bearer token. This is a security and maintenance concern for a patient-data application. |
| P2 | Nuxt configuration contains dead commented configuration | The top of `nuxt.config.ts` contains an older fully commented config block, while the active config omits explicit `ssr`, `typescript.strict`, `devtools`, and Nitro settings. | New maintainers cannot tell which settings are intentional. The project relies on defaults without documenting them. |
| P2 | Shared normalization code is duplicated | `patientList`, settings list normalization, appointment list normalization, referrals, campaigns, follow-ups, and WhatsApp each implement similar array/items/data extraction. | Response-shape fixes must be repeated and can drift. |
| P2 | Global event listeners are not removed | `GlobalSearch.vue` adds a `keydown` listener in `onMounted` with an inline function and never removes that same function in `onBeforeUnmount`. | Navigating repeatedly can leave multiple shortcuts active and retain component state. |
| P2 | Polling is page-specific and not visibility-aware | Inbox, email, and notifications each establish their own intervals. | Background tabs keep polling; intervals and error behavior differ between modules. |
| P2 | Very large page components concentrate unrelated concerns | Patient detail, settings, patient directory, and appointments are among the largest files; data loading, permissions, formatting, and view markup are mixed. | Reviews become harder and changes have a wider regression surface. Google’s guidance explicitly asks whether code can be simpler and recommends small, focused changes. |
| P3 | Runtime validation is thin | API responses are mostly typed as `unknown` and cast after shallow normalization; there is no shared schema validation. | Backend contract changes can fail later in rendering rather than at the API boundary. |

## What “SSR” should mean for this product

SSR is valuable here for the public and route-shell parts of the product, but it should not be treated as a requirement to server-render private medical records into HTML for every request.

The appropriate target is a hybrid model:

- Public login, signup, registration-received, pending-approval, and onboarding shells render on the server.
- Authenticated tenant routes use an httpOnly session cookie that the server can read. The server renders permission-aware loading or summary data through Nuxt server routes.
- Private patient clinical payloads remain protected behind authenticated server routes and can be loaded after the shell when the user opens a tab. This limits sensitive data in the initial HTML and keeps the interface responsive.
- Browser-only actions such as file selection, clipboard, printing, polling, and media previews remain client-side.

This is closer to the BFF approach in Microsoft’s architecture guidance: a frontend-specific server boundary adapts and protects calls to the general backend, centralizes identity propagation, and can aggregate data where the page needs it. See [Microsoft’s Backends for Frontends pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/backends-for-frontends).

## Recommended target architecture

```text
Browser
  │ httpOnly session cookie
  ▼
Nuxt/Nitro server
  ├─ route middleware: session + tenant lifecycle
  ├─ server/api/*: backend-for-frontend handlers
  ├─ server/utils/api: token forwarding, timeout, error mapping, tracing
  └─ useFetch/useAsyncData: SSR-safe page reads
       │ internal service credential or forwarded access token
       ▼
 .NET API
  └─ tenant authorization, validation, audit, persistence
```

The Nuxt server should own the backend base URL in a private runtime-config key. Only browser-safe values should live under `runtimeConfig.public`. A single `server/utils/backend.ts` should provide `getBackendClient(event)`, timeout defaults, correlation IDs, and consistent conversion of upstream 401/403/404/422/5xx responses.

Pages should call small feature composables that wrap `useAsyncData`/`useFetch`, for example `usePatientsDirectory(query)` and `usePatientProfile(id)`. Those composables should return `data`, `status`, `error`, and `refresh`, while mutation methods remain explicit `$fetch` calls to Nuxt server routes. Do not put mutable request data in module scope; use component refs for local state and keyed `useState` only for intentionally shared state.

## Reuse opportunities already in the codebase

| Existing code | Reuse target | Action |
| --- | --- | --- |
| `app/utils/patients.ts:patientList` | Every paged/list API | Move to a generic `app/utils/api/normalize.ts` and use it from appointments, settings, referrals, campaigns, follow-ups, WhatsApp, and patients. |
| `normalizeApiError` | All composables and mutations | Keep one error shape; add server-route mapping so pages never need to understand Axios response details. |
| `keysToSnakeCase` | Request body transformation | Keep at the backend boundary only. Do not transform arbitrary objects in page components. Add the inverse response transform only if the API contract needs it. |
| `collectAppointments` and `nextPatientAppointments` | Patient directory/profile and dashboards | Keep the pagination/selection helper; move fetch orchestration into an appointment repository composable with cancellation and a page cap. |
| `usePatients`, `useAppointments`, `useSettings`, `useCampaigns`, `useReferrals`, `useFollowUps` | Repository-style feature composables | Standardize their shape: `data`, `loading/status`, `error`, `load/refresh`, and explicit mutation methods. Remove repeated `request` counters where AbortController can solve the problem. |
| `hasPermission`, `PERMISSIONS`, `tenantLifecycleRoute` | Middleware and server/API policy checks | Use the same named permission constants on the client for UI and on Nitro handlers for early checks; backend authorization remains authoritative. |
| `hospitalTimezone`, `hospitalDay`, `hospitalTime` | All appointment and clinical date displays | Replace browser-local `Date` formatting in remaining pages and centralize date formatting options. |
| Patient clinical section metadata | Clinical tabs and today summary | Keep `clinicalSections` as the field/endpoint registry. Build small generic record panels around it rather than adding more page-specific field arrays. |
| `PatientImport` and `usePrescriptionPrint` | Other file/print workflows | Extract a shared upload state machine and authenticated document/print helper after current workflows stabilize. |

## Practical migration sequence

1. **Make SSR visible without changing authentication.** Remove the global `<ClientOnly>` wrapper, leave tenant data behind a client-only auth gate temporarily, and replace the fallback with a real shell/loading state. This makes public routes SSR immediately and exposes hydration issues safely.
2. **Move auth to a cookie-backed session.** On login, set an httpOnly, secure, same-site cookie through a Nuxt server route. Add a server-readable session composable and use it in route middleware. Keep local storage only for non-sensitive UI preferences such as sidebar collapse.
3. **Create the BFF boundary.** Add server utilities and a small set of routes first: `/api/bff/session`, `/api/bff/dashboard`, `/api/bff/patients`, and `/api/bff/patients/[id]`. Proxy authorization and tenant context; never expose service credentials to the browser.
4. **Convert read-heavy pages.** Start with dashboard, patient directory, and patient profile. Replace `onMounted(load)` with keyed `useAsyncData`/`useFetch`. Keep clinical tab data lazy to avoid putting a complete medical chart in the initial payload.
5. **Standardize mutations and reliability.** Add one timeout/retry policy for safe GETs, AbortController support for changing queries, optimistic updates only where rollback is clear, and structured logging with request IDs. Never retry patient writes automatically.
6. **Split large views by responsibility.** Extract toolbar/filter state, table/pagination, preview, and page-level orchestration from the patient directory; do the same for settings and patient detail. Keep each change small enough to review independently.
7. **Remove dead paths and document defaults.** Delete commented config, explicitly set intentional Nuxt options, add route metadata for auth requirements, and document which pages are SSR, hybrid, or client-only.

## Reliability and maintenance checklist

- Use `useFetch`/`useAsyncData` for route reads that should appear in SSR HTML; use `$fetch` for event-driven mutations.
- Give every async page read a stable key that includes tenant ID and route parameters.
- Abort stale searches and pagination requests rather than relying only on response counters.
- Do not turn 403, 404, or network errors into empty arrays without preserving an error state.
- Add a maximum page traversal limit to appointment aggregation, with a clear backend follow-up to add a patient filter.
- Remove event listeners with named handlers; pause polling when `document.visibilityState !== 'visible'`.
- Clear user-scoped `useState` keys on logout or include a session/tenant key in their names.
- Keep private API base URLs and service credentials out of `runtimeConfig.public`.
- Use one response-normalization helper and one API error helper.
- Keep server authorization and tenant isolation authoritative; client permissions are for presentation and early UX only.
- Prefer small, independently reviewable changes. This matches Google’s review guidance on reducing complexity and keeping changes small.

## Suggested first refactor

The first implementation slice should be deliberately small:

1. Remove `<ClientOnly>` from `app/app.vue` and add a CSS shell fallback.
2. Add `app/server/utils/backend.ts` and one `/api/bff/session` route without moving patient data yet.
3. Add a cookie-backed session migration behind the existing login flow.
4. Convert only `/patients` directory reads to `useAsyncData`, preserving its current filters, pagination, import, and preview behavior.
5. Test SSR output for logged-out routes, cookie-authenticated route guards, 401/403 handling, tenant switching, and hydration.

This provides measurable SSR benefits and validates the server boundary before changing every page. Converting every `onMounted` call in one pass would increase risk and make regressions difficult to isolate.

## Current verification

The first implementation slice is now complete: the global client-only wrapper was removed, SSR is explicit, private backend configuration and Nitro auth routes were added, login/session/logout use an httpOnly cookie bridge, API calls have a timeout and request ID, logout clears user-scoped Nuxt state, and the global search listener is cleaned up. `pnpm typecheck` and `pnpm build` both pass. Patient and dashboard reads still use client-side composable loading; converting those reads to keyed `useAsyncData` is the next staged change because it depends on validating the cookie session against the deployed backend.
