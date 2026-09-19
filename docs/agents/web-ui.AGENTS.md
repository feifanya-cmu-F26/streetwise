# Web UI / Map Experience

Read the root `AGENTS.md` and `GOAL.md` first. This guide supplements them.

## Own

- `src/components/map/` and `src/components/issue/`.
- Map rendering and markers, selection, issue details, desktop side panel, mobile presentation, and community observation controls.
- Loading, empty, failure, keyboard, touch, and responsive states.

## Stack

Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, react-map-gl, Mapbox GL JS, shared Zod types, plain fetch.

## Contracts

- Import types from `src/schemas/`; do not create parallel frontend domain types.
- Read `docs/api.md`. Use `GET /api/issues` and `POST /api/issues/:id/confirm`.
- Start against the working demo API. Component interfaces must survive replacement of demo storage with Supabase.
- Keep the map dominant. Selecting a marker reveals details without leaving the map.
- Show issue progress, government status, and community observations separately.
- Missing Mapbox configuration must leave the list and detail flow usable.
- Do not label fictional data as live reports or community observations as government verification.

## Boundaries

Do not change database schema, AI logic, authority resolution, or submission automation. Coordinate shared schema changes with the pipeline owner and integration lead. Coordinate root page composition and shared primitives with the integration lead.

## Workflow

Use `feat/map-experience`; integrate small increments through PRs. Run `pnpm check` and `pnpm build`, then verify marker/list selection, details, both confirmation buttons, desktop, and narrow-screen behavior. Mapbox rendering requires a token; report whether it was actually tested.

## Next work

1. Refine the mobile detail experience and final visual direction.
2. Validate the real Mapbox basemap and markers with a team token.
3. Improve status visualization and photo evidence display when the pipeline provides it.
4. Add filters or clustering only after the core flow is reliable.
