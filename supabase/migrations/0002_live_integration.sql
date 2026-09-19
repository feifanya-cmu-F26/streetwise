-- Additive: legacy data is retained but excluded from the live public map.
begin;
alter table public.issues add column if not exists owner_id uuid references auth.users(id);
alter table public.issues add column if not exists is_demo boolean not null default true;
alter table public.evidence add column if not exists owner_id uuid references auth.users(id);
alter table public.observations add column if not exists owner_id uuid references auth.users(id);
create unique index if not exists observations_owner_kind on public.observations(issue_id,owner_id,kind) where owner_id is not null;
create table if not exists public.live_reports (
 id uuid primary key, owner_id uuid not null references auth.users(id),
 issue_id uuid unique references public.issues(id), storage_path text not null unique references public.evidence(storage_path),
 location jsonb not null, description text not null default '', analysis jsonb, report jsonb,
 authority_id text check(authority_id in ('mountain_view','santa_clara_county','caltrans')),contact jsonb,
 stage text not null default 'queued_analysis' check(stage in ('queued_analysis','analyzing','review','queued_prepare','preparing','ready','paused','needs_input','queued_submit','submitting','uncertain','submitted','queued_track','tracking','queued_verify','verifying','failed')),
 checkpoint integer not null default 0, session_id text, message text not null default 'Queued for analysis',correction text,receipt jsonb,
 attempts integer not null default 0,lease_token uuid,lease_until timestamptz,next_run_at timestamptz not null default now(),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),last_tracked_at timestamptz,tracking_supported boolean
);
create table if not exists public.report_events (
 id bigint generated always as identity primary key, report_id uuid not null references public.live_reports(id),
 stage text not null, message text not null, created_at timestamptz not null default now()
);
create table if not exists public.request_limits (key text primary key,window_start timestamptz not null default now(),count integer not null default 0);
alter table public.live_reports enable row level security;
alter table public.report_events enable row level security;
alter table public.request_limits enable row level security;
-- No client table grants. All reads/writes use authenticated, owner-scoped server routes.
revoke all on public.live_reports,public.report_events,public.request_limits from anon,authenticated;
grant all on public.live_reports,public.report_events,public.request_limits to service_role;
grant usage,select on sequence public.report_events_id_seq to service_role;

create or replace function public.consume_request_limit(p_key text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
 insert into request_limits(key,count) values(p_key,1)
 on conflict(key) do update set count=case when request_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else request_limits.count+1 end,
 window_start=case when request_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else request_limits.window_start end
 returning count into v_count;
 return v_count<=p_limit;
end; $$;

create or replace function public.claim_live_report(p_id uuid,p_token uuid) returns setof public.live_reports
language plpgsql security definer set search_path=public as $$
begin
 -- Never repeat an irreversible send if its worker died or response was lost.
 update live_reports set stage='uncertain',message='Submission interrupted. Check the portal before taking any further action.',lease_token=null,lease_until=null,updated_at=now()
 where id=p_id and stage='submitting' and (lease_until is null or lease_until<now());
 return query update live_reports set lease_token=p_token,lease_until=now()+interval '330 seconds',attempts=attempts+1,updated_at=now()
 where id=p_id and (lease_until is null or lease_until<now()) and next_run_at<=now()
 and stage in ('queued_analysis','analyzing','queued_prepare','preparing','queued_submit','queued_track','tracking','queued_verify','verifying') and attempts<12 returning *;
end; $$;

-- An immutable storage path eliminates cross-service move/rollback races.
-- Issue insertion and evidence linking are one database transaction.
create or replace function public.approve_live_report(p_id uuid,p_owner uuid,p_report jsonb,p_authority text,p_contact jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare r live_reports; new_id uuid;
begin
 select * into r from live_reports where id=p_id and owner_id=p_owner for update;
 if not found then raise exception 'Report not found'; end if;
 if r.stage<>'review' then raise exception 'Report is not awaiting review'; end if;
 if r.analysis is null or r.analysis->>'mode'<>'live' or p_report->>'category'<>r.analysis->>'issueType' then raise exception 'Invalid analysis';end if;
 perform 1 from evidence where storage_path=r.storage_path and owner_id=p_owner and issue_id is null for update;
 if not found then raise exception 'Evidence unavailable';end if;
 insert into issues(owner_id,is_demo,type,severity,lat,lng,address,image_path,report_title,report_description,authority_status,authority_id,authority_reason,status)
 values(p_owner,false,r.analysis->>'issueType',r.analysis->>'severity',(r.location->>'lat')::float8,(r.location->>'lng')::float8,r.location->>'address',r.storage_path,p_report->>'title',p_report->>'description','resolved',p_authority,'Confirmed by the reporting user; verify portal jurisdiction before sending.','ready') returning id into new_id;
 update evidence set issue_id=new_id where storage_path=r.storage_path and owner_id=p_owner;
 update live_reports set issue_id=new_id,report=p_report,authority_id=p_authority,contact=p_contact,stage='queued_prepare',message='Preparing the official form',attempts=0,next_run_at=now(),updated_at=now() where id=p_id;
 return new_id;
end; $$;

-- Atomic owner-scoped commands serialize against the worker's send fence.
create or replace function public.control_live_report(p_id uuid,p_owner uuid,p_action text,p_reason text default null) returns setof public.live_reports
language plpgsql security definer set search_path=public as $$
declare r live_reports; target text;
begin
 select * into r from live_reports where id=p_id and owner_id=p_owner for update;
 if not found then raise exception 'Report not found';end if;
 if p_action='pause' and r.stage in ('queued_prepare','preparing','ready','needs_input','queued_submit') then target='paused';
 elsif p_action='resume' and r.stage in ('paused','needs_input') and (r.lease_until is null or r.lease_until<now()) then target='queued_prepare';
 elsif p_action='submit' and r.stage='ready' and r.session_id is not null and (r.lease_until is null or r.lease_until<now()) then target='queued_submit';
 elsif p_action='retry' and r.stage='failed' and (r.lease_until is null or r.lease_until<now()) then target=case when r.analysis is null then 'queued_analysis' else 'queued_prepare' end;
 elsif p_action='verify_receipt' and r.stage in ('uncertain','needs_input','paused','ready') and r.session_id is not null and (r.lease_until is null or r.lease_until<now()) then target='queued_verify';
 elsif p_action='track' and r.stage='submitted' and r.receipt is not null then target='queued_track';
 else raise exception 'Action not available in the current state';end if;
 return query update live_reports set stage=target,correction=coalesce(p_reason,correction),checkpoint=case when p_action='retry' then 0 else checkpoint end,attempts=0,next_run_at=now(),updated_at=now(),message=case when target='paused' then 'Pausing automation; wait for the current action to finish before taking control.' else 'Queued' end where id=p_id returning *;
end; $$;
revoke all on function public.consume_request_limit(text,integer,integer),public.claim_live_report(uuid,uuid),public.approve_live_report(uuid,uuid,jsonb,text,jsonb),public.control_live_report(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.consume_request_limit(text,integer,integer),public.claim_live_report(uuid,uuid),public.approve_live_report(uuid,uuid,jsonb,text,jsonb),public.control_live_report(uuid,uuid,text,text) to service_role;
create index if not exists live_reports_due on public.live_reports(next_run_at) where stage in ('queued_analysis','analyzing','queued_prepare','preparing','queued_submit','submitting','queued_track','tracking','queued_verify','verifying');
create index if not exists live_reports_owner on public.live_reports(owner_id,created_at desc);
commit;
