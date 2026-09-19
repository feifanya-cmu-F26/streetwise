# Goal

Deliver Streetwise live civic reporting in the existing Next.js application, integrating the merged report pipeline, authenticated personal submissions, and Stagehand v4 / Browserbase for Mountain View, Santa Clara County Roads, and Caltrans.

## Confirmed Product Contract

- Preserve the map-first mobile experience: persistent bottom navigation, draggable nearby sheet, native camera/photo selection, current-location marker, and location preview.
- Show the three original fictional map examples alongside live issues, labeled Resolved · Demo. Examples remain presentation-only, with no observation controls, live jobs or government submissions.
- Read valid EXIF GPS from the selected original photo locally before falling back to current device location. A replacement photo gets a fresh location decision; the issue preview identifies photo versus current location and allows an explicit current-location override.
- Public browsing exposes public issue information and explicitly published photos. New review consent includes publishing the photo; earlier private photos are visible only to the owner. Supabase anonymous guest sessions provide reporting without email; email login remains optional. Both identity types protect personal reports, evidence, contact information, and browser sessions with the same owner checks. Guest access belongs to the current browser and cannot be recovered after session loss; there is no shared guest account or automatic report transfer.
- Live uploads and analyses are owned by the authenticated user. Creation uses server-persisted analysis, reviewed report text, and a stable request identity; clients cannot forge analysis or claim another user's photo.
- Authority decisions use verified evidence or explicit user confirmation. Uncertain jurisdiction and duplicate candidates remain visible before preparation.
- The agent automatically selects a supported portal when persisted official maintenance evidence resolves the responsible agency. Users review the selected destination rather than choosing from a mandatory menu. Unresolved or unsupported asset ownership never defaults to Mountain View; only explicit manual overrides can replace the automatic choice.
- Implement separate Mountain View, Santa Clara County Roads, and Caltrans portal adapters. Preparation, government submission, community observations, and issue lifecycle remain distinct.
- Users can watch Browserbase, pause automation, provide corrections, take control, and resume. Final government submission requires explicit per-report confirmation of reviewed content and real evidence.
- AskMV preparation selects verified issue topics and reconciles actual fields on resume. At account obstacles, offer account replies/tracking or an explicit per-report anonymous no-response choice; anonymous reports disable tracking. Final sending still requires real-report approval.
- Government login state is persisted in private Browserbase contexts scoped to one owner and agency, reused for tracking, with a clear-login control and reauthentication on expiry. No government passwords or raw tokens enter report records.
- Government receipts and statuses require actual portal evidence. Unsupported tracking is displayed honestly; it never advances on a timer.
- Supabase persists tasks and checkpoints; Vercel runs bounded workers and scheduled recovery without an open browser or running laptop. Default status checks are daily, with manual refresh.

## Destructive and External Boundaries

- Preserve other contributors' tracked and untracked work. Database changes are additive and preserve existing records; legacy/demo records are excluded from live public reports.
- Use existing configured service accounts for necessary integration tests and deployment. Do not upgrade paid plans automatically.
- Never submit fictional civic reports. Live portal validation stops before final submission; a real send needs explicit authorization for that report.
- Missing cloud administration credentials, unavailable portal tracking, authentication challenges, and deployment limits are recorded as concrete blockers, never hidden by simulated success.

## Explicit Non-goals

Other jurisdictions, extra backend services/frameworks, an ORM, global state/query libraries, unsolicited Worklogs, and automatic account or subscription upgrades.

## Runtime and Architecture

- One Next.js App Router / TypeScript application; pnpm, Tailwind/shadcn, React local state, Mapbox/react-map-gl.
- Zod contracts, thin routes, server-only Supabase/AI Gateway/Stagehand/Browserbase clients.
- Supabase Auth verifies access tokens; service-role database access always enforces owner scope. Public DTOs exclude contact details, private photos, and browser links.
- Durable database jobs use atomic leases, checkpoints, cancellation checks, bounded attempts, and an irreversible-submit fence. Expired send attempts require reconciliation, never blind retry.
- Vercel route workers start after mutations and cron recovers pending work. Provider sessions are finite and released when no longer needed; expired sessions require preparation again.

