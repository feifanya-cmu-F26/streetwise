# Streetwise

Read `GOAL.md`, `docs/architecture.md`, and your role document under `docs/agents/` before substantial work. This is one full-stack Next.js application for a three-person hackathon team.

## Shared rules

- Use pnpm, Next.js App Router, TypeScript, Tailwind, shadcn/ui, react-map-gl / Mapbox, Supabase, Zod, AI SDK / AI Gateway, and Stagehand / Browserbase as specified in the goal.
- Do not add another backend, ORM, global state library, query library, or UI/map framework.
- `src/schemas/` is the contract source. Infer types from Zod; coordinate changes with the pipeline owner and integration lead before updating consumers.
- Keep routes thin. Server secrets and external service clients belong in server-only modules, never client components.
- Keep demo behavior explicit. Never silently substitute demo data for failing live services.
- Community observations, issue lifecycle, and government submission status are separate concepts. Confirmation cannot submit a report or mark a government request resolved.
- No fake civic reports may be submitted to government services. Browser integration must stop at final submission until explicitly authorized for a real report.
- Preserve other contributors' work. Inspect Git status when a repository exists and keep changes within your responsibility.
- Before handoff run `pnpm check` and `pnpm build`; exercise the affected interaction. Update documentation when contracts change.
- Do not create Worklogs or other external notes unless requested.

## Ownership

| Owner                              | Primary paths                                                                                                                                   | Role guide                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Web UI / Map                       | `src/components/map/`, `src/components/issue/`                                                                                                  | `docs/agents/web-ui.AGENTS.md`          |
| Report Pipeline                    | `src/schemas/`, `src/lib/ai/`, `src/lib/geo/`, `src/lib/supabase/`, `src/lib/issues/`, `src/lib/report/`, `supabase/`; issue APIs except submit | `docs/agents/report-pipeline.AGENTS.md` |
| Product / Submission / Integration | `src/app/` page composition, `src/components/report/`, `src/lib/submission/`, submit API, root configuration and shared UI primitives           | `docs/agents/integration.AGENTS.md`     |

`src/lib/demo/`, environment declarations, fixtures, and API documentation require coordination when another lane consumes them. Role guides supplement this file; do not replace the root instructions per branch.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
