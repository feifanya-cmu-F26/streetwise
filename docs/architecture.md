# Architecture

One Next.js app serves React pages and Route Handlers. Zod schemas connect all three ownership lanes.

```text
Map / issue UI                       Report review UI
        |                                   |
        +------------- plain fetch ---------+
                              |
                     Next.js Route Handlers
                        /       |       \
             Issue repository  Analyze  Submission preparation
                     |           |                |
              Demo repository  Demo analysis  Demo result
                     |           |                |
              [future Supabase] |       [future Stagehand / Browserbase]
                                 |
                  [future Storage → Vision → Geo → Duplicate → Authority → Report]
```

## Directory map

```text
src/
  app/                 Pages, layout, thin API routes
  components/
    map/               Map/list shell and optional real Mapbox canvas
    issue/             Details and community observations
    report/            Sample input, editable review, preparation result
    ui/                Locally owned shadcn-style primitives
  schemas/             Domain, request, and response contracts
  lib/
    api/               HTTP errors, route helpers, validated fetch
    demo/              Fixtures, pure demo analysis, repository factory
    issues/            Repository selection and shared display labels
    report/            Analysis orchestration boundary
    ai/                AI Gateway model configuration seam
    geo/               Explicitly unimplemented live geo boundaries
    supabase/          Server-only client factory, not called in demo
    submission/        Demo preparation and future browser boundary
    env.ts             Server-only configuration checks
supabase/              Database handoff, no applied migration
tests/                 Contract and domain-behavior tests
scripts/               Local HTTP smoke checks
docs/agents/           Three role guides
```

## State semantics

- `Issue.status`: internal issue lifecycle.
- `Issue.community`: observation counts and last observation time. Repeated anonymous clicks are allowed in this local skeleton; this is not a verified voter count or production anti-abuse system.
- `Issue.submission`: government status and actual external receipt metadata. All demo issues remain `not_submitted`.
- `SubmissionResult.status = prepared`: a result of simulated preparation, not a government status.
- `IssueAnalysis.mode = demo`: explicit provenance for simulated analysis. Live model output needs a deliberate contract extension.

## Demo behavior and limitations

The process-local repository is kept on `globalThis` to survive ordinary module reuse. It resets when the process restarts and is not shared among instances. Local `next dev` / `next start` is the acceptance environment. A serverless preview may lose newly created issues between invocations; connect Supabase before relying on shared preview state.

Demo analysis copies the selected category/location, generates sample prose, always reports `needs_review` authority, and performs no image, geocoding, or duplicate lookup. `isDuplicate: false` with zero confidence is a placeholder decision, not evidence of uniqueness; the review UI says so. A supplied positive duplicate decision blocks creation as a contract guard.

The Mapbox canvas is the only optional live integration in the UI. A public map token enables a real basemap with fictional markers; absence leaves the issue list usable. A bad token displays a load error. No server key belongs in a `NEXT_PUBLIC_` variable.

Only `STREETWISE_MODE=demo` is implemented. Any other mode returns a structured 503 from service-backed endpoints; it never silently falls back to mock data. Configuring service credentials alone does not call a service. Geo and browser placeholders throw explicit 501 errors if invoked.

No authentication, rate limiting, durable idempotency, file processing, background queue, or government status polling is implemented. Define those when extending the corresponding real workflow; the skeleton is not ready for public reporting.

## Integration sequence

1. Pipeline owner defines live photo upload/analysis contracts, Supabase tables, Storage policies, and atomic observation updates.
2. Replace the repository boundary and keep response schemas stable where possible. If real operations become async, update Route Handler awaits together.
3. Implement analysis orchestration and verify jurisdiction data, uncertainty, and duplicate decisions with representative inputs.
4. Integration lead installs the selected Stagehand v4 SDK, implements one portal adapter, and adds a distinct live preparation result containing session/review information.
5. Retain explicit user review before irreversible submission; store receipts only after an actual successful submission.

## Source decisions and verification references

This skeleton adapts the latest stack and role decisions in the referenced “Hackathon Idea Local Ripple” conversation and the scope explicitly confirmed in this task. The latest third role document was truncated by conversation retrieval. The local role documents are concise adaptations, not byte-for-byte exports; earlier suggestions such as `src/types/` were superseded by shared Zod schemas.

Implementation references checked during setup:

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [react-map-gl getting started](https://visgl.github.io/react-map-gl/docs/get-started)
- [shadcn manual installation](https://ui.shadcn.com/docs/installation/manual)

Dependency compatibility is captured by `package.json` and `pnpm-lock.yaml`. TypeScript is pinned to 5.9.3 because the inspected typescript-eslint peer range excludes TypeScript 7. ESLint is pinned to 9.39.5 because Next's installed React/import/accessibility plugins do not support ESLint 10 (a trial produced a rule-loading failure). The registry marks ESLint 9 deprecated; upgrade the coordinated lint stack when the plugins support ESLint 10 rather than overriding their peer constraints. Stagehand is an agreed future integration, not an installed runtime dependency.
