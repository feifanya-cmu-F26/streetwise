# Supabase handoff

Owner: Report Pipeline. `migrations/0001_init.sql` is a **draft**, not yet applied to any shared project — it needs integration-lead review before running anywhere but a disposable test project.

While it is a draft, edit `0001_init.sql` in place and re-create disposable projects from it. Once it has been applied to the shared project, stop editing it: `create table if not exists` silently skips an existing table, so an edited `0001` leaves the file and the database disagreeing. From that point every change is a new numbered file.

Use `src/schemas/` to design migrations. Keep issue lifecycle, community observations, and government submissions distinct. The existing server-only client factory is `src/lib/supabase/client.ts`; it is not used in demo mode. The upload contract (`src/schemas/upload.ts`, `POST /api/issues/upload`) issues signed Storage upload URLs against the `issue-evidence` bucket created by the migration; the analyze endpoint's `mode: "live"` request accepts the resulting `storagePath` but does not yet process it (see `docs/agents/report-pipeline.AGENTS.md` Next work #2-3).

Applying the draft migration (once reviewed):

```sh
supabase link --project-ref <project-ref>
supabase db push
```

Remaining before connecting live persistence:

1. ~~Define tables and mappings for issues, evidence, observations, and submissions.~~ Drafted in `migrations/0001_init.sql`; get it reviewed.
2. ~~Define access and Storage policies.~~ RLS is enabled with no anonymous policies (service-role only); the bucket is private and enforces a 10 MB `file_size_limit` and an image-only `allowed_mime_types`. Confirm this access model still fits before relying on it.
   - The bucket row uses `on conflict do update`, so re-running the migration applies changed limits to an existing bucket.
   - `issues.image_path` holds a Storage path. `Issue.imageUrl` must be signed at read time; do not persist a signed URL.
   - Nothing promotes objects out of `pending/` or sweeps unused ones yet.
3. Implement the repository boundary against these tables (`src/lib/issues/repository.ts` currently only has the process-local demo implementation).
4. Add PostGIS if practical, otherwise keep latitude/longitude and use Haversine candidate lookup for duplicates.
5. Add reviewed fixture/seed data for this schema alongside `src/lib/demo/fixtures.ts`.
6. Verify persistence across restarts and concurrent requests before replacing the demo repository.
