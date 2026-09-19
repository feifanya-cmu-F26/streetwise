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
- The existing analyze endpoint is explicitly simulated. Define the real upload/analysis request before connecting Storage or a model; do not pass mock output off as vision analysis.
- Keep `src/lib/report/analyze.ts` as orchestration, not a monolithic Route Handler.
- Use objective image evidence. Do not invent accident history, dimensions, or jurisdiction facts.
- Geographic proximity alone is not duplicate proof. Unknown authority becomes `needs_review`.
- A city address does not prove maintenance responsibility. Use deterministic jurisdiction data where possible.
- Replace the repository boundary with durable Supabase operations. Community increments must be atomic in the real database.
- Validate files, size limits, storage paths, and data exposure before enabling uploads. Keep secret credentials server-only.

## Boundaries

Do not redesign map UI or implement browser submission. Do not add an ORM, separate backend, or Redis. Coordinate persistent submission fields with the integration lead. Community resolution observations never mutate government status.

## Workflow

Use `feat/report-pipeline`. Ship small PRs with stable contracts. Run `pnpm check`, `pnpm build`, and local `pnpm test:smoke`. For real analysis, additionally test representative images and report which services were actually called.

## Next work

1. ~~Agree real upload and analysis contracts; add a Supabase migration and Storage policies.~~ Done in code and verified against a disposable project; the migration still needs integration-lead review.
2. ~~Implement persistence and atomic observations behind the repository boundary.~~ Done: Supabase is the only implementation, observations insert and a trigger keeps the counters atomic.
3. Connect image analysis, reverse geocoding, authority rules, and report generation. Until this lands, `analyze` still returns demo output and `mode: "live"` returns 501.
4. Add duplicate candidate lookup; use PostGIS if straightforward, otherwise Haversine.
5. Keep optional Jev/weather/traffic outside the critical path.
