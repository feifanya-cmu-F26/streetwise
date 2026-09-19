# Streetwise

A runnable collaboration skeleton for a three-person civic reporting hackathon. Browse fictional neighborhood issues, add sample community observations, and walk through simulated analysis → editable review → demo report preparation.

**No government report is sent. No cloud account or secret is required to run the demo.**

## Start

Use Node.js 24 (recommended; minimum 22.13) and pnpm 11.7.0. Install that pnpm version if needed with `npm install --global pnpm@11.7.0`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [localhost:3000](http://localhost:3000). For a production build locally:

```sh
pnpm build
pnpm start
```

The dependency lockfile is committed as a project file; use pnpm only. `pnpm-workspace.yaml` contains pnpm build-script approvals, not a monorepo configuration.

## Optional configuration

```sh
cp .env.example .env.local
```

Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` to a public Mapbox token and restart the dev server to enable the real basemap. Without it, the placeholder, issue list, details, observations, and report flow still work. In a production build, public environment variables are baked in at build time.

All other environment variables are future integration seams. Adding credentials does not enable live services. `STREETWISE_MODE` defaults to `demo`; unsupported modes fail explicitly.

## Team entry points

| Role                               | Start here                                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Everyone                           | [AGENTS.md](AGENTS.md), [GOAL.md](GOAL.md), [team workflow](docs/team-workflow.md)                        |
| Web UI / Map                       | [role guide](docs/agents/web-ui.AGENTS.md), `src/components/map/`, `src/components/issue/`                |
| Report Pipeline                    | [role guide](docs/agents/report-pipeline.AGENTS.md), `src/schemas/`, `src/lib/report/`, `src/lib/issues/` |
| Product / Submission / Integration | [role guide](docs/agents/integration.AGENTS.md), `src/components/report/`, `src/lib/submission/`          |

Read [architecture](docs/architecture.md) and [API contracts](docs/api.md) before changing shared interfaces. All TypeScript domain types derive from Zod schemas.

## Checks

```sh
pnpm check
pnpm build
```

With a local server already running:

```sh
pnpm test:smoke
```

For a different port in Fish:

```fish
env STREETWISE_TEST_URL=http://localhost:3100 pnpm test:smoke
```

Smoke checks create one in-memory sample issue and observation. Restart the server to restore seed data. Contract tests cover coordinate validation, separate community/government state, reviewed text, duplicate guards, and safe repeatable preparation.

See [validation results and unverified integrations](docs/validation.md) for the setup acceptance record.

## What is implemented

- Next.js, React, TypeScript, Tailwind, local shadcn-style Button, optional react-map-gl / Mapbox canvas.
- Shared schemas, validated fixtures, structured API errors, process-local demo repository.
- List/details, community observations, sample analysis, report editing, creation, and preparation.
- Server-only Supabase and AI Gateway configuration factories, explicit unimplemented geo/browser boundaries.
- Team ownership, environment template, checks, and GitHub CI configuration.

## What remains

Real uploads, AI analysis, verified jurisdiction/duplicate decisions, Supabase persistence/policies, Stagehand/Browserbase automation, auth/abuse controls, government status tracking, and final visual design belong to subsequent team work. Stagehand is selected but intentionally not installed until its adapter is implemented.

The demo repository exists only in one Node process, resets on restart, and is unsuitable for shared serverless persistence. Repeated anonymous observations are allowed. All issues and analysis are fictional; the map token does not make them real.

A local Git repository is initialized on `main`, with no commits or remote configured. No remote GitHub repository, Vercel deployment, or cloud resource is created by this setup.
