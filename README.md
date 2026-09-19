# Streetwise

Map-first civic reporting: photograph an issue, review the AI report and agency, prepare an official portal form, watch or take over the browser, approve a real submission, and follow verified government status.

Live deployment: https://streetwise-sigma.vercel.app

## Development

Use Node.js 24 (minimum 22.18) and pnpm 11.7.0.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Fill the existing service credentials, then:
pnpm dev
```

The application requires Supabase, AI Gateway and Browserbase server credentials. The public Mapbox token enables the basemap. Apply the two SQL migrations to a new project in order; existing projects use the additive second migration. Never replace a working `.env.local` with the template.

Enable Supabase anonymous sign-ins for the default **Continue as guest** entry. Each browser keeps its own private reports; email login is optional. Guest records cannot be recovered after losing the browser session. Run `STREETWISE_TEST_GUEST=1 pnpm test:smoke <app-url>` to exercise guest creation, session reuse and report/browser isolation using disposable data.

## Verify

```sh
pnpm check
pnpm build
pnpm start
pnpm test:smoke
```

`test:smoke` uses two disposable private test accounts and an image fixture, validates real uploads/AI/owner isolation, then removes only its own test records. It never approves a report or opens a government form. Set `STREETWISE_TEST_URL` for another origin. Set `STREETWISE_TEST_CRON=1` to queue directly and validate cloud recovery instead of mutation-triggered execution. `tests/sql/live.sql` is a rollback-only concurrency/state test for a disposable PostgreSQL instance with the schema installed.

## Team entry points

Read [AGENTS.md](AGENTS.md), [GOAL.md](GOAL.md), [architecture](docs/architecture.md), [API contracts](docs/api.md), and your [role guide](docs/agents/). [Deployment notes](docs/deployment.md) document authentication, environment, scheduling and remaining portal acceptance limits.

The UI/map, report pipeline, and submission integration remain separate ownership lanes in this single Next.js repository. Use Zod-derived contracts, plain fetch and pnpm. Do not silently substitute demo data when a live service fails.

No fictional report may be submitted to a government service. Mountain View and Caltrans automated final clicks require explicit approval of a real reviewed report. County Roads final submission currently uses human takeover. Official receipt and status evidence are required before Streetwise shows successful submission or resolution.