## Acceptance Criteria

1. Pipeline failure paths preserve evidence, report database errors, and label live responses correctly.
2. Different users cannot access or operate each other's uploads, analyses, tasks, browser sessions, or receipts.
3. Live photo/report flow reaches a persistent review screen and survives refresh; reviewed content is exactly what preparation uses.
4. Each portal adapter has verified targets and a visible prepare / review / final-send boundary. Pause and takeover prevent further autonomous actions.
5. Duplicate requests and worker retries do not create duplicate issues or automatically repeat government submission.
6. Daily and manual tracking records actual evidence or explicit unavailability, independently of community status.
7. pnpm check, pnpm build, focused API/state/concurrency checks, and mobile/desktop interaction verification pass.
8. Cloud configuration, additive migrations, operator setup, and remaining external acceptance limits are documented accurately.

## Implementation Plan

1. Repair pipeline and establish live contracts, ownership, persistence, and atomic creation.
2. Add Supabase email authentication and reconcile the existing mobile UI with live APIs.
3. Implement durable jobs, portal adapters, Browserbase viewing/control, and final confirmation.
4. Add tracking, deployment/cron configuration, and cloud migration tooling.
5. Exercise failure paths, concurrency, API isolation, browser UX, and real portal preparation; complete documentation and final review.

## Status

- 2026-09-18: User explicitly confirmed the runnable collaboration skeleton scope. Directory is empty; no existing repository or changes are present. Implementation started. Latest chat role material is partly truncated by retrieval; local role documents are adaptations of available discussion and the confirmed contract, not verbatim exports.
- 2026-09-18: Implemented the single-app skeleton, shared Zod contracts, process-local demo APIs, map/list shell, independent community observations, and reviewed report preparation. Added root/role instructions, English team workflow, environment template, architecture/API docs, and CI configuration. Initialized local Git on `main` without commits or remote. No external service or government submission was invoked.
- 2026-09-18: Verification passed: lint, route/type checking, 7 domain tests, production build, 15 HTTP checks, and explicit 503 rejection of unsupported live mode. Browser validation covered desktop and 390px layouts, community state isolation, edited report persistence, and preparation results; no browser warnings/errors were captured. Real Mapbox and other external integrations remain unverified. Full evidence and tooling limitations are in `docs/validation.md`.

- 2026-09-19: User confirmed all three portals, Supabase email login, Vercel/Supabase cloud execution, daily/manual tracking, and the complete implementation scope. Read-only pipeline review found evidence consistency/retry errors, masked duplicate-query failures, model validation/error mapping, and live metadata mismatch. Existing untracked UI is preserved; current tracked skeleton has incompatible UI contracts. Browserbase key/project and existing Supabase business tables were verified read-only. Implementation started.

