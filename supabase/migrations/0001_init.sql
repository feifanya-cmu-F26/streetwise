-- Initial schema for live persistence. Draft for review: run against a
-- disposable Supabase project first, not the shared team project, until an
-- integration lead has reviewed it (see docs/agents/report-pipeline.AGENTS.md).
--
-- Design notes:
-- * Tables mirror src/schemas/issue.ts, analysis.ts, authority.ts, submission.ts.
--   Keep them in sync; the Zod schemas remain the authoritative contract.
-- * PostGIS is not enabled here (Next work #4). lat/lng stay plain columns;
--   duplicate lookup can use Haversine over them until PostGIS is adopted.
-- * RLS is enabled with no anonymous policies. All access goes through the
--   server-only Supabase client (SUPABASE_SECRET_KEY), which bypasses RLS.
--   Do not add anon/authenticated policies without an explicit access model.
create extension if not exists pgcrypto;

create table if not exists issues (
  id uuid primary key default gen_random_uuid(),
  -- Keep in sync with issueTypeSchema in src/schemas/issue.ts.
  type text not null check (
    type in (
      'pothole', 'street_light', 'trash', 'sidewalk', 'water_leak',
      'graffiti', 'abandoned_vehicle', 'traffic_sign', 'vegetation', 'other'
    )
  ),
  severity text not null check (severity in ('low', 'medium', 'high')),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  address text,
  -- Storage path, not a URL: the bucket is private, so issueSchema.imageUrl is
  -- produced by signing this path at read time. Storing a signed URL would
  -- persist a link that expires. Denormalized from `evidence` to keep the
  -- list/detail read path free of a join.
  image_path text,
  report_title text not null,
  report_description text not null,
  authority_status text not null check (
    authority_status in ('resolved', 'needs_review')
  ),
  authority_id text,
  authority_reason text not null,
  status text not null default 'detected' check (
    status in ('detected', 'ready', 'in_progress', 'resolved')
  ),
  still_there_count integer not null default 0,
  resolved_count integer not null default 0,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Evidence rows are created at upload time (storage_path is known before an
-- issue exists) and linked to an issue once analysis/creation completes.
create table if not exists evidence (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references issues (id) on delete cascade,
  storage_path text not null unique,
  content_type text not null,
  size_bytes integer not null,
  uploaded_at timestamptz not null default now()
);

-- Append-only observation log; still_there_count/resolved_count on `issues`
-- are the atomic read path and are updated by the trigger below in the same
-- transaction as the insert, so concurrent confirmations cannot race.
create table if not exists observations (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues (id) on delete cascade,
  kind text not null check (kind in ('still_there', 'resolved')),
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  issue_id uuid primary key references issues (id) on delete cascade,
  status text not null default 'not_submitted' check (
    status in (
      'not_submitted', 'submitted', 'acknowledged', 'in_progress',
      'resolved', 'failed'
    )
  ),
  external_request_id text,
  external_status_url text,
  updated_at timestamptz not null default now()
);

create or replace function apply_observation() returns trigger as $$
begin
  if new.kind = 'still_there' then
    update issues
      set still_there_count = still_there_count + 1,
          last_verified_at = new.created_at,
          updated_at = now()
      where id = new.issue_id;
  else
    update issues
      set resolved_count = resolved_count + 1,
          last_verified_at = new.created_at,
          updated_at = now()
      where id = new.issue_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists observations_apply on observations;
create trigger observations_apply
  after insert on observations
  for each row execute function apply_observation();

alter table issues enable row level security;
alter table evidence enable row level security;
alter table observations enable row level security;
alter table submissions enable row level security;
-- No policies are added: only the service-role server client may read/write
-- until a real access model (e.g. authenticated report owners) is designed.

-- Bucket is private. Uploads go through signed upload URLs issued by
-- src/lib/supabase/storage.ts; reads go through signed read URLs generated
-- from issues.image_path rather than making the bucket public.
-- file_size_limit and allowed_mime_types are the only enforcement that a
-- client cannot bypass: the request body's sizeBytes/contentType are claims.
-- Keep file_size_limit in sync with MAX_UPLOAD_BYTES in src/schemas/upload.ts.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'issue-evidence', 'issue-evidence', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
