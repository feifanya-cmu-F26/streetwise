# Skeleton validation

Validated locally on 2026-09-18 with Node.js 26.9.0 and pnpm 11.7.0. The CI definition targets Node.js 24; remote GitHub CI has not run.

| Check | Result |
| --- | --- |
| Frozen-lockfile installation | Passed |
| Dependency peer constraints | No issues after pinning compatible TypeScript and ESLint versions |
| ESLint and TypeScript / Next route type generation | Passed |
| Contract / domain tests | 7 passed |
| Production build | Passed; home, report, and six API method/path combinations available |
| HTTP smoke checks against local production server | 15 passed |
| Unsupported live mode | GET /api/issues returns 503 / LIVE_MODE_NOT_IMPLEMENTED |
| Desktop browser | List → details; both observation buttons; sample analysis → edited review → preparation → stored detail passed |
| 390 × 844 browser viewport | Detail observation and complete report flow passed; home and input form widths stay within 390px |
| Browser console on tested flows | No captured warnings or errors |

The browser check verified that an edited report title/description appears on the new issue, community counts update, and government status remains `not_submitted`. The mobile viewport override was reset afterward.

## Not verified or implemented

- Mapbox basemap/marker rendering with a real token (no token was supplied).
- Supabase, AI Gateway model execution, geocoding/jurisdiction data, Stagehand/Browserbase, real uploads, or government submissions.
- Remote CI, Vercel deployment, multi-instance persistence, production access/abuse controls, or physical mobile devices.
- Node.js 24 runtime execution locally; CI is configured for it, while this Mac's available runtime is Node.js 26.9.0.

The ESLint 9 registry deprecation remains a tooling limitation. The installed Next.js lint plugins require that compatible major; the attempted ESLint 10 run failed rule loading. See `docs/architecture.md`.
