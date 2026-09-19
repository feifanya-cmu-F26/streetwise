# Supabase handoff

Owner: Report Pipeline. No database, migration, bucket, or policy has been created/applied.

Use `src/schemas/` to design the first migration. Keep issue lifecycle, community observations, and government submissions distinct. The existing server-only client factory is `src/lib/supabase/client.ts`; it is not used in demo mode.

Before connecting live persistence:

1. Define tables and mappings for issues, evidence, observations, and submissions; use a minimal schema appropriate to the demo.
2. Define access and Storage policies; keep the secret key server-only. Do not expose anonymous unrestricted database writes.
3. Implement atomic confirmation increments or observation inserts.
4. Add PostGIS if practical, otherwise keep latitude/longitude and use Haversine candidate lookup.
5. Add migration files here with reproducible setup instructions and reviewed fixture data.
6. Verify persistence across restarts and concurrent requests before replacing the demo repository.
