# API contracts

All current endpoints operate in demo mode. JSON requests use `Content-Type: application/json`. Successful responses are `{ "data": ..., "meta": { "mode": "demo" } }`; errors are `{ "error": { "code": "...", "message": "..." } }`. Responses use `Cache-Control: no-store`.

| Method and path                | Request                                                | Response data       |
| ------------------------------ | ------------------------------------------------------ | ------------------- |
| `GET /api/issues`              | None                                                   | `Issue[]`           |
| `GET /api/issues/:id`          | UUID path parameter                                    | `Issue`             |
| `POST /api/issues/analyze`     | `AnalyzeRequest`                                       | `IssueAnalysis`     |
| `POST /api/issues`             | `{ analysis: IssueAnalysis, report: GeneratedReport }` | `Issue`, status 201 |
| `POST /api/issues/:id/confirm` | `{ kind: "still_there" \| "resolved" }`                | Updated `Issue`     |
| `POST /api/issues/:id/submit`  | `{ mode: "demo", reviewed: true }`                     | `SubmissionResult`  |

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

This endpoint does not accept a photo or perform real AI analysis. A live upload contract must be coordinated before replacing this behavior. Category options are `pothole`, `street_light`, `trash`, `sidewalk`, and `water_leak`.

## Review and creation

Preserve the analysis object, edit `generatedReport.title` and `generatedReport.description`, then send the edited report separately as `report` to `POST /api/issues`. Its category must match the analysis. A positive duplicate decision is rejected with 409 rather than silently producing a new issue. The caller-supplied analysis is trusted only for this local demo; real creation must use persisted server analysis or equivalent verification.

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
- 404: issue missing in the current process (including after a restart).
- 409: positive duplicate decision on creation.
- 415: request is not JSON.
- 503: `STREETWISE_MODE` is not `demo`.
- 500: unexpected internal failure; no internal exception details are returned to the client.

Authoritative definitions: `src/schemas/`. Do not copy independent client interfaces from this document.
