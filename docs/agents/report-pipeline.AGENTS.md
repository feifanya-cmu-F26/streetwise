# Report Pipeline / AI Intelligence

Read the root `AGENTS.md` and `GOAL.md` first. This guide supplements them.

## Own

- `src/schemas/`, `src/lib/report/`, `src/lib/ai/`, `src/lib/geo/`, `src/lib/supabase/`, `src/lib/issues/`, and `supabase/`.
- Issue list/detail/create/analyze/confirm APIs; coordinate shared HTTP helpers and demo fixtures with consumers.
- Database schema, storage, image analysis, reverse geocoding, duplicate detection, authority resolution, report generation, and validation.

## Stack

Next.js Route Handlers, TypeScript, Zod, Supabase Postgres and Storage, optional PostGIS, Mapbox Geocoding, Vercel AI SDK / AI Gateway, configured multimodal model. Jev is optional and not a prerequisite.

## Contracts

- Zod schemas are authoritative. Coordinate breaking changes before touching consumers; update fixtures, tests, and `docs/api.md` together.
- Real upload/analysis runs through owner-scoped `/api/reports` jobs. Legacy `/api/issues/analyze` is retired; do not restore client-supplied analysis as trusted state.
- Keep `src/lib/report/analyze.ts` as orchestration, not a monolithic Route Handler.
- Use objective image evidence. Do not invent accident history, dimensions, or jurisdiction facts.
- Geographic proximity alone is not duplicate proof. Unknown authority becomes `needs_review`.
- A city address does not prove maintenance responsibility. Use deterministic jurisdiction data where possible.
- Preserve durable Supabase operations and the atomic observation trigger. Immutable evidence paths are linked during transactional report approval.
- Validate files, size limits, storage paths, and data exposure before enabling uploads. Keep secret credentials server-only.

## Boundaries

Do not redesign map UI or implement browser submission. Do not add an ORM, separate backend, or Redis. Coordinate persistent submission fields with the integration lead. Community resolution observations never mutate government status.

## Workflow

Use `feat/report-pipeline`. Ship small PRs with stable contracts. Run `pnpm check`, `pnpm build`, and local `pnpm test:smoke`. For real analysis, additionally test representative images and report which services were actually called.

## Current integration

The integration lead reviewed the pipeline and applied the base/additive migrations to the user-selected Streetwise Supabase project. Real AI, geocoding and duplicates are exercised through persisted report jobs. Authority resolution queries official Mountain View and County maintained-road layers; conflicting, unavailable or missing evidence remains `needs_review`. User confirmation is still required because nearby road ownership does not prove ownership of every asset.

Keep optional Jev/weather/traffic outside the critical path. See `docs/deployment.md` for verified services and remaining real-portal acceptance limits.
