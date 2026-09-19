# API contracts

Issue persistence is Supabase-backed and has no in-process fallback: without
`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_STORAGE_BUCKET` every
issue endpoint returns 503 rather than serving fixtures. Analysis and
government submission are still simulated.

JSON requests use `Content-Type: application/json`. Successful responses are `{ "data": ..., "meta": { "mode": "demo" | "live" } }`; errors are `{ "error": { "code": "...", "message": "..." } }`. Responses use `Cache-Control: no-store`.

| Method and path                | Request                                                | Response data       |
| ------------------------------ | ------------------------------------------------------ | ------------------- |
| `GET /api/issues`              | None                                                   | `Issue[]`           |
| `GET /api/issues/:id`          | UUID path parameter                                    | `Issue`             |
| `POST /api/issues/upload`      | `UploadRequest`                                        | `UploadResponse`    |
| `POST /api/issues/analyze`     | `AnalyzeRequest`                                       | `IssueAnalysis`     |
| `POST /api/issues`             | `{ analysis: IssueAnalysis, report: GeneratedReport }` | `Issue`, status 201 |
| `POST /api/issues/:id/confirm` | `{ kind: "still_there" \| "resolved" }`                | Updated `Issue`     |
| `POST /api/issues/:id/submit`  | `{ mode: "demo", reviewed: true }`                     | `SubmissionResult`  |

`meta.mode` in the response envelope is `"demo"` or `"live"` depending on which path served the request; it is not tied to a single global flag. Issue reads, creation, and confirmation are `"live"` because they hit the database; analysis and submission are `"demo"` because they are still simulated.

## Analyze sample

```json
{
  "mode": "demo",
  "demoIssueType": "pothole",
  "location": {
    "lat": 37.394,
    "lng": -122.081,
    "address": "Mountain View · sample location"
  }
}
```

This endpoint does not accept a photo or perform real AI analysis. Category options are `pothole`, `street_light`, `trash`, `sidewalk`, and `water_leak`.

## Live upload (contract only, not yet processed)

`POST /api/issues/upload` requests a signed Storage upload slot ahead of analysis:

```json
{ "contentType": "image/jpeg", "sizeBytes": 812345 }
```

Response:

```json
{
  "data": {
    "storagePath": "pending/<uuid>.jpg",
    "uploadUrl": "https://...supabase.co/storage/v1/...",
    "token": "..."
  },
  "meta": { "mode": "live" }
}
```

The client PUTs the file to `uploadUrl`, then calls `POST /api/issues/analyze` with `{ "mode": "live", "storagePath": "...", "location": {...} }`. That request validates today, but `analyzeIssue` currently rejects it with a 501 `LIVE_ANALYSIS_NOT_IMPLEMENTED` error — vision analysis, geocoding, duplicate detection, and authority resolution are not wired up yet (`docs/agents/report-pipeline.AGENTS.md` Next work #2-4). Requires `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_STORAGE_BUCKET`; without them the upload endpoint returns 503 `SERVICE_NOT_CONFIGURED`. The underlying table/bucket migration is a draft pending review (`supabase/migrations/0001_init.sql`).

Requesting a slot also inserts an `evidence` row, so every issued path is tracked before a file exists at it.

Agreed rules behind this contract:

- **Validation.** `sizeBytes` and `contentType` in the request are client claims used for early rejection only. The bucket's `file_size_limit` (10 MB) and `allowed_mime_types` (`image/jpeg`, `image/png`, `image/webp`) are the enforcement a client cannot bypass.
- **Path lifecycle.** Issued paths start under `pending/`. Analysis is responsible for promoting a path once it belongs to a real issue; unpromoted `pending/` objects are garbage and may be swept. Nothing promotes or sweeps them yet.
- **Reads.** The bucket is private and `issues.image_path` stores a Storage path, not a link. `Issue.imageUrl` in API responses is a signed read URL generated at read time, so it is short-lived and must not be persisted by clients. Generating it is part of the persistence work, so `imageUrl` is still always `null` today.

## Review and creation

Preserve the analysis object, edit `generatedReport.title` and `generatedReport.description`, then send the edited report separately as `report` to `POST /api/issues`. Its category must match the analysis. A positive duplicate decision is rejected with 409 rather than silently producing a new issue.

Creation still trusts the caller-supplied analysis, which real creation must replace with persisted server analysis or equivalent verification. Until then `analysis.imagePath` is treated as an untrusted claim: it is only accepted if it names an evidence slot this server issued that no issue has claimed, otherwise the request is rejected with 400 `EVIDENCE_NOT_AVAILABLE` before anything is written. Severity, authority, and duplicate fields are still taken on trust.

## Community and submission

Confirmation only increments the selected observation count. It does not resolve the issue, update government status, or submit another report.

The submit endpoint validates `reviewed: true` and returns:

```json
{
  "data": {
    "mode": "demo",
    "issueId": "00000000-0000-4000-8000-000000000001",
    "status": "prepared",
    "submittedToGovernment": false,
    "message": "Demo report prepared. No browser session was opened and nothing was sent to a government agency."
  },
  "meta": { "mode": "demo" }
}
```

Repeating preparation does not create an issue or change stored government status. Creation and preparation are separate calls; the review UI retains the created ID on a preparation failure so it can retry without creating another issue. Page reload loses that client retry state. Durable idempotency is future work.

## Error status codes

- 400: malformed JSON, invalid coordinates, invalid UUID, unsupported enum, missing review, or wrong request shape.
- 400: also `EVIDENCE_NOT_AVAILABLE` when `analysis.imagePath` is not an unclaimed slot this server issued.
- 404: issue missing in the database.
- 409: positive duplicate decision on creation.
- 415: request is not JSON.
- 501: `LIVE_ANALYSIS_NOT_IMPLEMENTED` — the live analyze request shape is valid but not processed yet.
- 502: `DATABASE_ERROR`, `STORAGE_SIGN_FAILED`, `EVIDENCE_RECORD_FAILED`, or `EVIDENCE_PROMOTE_FAILED` — Supabase rejected a query, the signed upload URL request, the evidence insert, or the move out of `pending/`.
- 503: `STREETWISE_MODE` is not `demo` (analysis and submission), or `SERVICE_NOT_CONFIGURED` (missing Supabase env vars, which every issue endpoint needs).
- 500: unexpected internal failure; no internal exception details are returned to the client.

Authoritative definitions: `src/schemas/`. Do not copy independent client interfaces from this document.