- 2026-09-19: Implemented owner-scoped Supabase email sessions, immutable evidence, durable live report jobs, transactional approval, explicit real-send confirmation, Browserbase viewing/pause/takeover, and three portal adapters. Added default-template PKCE magic links alongside OTP. Restored/adapted the existing map-first UI without deleting contributors' assets.
- 2026-09-19: User selected Supabase `streetwise` (`mxabmkitbmiyazvioakz`); applied base plus additive migration successfully. Configured server credentials on Vercel and deployed to https://streetwise-sigma.vercel.app. Supabase Vault/pg_cron/pg_net recover queued jobs every minute; Vercel daily cron is a fallback. No paid upgrade or government submission occurred.
- 2026-09-19: Verified 22 unit/contract tests, production build, rollback SQL ownership/concurrency checks, 17 live integration assertions locally and in production, and a separate 17-assertion cloud-scheduler recovery run. Temporary private integration records were removed. Deployed 390px map renders; sheet drag and persistent navigation passed browser checks. See `docs/deployment.md` for remaining SMTP, physical-device and real-portal acceptance limits.
- 2026-09-19: Production Browserbase recovery/control smoke passed 22 assertions: AskMV stopped before topic selection, owner-only live view was available, other-user input was blocked, and pause persisted. Test browser/session/user records were cleaned. No civic report was sent.
- 2026-09-19: User reported phone location hanging and email verification returning to signed-out UI. Confirmed the reported account was email-verified without a recorded sign-in. Added default email-fragment session exchange (including cross-browser links), explicit provider-limit/callback errors, a separate 18-second geolocation deadline, fast initial location plus precise watching, and transient-watch retention. 26 tests and local/cloud builds passed; physical-phone and cross-browser UI acceptance remain pending.
- 2026-09-19: After explicit approval, a disposable account's email-return session reached authenticated My submissions in a browser that had not initiated the login. Removed the test account afterward. User reported EMAIL_RATE_LIMIT for another address; default project-wide SMTP quota remains a delivery blocker pending custom SMTP. Image analysis has functional integration coverage only, with no labeled accuracy benchmark. Physical-phone GPS acceptance remains pending.
- 2026-09-19: User approved guest mode with optional email login. Implement anonymous Supabase sessions, retain owner isolation and final-send approval, limit guest creation, and verify two guests cannot access one another's reports or browser sessions before deployment. No existing accounts or reports are removed.
- 2026-09-19: Enabled anonymous sign-ins with explicit confirmation; Confirm email remains enabled. Deployed guest mode to https://streetwise-sigma.vercel.app (deployment 8hJVRywLjaGNZ4VqBxXVisi4jSNJ). Check/build passed, plus 26 guest integration assertions both locally and in production and an email-account preservation regression. Disposable API-test accounts/photos/reports were removed; no government portal was opened.
- 2026-09-19: User requested agent-selected government destinations. Reuse official road maintenance evidence for automatic routing, remove the unresolved Mountain View default, retain optional explicit correction and final-send approval, and derive automatic destinations on the server from persisted analysis.

- 2026-09-19: User requested an account/anonymous choice at portal obstacles and persistent government login for subsequent tracking. Implement verified AskMV topic preparation, explicit no-reply opt-out, isolated persistent browser contexts and expired-login recovery.

- 2026-09-19: User requested original issue photos on the map. Add explicit photo publication consent for new reports; preserve earlier private-photo commitments while showing owners their own photos. Cloud additive migration 0003 applied successfully.

- 2026-09-19: Deployed automatic agency routing, photo EXIF GPS priority, verified AskMV preparation with account/anonymous choice, per-user/per-agency persistent government browser contexts, and consent-aware original issue photos. Passed 38 tests, production build, rollback SQL checks, and 36 production integration assertions including cloud recovery and anonymous preparation. Real Browserbase tests verified an HttpOnly test cookie across sessions and context deletion; no government account or final civic submission was used. Disposable fixtures were cleaned.
- 2026-09-19: Fixed narrow toolbar vertical padding that displaced all children downward by 5px. Production deployment `8ttagoBkVNeBZbKRJavMdV5e5RRB` verified at 320/375/420/768px: every toolbar child has zero vertical center offset. Production alias remains https://streetwise-sigma.vercel.app.
- 2026-09-19: Restored the original pothole, street light and sidewalk examples as presentation-only resolved entries with Demo labels, original images and check badges. Production `4vKrXAhMDardt2ufbpSXWmScFsDV` verified list, marker preview, detail navigation and loaded photo; live issues remain reported. Check (38 tests) and build passed.
- 2026-09-19: Simplified mobile submission detail into photo/title, four workflow steps, concise current instruction and relevant action. Added compact editable review, grouped browser takeover/continue, and collapsed corrections/activity/login management. Deployment `7wgiVATHLeSMV9t1gFxMeV6jPK6Y` passed check (38 tests), build and 26 production integration assertions. Local-only UI fixtures verified 320/390px reflow, review edits, browser takeover/resume/pause, and explicit final-send confirmation. No government submission was performed; physical-device acceptance remains separate.
