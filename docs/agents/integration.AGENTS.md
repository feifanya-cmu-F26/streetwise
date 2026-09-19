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
- Live report APIs live under `/api/reports`; legacy create/analyze/submit paths return 410. Persist report review before portal preparation.
- Maintain the three authorized portal adapters in `src/lib/submission/browser.ts`; County final submission remains a human takeover step.
- Stagehand v4 and Browserbase are installed. Never ship a dummy browser action as a live success.
- Separate form preparation from irreversible final submission. Never send fictional reports to real government services.
- Unknown authority, uncertain duplicates, and missing evidence must be visible in review before any future live path.
- Persist actual government receipt IDs only when supported by a real response. Community observations remain independent.

## Boundaries

Coordinate schema changes with the pipeline owner; coordinate map UX changes with the map owner. Do not replace the agreed stack or rewrite another lane for stylistic consistency.

## Workflow

Use `feat/submission-flow`. Keep `main` runnable; integrate small PRs early. Run `pnpm check`, `pnpm build`, and `pnpm test:smoke`, then exercise the complete live flow on desktop and mobile. Deployments and service integration are authorized by GOAL.md; final government sends require approval of the specific real report.

## Current acceptance boundaries

The live application is deployed; see `docs/deployment.md`. Real service and isolation checks must use disposable private test data and stop before government submission. Preserve the irreversible-send fence, owner scope, checkpoint recovery, and explicit unsupported-tracking state. Portal login/CAPTCHA and real receipt acceptance require user participation; never report them as tested from a read-only portal probe.
