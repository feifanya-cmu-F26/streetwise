# Live deployment and operations

## Current resources

- App: https://streetwise-sigma.vercel.app
- Latest deployment: `7wgiVATHLeSMV9t1gFxMeV6jPK6Y` (2026-09-19), simplifying mobile submission detail while retaining explicit send approval.
- Vercel: `feifan-yangs-projects/streetwise`, project `prj_twTs6XXyx3kmLyalXyA7rPLJfHPU` (Hobby).
- Supabase: `streetwise`, project `mxabmkitbmiyazvioakz`, West US. The prior `test` project was not modified.
- Browserbase: existing Production project; identifier is in server environment configuration.
- Deployment is a CLI upload of the working tree. These integration changes have not been committed/pushed; Git deployment is not configured.

All service keys are server-only except the public Mapbox token. Local `.env.local` and Vercel environment contain the actual values; do not copy keys into docs, commits or client bundles. `.vercelignore` excludes local environments/builds and test/design artifacts.

## Supabase setup

Enable **Authentication → Sign In / Providers → Allow anonymous sign-ins** for guest access; keep Confirm email enabled for optional email accounts. Guest creation is an explicit same-origin action, reuses an existing session, and is limited to 20 new sessions per client IP/hour on Vercel plus 200/project/hour. Other hosts use one shared local bucket rather than trusting forwarded headers. Supabase's own anonymous-signup limits also apply. Existing owner checks and private table grants remain unchanged. Guest records cannot be recovered on another device or after clearing cookies; account linking/report migration is not implemented. The UI omits guest sign-out to avoid accidental loss.

Apply `0001_init.sql` followed by `0002_live_integration.sql` and `0003_government_connections.sql` for an empty project. The second migration is additive and repeatable; it retains old issues with `is_demo=true`. All three were executed successfully on this Streetwise cloud project. RLS is enabled; private task/event tables have no anon/authenticated client grants. The private bucket allows JPEG/PNG/WebP up to 10 MB.

