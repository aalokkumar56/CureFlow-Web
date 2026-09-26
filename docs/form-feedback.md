# Forms and feedback

Use `ValidatedForm` in place of native submit forms. Keep existing submit handlers and pass their error state through `:error`. Give each control a `name` matching its request field. The component checks native types, required fields, whitespace, lengths and ranges, focuses the first invalid input, and presents full messages next to fields and in an accessible summary. Unmapped backend messages remain in the summary. Nonempty fields validate while typing; required fields also validate when blurred. Corrected errors clear immediately, before submitting.

For request-specific rules, use `data-min-digits` and `data-max-digits` on telephone inputs, `data-matches="password"` for confirmation, `data-after="start_time"` for time ordering, `data-future` for appointment dates (with the backend five-minute tolerance), and `data-contains-alphanumeric` for hospital names. Keep action buttons that save editable fields inside a `ValidatedForm` and use its submit event rather than calling save directly from a click handler.

Use explicit `type="submit"` for the save button and `type="button"` for every other action. Disable submit controls while saving. The shared form stops submit propagation, ignores events from other forms and blocks disabled or duplicate submissions in the same render cycle. Asynchronous handlers should still guard their saving state when they can also be called outside a form.

Use `normalizeApiError(cause, fallback)` in catches, never `cause.message` for HTTP errors. It handles Axios, ofetch and nested Nuxt proxy responses and retains all backend validation messages. `FormError` displays messages as text, never HTML. Server failures use a safe fallback.

Use `useToast().show(message)` after explicit successful actions. Failed tenant API mutations other than input-validation responses also produce dismissible error toasts. Background reads do not generate toasts.

Shared presentation belongs in `app/assets/css/feedback.css`, using the existing `--cf-*` design variables. Do not add per-page feedback styles.

`app/utils/validation.ts` mirrors patient and vital rules from `CureFlow.Application/Validation` in the backend. Appointment limits also follow its create/update validators. Update these constraints when the server rules change; do not invent maximum lengths where the backend has none. The backend remains authoritative for uniqueness, permissions and cross-record validation.

Workspace VS Code settings enable Prettier on save. `.prettierrc.json` is the shared formatting configuration. Run `npm test`, `npm run typecheck`, and `npm run build` to verify changes.
