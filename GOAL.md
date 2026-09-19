# Goal

Create a runnable Streetwise collaboration skeleton for a three-person hackathon team. The application demonstrates civic issue browsing, community confirmation, and report review with explicit mock behavior, while providing clear seams for real integrations.

## Confirmed Product Contract

- The home experience is map-first, with an issue list and selected issue details. Without a Mapbox token, an honest placeholder and the issue list remain usable.
- Users can record a simulated `still_there` or `resolved` observation. Community observations do not change government status or create submissions.
- A report flow demonstrates simulated analysis, editable report review, local issue creation, and simulated preparation. It never claims a government report was sent.
- Shared Zod schemas in `src/schemas/` are the single source of truth for API payloads, fixtures, and inferred TypeScript types.
- The skeleton runs and builds without credentials. External integrations are explicit extension points, not hidden fallbacks pretending to be live services.
- Team documentation is concise English and assigns ownership to Web UI / Map, Report Pipeline, and Product / Submission / Integration.

## Runtime and Architecture

- One Next.js App Router application, TypeScript, pnpm, Tailwind CSS, and shadcn/ui primitives.
- React local state and plain fetch; react-map-gl with Mapbox GL JS for a configured map.
- Thin Next.js Route Handlers delegate to report, issue repository, and submission modules.
- Supabase Postgres/Storage, Mapbox Geocoding, Vercel AI SDK / AI Gateway, and Stagehand / Browserbase remain the selected integrations. Credentials and adapter boundaries are documented; real service calls are outside this stage.
- Demo data lives only in the current server process. It is not durable or shared across serverless instances; production persistence belongs to the Report Pipeline owner.
- No separate backend, monorepo, ORM, global state library, or query library.

## Destructive and External Boundaries

- The project starts in an empty directory, with no existing Git repository or user files to replace.
- No remote repository creation, push, deployment, cloud database migration, or government submission occurs in this stage.
- No existing credentials are read or copied into the repository.

## Explicit Non-goals

Real vision analysis, durable uploads, database persistence, jurisdiction verification, government form automation, authentication, full visual design, Jev, weather/news/traffic, and production abuse prevention are not part of this skeleton.

## Acceptance Criteria

1. A teammate can install with the pinned pnpm version and run the application without environment secrets.
2. Seed issues pass shared schemas; browsing, details, and simulated community observations work.
3. Simulated analysis, editable review, creation, and preparation work through documented HTTP contracts.
4. Invalid requests return consistent structured errors; unsupported live mode fails explicitly.
5. Government submission status never advances because of a community observation or demo preparation.
6. Type checking, lint, production build, and focused contract/API checks pass; desktop and narrow-screen UI receive browser validation.
7. README, architecture/API documentation, environment template, root agent instructions, and three role documents make the handoff actionable.

## Implementation Plan

1. Establish project configuration, shared contracts, and team instructions.
2. Implement schema-validated fixtures, demo repository, thin API routes, and integration seams.
3. Add the map/list shell, issue details, confirmation controls, and report review flow.
4. Verify contracts, HTTP behavior, build, and browser interactions; document results and limitations.

## Status

- 2026-09-18: User explicitly confirmed the runnable collaboration skeleton scope. Directory is empty; no existing repository or changes are present. Implementation started. Latest chat role material is partly truncated by retrieval; local role documents are adaptations of available discussion and the confirmed contract, not verbatim exports.
- 2026-09-18: Implemented the single-app skeleton, shared Zod contracts, process-local demo APIs, map/list shell, independent community observations, and reviewed report preparation. Added root/role instructions, English team workflow, environment template, architecture/API docs, and CI configuration. Initialized local Git on `main` without commits or remote. No external service or government submission was invoked.
- 2026-09-18: Verification passed: lint, route/type checking, 7 domain tests, production build, 15 HTTP checks, and explicit 503 rejection of unsupported live mode. Browser validation covered desktop and 390px layouts, community state isolation, edited report persistence, and preparation results; no browser warnings/errors were captured. Real Mapbox and other external integrations remain unverified. Full evidence and tooling limitations are in `docs/validation.md`.