Authentication Site URL is `https://streetwise-sigma.vercel.app`; allowed callback is `https://streetwise-sigma.vercel.app/auth/callback**` (the suffix accommodates Supabase's PKCE flow query parameter). Keep callback hosts narrow. Local login links need a separately configured localhost callback if used.

The current free project uses the default magic-link email template. The app supports default-template email link fragments and email codes. Email-return tokens are removed from browser history immediately, validated against Supabase, and exchanged for HttpOnly cookies. New links work when opened in a different browser. The earlier PKCE callback remains for outstanding old links; those old links still require the original browser. Supabase's default SMTP sends only to organization members and currently has a two-email/hour limit; public email signup requires custom SMTP. Guest access sends no email and is unaffected by this quota. Do not disable email verification to bypass delivery limits. Once SMTP is configured, a template containing `{{ .Token }}` enables the code entry flow. See [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp) and [PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).

## Durable scheduling

`supabase/schedule-live.sql` installs `pg_cron` and `pg_net`. Supabase Vault holds `streetwise_app_url` and `streetwise_cron_secret`; the latter matches Vercel `CRON_SECRET`. The enabled `streetwise-worker` runs every minute and calls the HTTPS worker only when due work exists. A daily Vercel cron at 09:00 UTC is a fallback. Pending jobs and daily tracking therefore continue without a browser or laptop.

Default tracking interval is 24 hours after submission/check. An unavailable receipt link stops automatic tracking for that report and shows an explicit message. Manual tracking remains available. Workers have bounded attempts and leases. Never manually reset an uncertain/submitting task to queued_submit; reconcile the actual portal receipt first.

To inspect scheduling (no secrets):

```sql
select jobname, schedule, active from cron.job where jobname='streetwise-worker';
select status, return_message, start_time, end_time from cron.job_run_details order by runid desc limit 5;
select status_code, error_msg, created from net._http_response order by id desc limit 5;
```

## Validation and external limits

- Local check/build passed (38 unit/contract tests); production Vercel build succeeded.
- Guest-mode deployment `8hJVRywLjaGNZ4VqBxXVisi4jSNJ` passed 26 live assertions locally and in production: independent anonymous accounts, session persistence/reuse, cross-origin rejection, upload/report/browser isolation, real AI review, and final-send rejection. Optional email login and preservation of existing email accounts were separately checked. Disposable API fixtures were cleaned.
- An authorized disposable-account browser probe verified email-fragment return to authenticated My submissions in a browser that did not initiate login; the test user was deleted afterward. This validates session handoff, not email delivery. Default SMTP quota still blocks repeated/new-address sign-in emails until custom SMTP is configured.
- Real Supabase uploads, AI Gateway analysis, persisted review, idempotent creation, owner isolation, private photo access and final-send rejection passed 17 assertions locally and in production.
- Image-analysis checks establish functional integration only. No labeled, representative photo benchmark has been run; do not report these checks as classification accuracy or factual reliability.
- A separate production run inserted a queued task without invoking an app worker. Supabase scheduling picked it up and reached review; the same 17 assertions passed. Each test run removed only its own temporary private users/photo/task records.
- Rollback-only PostgreSQL tests cover atomic approval/evidence linking, ownership, duplicate approval, concurrent claims, pause, expired-send reconciliation and RPC/table grants.
- Browserbase/Stagehand read-only probe opened all three official portal pages and verified extraction/live-view availability. A 22-assertion production integration run also recovered an AskMV preparation task, stopped at topic selection, obtained the owner-only live view, rejected another user's keyboard input, and persisted pause. No fictional form was submitted.
- At 390px the deployed basemap renders, the nearby sheet expands by dragging, and main navigation preserves the expanded sheet. Location now has an independent 18-second deadline, fast initial fix, precise watch, and remembered-denial handling. Tests cover browsers that never invoke callbacks. Real iPhone camera/GPS permissions and remote mobile browser typing still need physical-device acceptance.
- Mountain View account login (or explicit anonymous/no-response choice), County login/final send, and Caltrans map/CAPTCHA/required personal inputs remain human steps. No real final submission or government status transition has been validated because no real report was authorized.
- Browserbase's mobile live viewer does not reliably surface a keyboard. The takeover UI provides explicit text forwarding to the selected portal field, under an owner-scoped lease; it cannot click, submit or navigate. Text is not persisted in Streetwise. Passwords/portal session handling remain subject to the browser provider's own session behavior.

Useful official sources: [AskMV](https://www.mountainview.gov/askmv), [County Roads service requests](https://roads.santaclaracounty.gov/services/service-requests/report-potholes-graffiti-illegal-dumping-county-maintained-roads), [Caltrans](https://csr.dot.ca.gov/), [Browserbase live view](https://docs.browserbase.com/platform/browser/observability/session-live-view).

### 2026-09-19 portal and photo update

- AskMV selects verified topic/subtopics before disabled fields are filled, retains user corrections on resume, and attaches the evidence photo. Account obstacles offer replies/tracking or explicit anonymous/no-response. An actual CAPTCHA still requires the user; final-send authorization remains separate.
- Government connections store only provider context/session identifiers, keyed by user and agency, in a service-only table. Browserbase [Contexts](https://docs.browserbase.com/platform/browser/core-features/contexts) encrypt and retain the browser profile. Save login & close browser releases the active session; Clear government login deletes its saved context. A live form blocks other tasks for that agency until it is closed or expires. Pre-update browsers were created without contexts and require a new login after they end.
- Real service probe passed topic/description/location/photo preparation, anonymous selection without Submit, competing-task exclusion, an HttpOnly test cookie surviving a fresh session, and clearing the saved context. These checks verify persistence infrastructure; no real government account credentials or successful government submissions were used. Login expiry still requires human participation.
- Migration 0003 preserves all records and defaults prior photos to private. New approval explicitly consents to photo publication; map preview/list/detail use signed URLs. Private prior photos are visible to their owners. Raw contacts, context IDs and tokens remain absent from public issues.
- Auto agency routing and original-photo EXIF GPS priority were deployed in `3yMCa9YZCjGfLZxXfSfVQ3cGw2kB`; official road-record samples for all three agencies and an actual browser upload with known EXIF coordinates passed.
- The portal/context/photo release passed 36 production assertions: guest persistence and isolation, private photo access, real analysis, cloud task recovery, owner-only browser access, explicit anonymous selection reaching ready without submission, disabled anonymous tracking, and persistent pause. Disposable accounts, evidence, tasks and provider contexts were cleaned.
- Narrow toolbar alignment was measured on production before and after the CSS correction: children were 5px below center at 375px; all children are now centered at 320/375/420/768px. Local check/build and the final Vercel build passed. Temporary browser viewport overrides were reset after verification.
