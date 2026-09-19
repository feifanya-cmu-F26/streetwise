# Team workflow

| Owner                              | Deliverable                                                      | Branch                 |
| ---------------------------------- | ---------------------------------------------------------------- | ---------------------- |
| Web UI / Map                       | Map, markers, issue details, community controls, responsive UX   | `feat/map-experience`  |
| Report Pipeline                    | Upload, analysis, geo/duplicates, authority, report, persistence | `feat/report-pipeline` |
| Product / Submission / Integration | Review flow, browser preparation, integration, demo              | `feat/submission-flow` |

1. Read `AGENTS.md`, `GOAL.md`, `docs/api.md`, and your role guide.
2. Work in a separate clone or worktree and a short-lived feature branch. Keep the same root `AGENTS.md` on every branch.
3. Build against `src/schemas/` and the demo API immediately. Do not wait for another lane.
4. Propose shared contract changes to the pipeline owner and integration lead first. Update schema, callers, fixtures, tests, and API docs together.
5. Submit small PRs. Include behavior changed, contracts touched, checks run, and remaining mocks.
6. Run `pnpm check` and `pnpm build`; smoke-test affected flows before merging. The integration lead coordinates merges and resolves shared-file conflicts with owners.
7. Sync with `main` frequently. Add GitHub/Vercel previews when the team creates the remote project; no remote or deployment has been created by the skeleton setup.

The demo repository is process-local. Do not use it to evaluate shared persistence or distributed behavior. Do not enable live mode merely by adding API keys.
