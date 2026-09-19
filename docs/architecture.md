# Architecture

Streetwise is one Next.js application. `src/schemas/` holds Zod contracts shared by the map, report pipeline, and submission integration.

```text
Map (public issue DTOs)       Camera / private report / review / browser view
           |                              |
           +---------- Next.js routes ----+
                               |
                  Supabase guest / email authentication
                               |
      Supabase Postgres + private Storage + durable report jobs
                  |                           |
       AI Gateway → geo → duplicates    Stagehand v4 / Browserbase
                  |                           |
             user review          prepare → user approval → receipt
                                              |
                               daily / manual evidence-based tracking
```

## Main boundaries

- `src/lib/auth/`: validated Supabase sessions in HttpOnly cookies, same-origin mutation checks, database rate limits. Guests receive distinct anonymous user IDs through an explicit, rate-limited action. Existing sessions are reused; all report/session ownership checks apply equally to guests and email users. Email codes and default-template email returns remain optional. The client removes bearer fragments from history and the server validates both access and refresh identity before writing cookies. New links do not depend on the initiating browser; older PKCE links remain supported by the callback route. Guest account linking and automatic migration are not implemented.
- `src/lib/supabase/`: service-role server clients, owner-scoped immutable upload paths, private evidence. Every private route validates identity and owner scope before using privileged access.
- `src/lib/report/`, `ai/`, `geo/`, `issues/`: image analysis, reverse geocoding, nearby duplicate candidates, official road ownership evidence, public issue projection. Service failures never silently become demo success.
- `src/lib/submission/authority-choice.ts`: automatic destinations come from persisted official maintenance resolution; manual overrides require explicit confirmation. Unknown/private/conflicting road records do not default to a portal. Users see the selected destination with an optional Change agency control and still approve publication/preparation and final sending separately.
- `src/lib/client/photo-location.ts`: locally parses original-image EXIF GPS before compression. Valid coordinates take priority over device GPS; absent/corrupt/out-of-range metadata requests a fresh device fix. Replacing an image clears the previous location, and the preview labels its source.
- `src/lib/live/`: durable worker orchestration, lease checks, checkpoints and audit events.
- `src/lib/submission/`: portal allowlists, deterministic form inputs, Browserbase session lifecycle, read-only AI inspection and receipt verification.
- `src/components/live/`, `report/`: authentication, personal submissions, review, progress, browser viewing and takeover. The three main navigation screens remain mounted to preserve map/camera state.

## Data and privacy

`live_reports` is private and owns the analysis, reviewed report, contact details, browser session and receipt. `report_events` is its activity log. `evidence` records immutable `evidence/<owner>/<uuid>.<ext>` paths; signed URLs are produced only for the owner. Approval transactionally inserts a public `issues` row and links its evidence. Public issue DTOs omit contact details, browser links and external receipt identifiers. Photos are signed at read time only for the owner or an explicitly published photo (`issues.photo_public`). Earlier private photos remain private; new review consent explicitly includes the photo. Legacy records remain stored with `is_demo=true` and do not appear in the live map.

Issue lifecycle, community observations, and government request status are independent. A community confirmation cannot submit a report or declare an official request resolved. One user may register each observation kind once per issue.

The map also displays three presentation-only examples from `src/lib/demo/map-issues.ts` after a successful live issue load. They use the original example images, carry `Resolved · Demo` labels, and have no observation controls. They are not stored as live issues, exposed by the live API, or sent to the worker; an API failure still shows an error. Their simulated issue resolution does not claim a government submission.

## Task recovery and submission safety

Mutations persist a task before scheduling `after()` work. Atomic database claims acquire a 330-second lease; Vercel workers run for at most 300 seconds. Preparation checkpoints survive refresh and resume. Supabase pg_cron wakes the worker when queued work is due; Vercel's daily cron is a fallback. No laptop or browser needs to stay open.

A persisted `submitting` fence precedes the irreversible click. Lost or expired sends become `uncertain`; they are never automatically resent. Receipt reconciliation is read-only and requires a case ID and matching visible report evidence. Final submission requires two explicit confirmations, an owner session, a reviewed browser session and the official portal allowlist.

Pause stops future automation steps. Takeover is allowed only when the report is paused/needs input/ready/uncertain and its worker lease is no longer active. Browserbase sessions expire; preparation may open a fresh session, but submission cannot silently substitute a fresh unreviewed browser.

## Portal behavior

| Agency | Preparation | Human steps / limits |
| --- | --- | --- |
| Mountain View AskMV | Verified topic/subtopic, concern, description, location, contact and photo fields; inspect current controls on resume | Account login for replies, or explicit anonymous/no-response choice; actual verification and final approval |
| Santa Clara County Roads | Editable description/address/email after login | County account login; final portal submission is manual, followed by Check receipt |
| Caltrans | Verified category codes, description, location text and contact | Portal map/location validation, direction/date/required controls and CAPTCHA; final approval. Traffic signs are not mislabeled as traffic signals. |

AskMV account obstacles offer a visible account-versus-anonymous choice. Only an explicit anonymous choice selects no responses; those reports disable status tracking. Preparation never clicks Submit.

Government logins use Browserbase encrypted contexts stored under a private `(owner_id, authority_id)` connection. Raw cookies/tokens are not copied into Supabase or report DTOs. Atomic per-connection locks and active-session checks serialize use. Session release persists login data; Save login & close browser releases it for another task. Clear login deletes the provider context. Existing pre-context sessions need another login after expiry. Tracking reuses the context, keeps an expired-login browser open for takeover, and never infers a status from a login page.

CAPTCHAs and passwords remain user actions. Browserbase live view supports watching and desktop takeover; mobile keyboard interaction depends on Browserbase support and is not claimed fully validated.

Tracking opens only a verified official receipt URL. If the exact request cannot be found, the UI reports that tracking is unavailable and stops automatic checks for that receipt; manual checks remain available. No timer invents a government status.

## Deployment

See `docs/deployment.md` for project IDs, required environment variables, authentication redirects, scheduling and acceptance limits. `0001_init.sql` establishes the base schema; `0003_government_connections.sql` adds private browser connections and explicit photo consent. `0002_live_integration.sql` adds ownership, jobs and atomic RPCs without deleting existing data.
