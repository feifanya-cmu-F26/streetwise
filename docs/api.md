# Live API contracts

Success: `{ data, meta: { mode: "live" } }`; failure: `{ error: { code, message } }`. JSON responses use `Cache-Control: no-store`. Zod definitions under `src/schemas/` are authoritative.

All mutations require a same-origin `Origin` header and JSON content type. Private endpoints require a validated Supabase guest or email session in HttpOnly cookies. Both identity types have identical owner isolation. The service-role database client is never exposed to the browser.

| Method / path | Contract |
| --- | --- |
| `GET /api/auth` | Current `{id,email,isAnonymous}` or null; guest email is null |
| `POST /api/auth` | `guest` creates an anonymous session or returns the existing user; `send` with email; `verify` with email/code; `exchange` with email-return tokens; or `logout` |
| `GET /auth/callback` | PKCE magic-link exchange, then redirect to personal submissions |
| `GET /api/issues` | Public live issues; no evidence URLs, contact, browser links or receipt IDs |
| `GET /api/issues/:id` | Public live issue |
| `POST /api/issues/:id/confirm` | Authenticated `{kind:"still_there"|"resolved"}`; one per owner/kind |
| `POST /api/issues/upload` | Authenticated `{contentType,sizeBytes}` → owner-scoped private signed upload URL/path |
| `POST /api/reports` | `{id,storagePath,location,description?}` → persisted report; stable client UUID provides idempotency |
| `GET /api/reports` | Only current user's reports, newest first, up to 100 |
| `GET /api/reports/:id` | Owner's `{report,events,photoUrl}` |
| `POST /api/reports/:id` | Validated state transition below |
| `GET /api/reports/:id/browser` | Owner-only Browserbase live URL and takeover availability |
| `POST /api/reports/:id/browser` | Explicit `{text}` forwarding to the selected official portal field during takeover; owner scope and an atomic input lease; cannot submit |
| `GET /api/cron` | Bearer `CRON_SECRET`; recover due work and schedule tracking |

Legacy `POST /api/issues`, `/api/issues/analyze`, and `/api/issues/:id/submit` return 410. Clients cannot submit forged analysis; use persisted report jobs.

## Upload and analysis

1. The UI reads valid GPS from the original photo's EXIF locally, falling back to current device location only when unavailable. Replacing a photo clears the old issue location. Request a slot with JPEG/PNG/WebP MIME type and size ≤10 MB. The UI's compressed JPEG does not retain the original EXIF.
2. PUT bytes to the signed URL. The private bucket enforces MIME and size limits.
3. Create a report with a stable UUID and the returned path. Another user's path is rejected before AI execution.
4. Poll the detail endpoint until `review` or a visible failure. The worker performs real AI analysis, geocoding, duplicate candidate lookup and road ownership lookup. It preserves uncertainty and does not infer agency from the image.

Paths remain immutable: `evidence/<owner>/<uuid>.<ext>`. Approval atomically creates the public issue and links evidence; no Storage move can strand the database reference. Missing/failed services return errors, not demo output.

## Actions

- `approve`: reviewed report/category, contact, and `duplicatesReviewed`, `publishConfirmed` both true. Omit `authorityId`/`authorityConfirmed` to use the resolved authority from persisted server analysis. For manual selection, send a supported `authorityId` and `authorityConfirmed:true`. Unknown/conflicting automatic destinations or unconfirmed overrides return `AUTHORITY_NEEDS_REVIEW` (400). The review acknowledges the displayed destination; approval still publishes the issue and prepares the form, not the final government submission.
- `pause`: nonempty correction/reason. Stops future steps; takeover waits for the active lease to finish.
- `resume`: resumes preparation from its checkpoint after manual correction.
- `retry`: retries failed preparation/analysis; cannot replay uncertain submission.
- `submit`: requires `confirmedRealReport:true`, `confirmedReviewedForm:true`, ready state and existing reviewed session.
- `verify_receipt`: read-only reconciliation after manual submission or uncertain outcome.
- `track`: manual status check for a submitted receipt.

Invalid actions return 409. Other-owner report IDs return 404. Authentication failures return 401; bad origin 403; malformed input 400/415; rate limit 429; service/setup failures 502/503. AI errors are persisted on the private task with retry/takeover options.

A `submitting` fence persists before any final click. Worker loss changes this to `uncertain`, requiring receipt reconciliation instead of another send. Daily/manual status checks require exact request ID plus visible portal evidence. Community observations never change government status.

## Portal choices, login persistence and photos

- `POST /api/reports/:id` action `portal_mode`, `mode: account | anonymous`: owner-only AskMV choice, available after preparation stops for input and the lease is clear. It queues preparation, never sending. Anonymous disables automatic/manual tracking.
- `POST /api/government-connections/:authority`: save login and close this owner's agency browser, after active work stops.
- `DELETE /api/government-connections/:authority`: clear this owner's saved government context. No context IDs or tokens are returned.
- Approval may include `publishPhotoConfirmed: true`; only that explicit consent publishes the photo. Earlier clients default to private photos. List/detail issue reads include signed photos only when published or owned by the current viewer; responses remain no-store.
