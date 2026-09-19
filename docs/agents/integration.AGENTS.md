# Product / Submission / Integration Lead

Read the root `AGENTS.md` and `GOAL.md` first. This guide supplements them.

## Own

- Product flow, shared-contract coordination, review experience, submission preparation, integration, and demo reliability.
- Page/layout composition in `src/app/`, `src/components/report/`, shared `src/components/ui/`, `src/lib/submission/`, and `POST /api/issues/:id/submit`.
- Root configuration, environment template, CI, team workflow, and deployment coordination.

## Stack

Next.js, TypeScript, Zod, Tailwind/shadcn, Stagehand v4 / Browserbase, Supabase integration, GitHub, and Vercel. Use AI SDK and Mapbox only as needed for integration.

## Contracts

- Keep the review step between analysis and preparation. Reviewed text must be the text subsequently used.
- The current submit endpoint is demo-only and never opens a browser. Its `prepared` result does not change government submission state.
- Implement one reliable authority adapter before broadening support. `src/lib/submission/browser.ts` is the deliberate unimplemented boundary.
- Stagehand is selected but not installed in this skeleton. Add a verified compatible v4 release when implementing the real adapter; never ship a dummy browser action as a live success.
- Separate form preparation from irreversible final submission. Never send fictional reports to real government services.
- Unknown authority, uncertain duplicates, and missing evidence must be visible in review before any future live path.
- Persist actual government receipt IDs only when supported by a real response. Community observations remain independent.

## Boundaries

Coordinate schema changes with the pipeline owner; coordinate map UX changes with the map owner. Do not replace the agreed stack or rewrite another lane for stylistic consistency.

## Workflow

Use `feat/submission-flow`. Keep `main` runnable; integrate small PRs early. Run `pnpm check`, `pnpm build`, and `pnpm test:smoke`, then exercise the complete demo flow on desktop and mobile. Real deployments and external submissions require the applicable authorization; they are outside the initial skeleton scope.

## Next work

1. Align the final review UX and real analysis contract with teammates.
2. Inspect one real portal, implement safe form preparation, and expose its Browserbase session for review.
3. Add submission persistence, retries, and status tracking based on actual receipts.
4. Configure GitHub/Vercel after the repository and environment are ready.
5. Stabilize a short end-to-end demo and its fallback behavior.
