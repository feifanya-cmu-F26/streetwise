begin;
create table if not exists public.government_connections (
 owner_id uuid not null references auth.users(id) on delete cascade,
 authority_id text not null check(authority_id in ('mountain_view','santa_clara_county','caltrans')),
 context_id text, session_id text, report_id uuid references public.live_reports(id) on delete set null,
 lock_token uuid, lock_until timestamptz,
 updated_at timestamptz not null default now(),
 primary key(owner_id, authority_id)
);
alter table public.government_connections enable row level security;
revoke all on public.government_connections from public, anon, authenticated;
grant all on public.government_connections to service_role;
create or replace function public.lock_government_connection(p_owner uuid,p_authority text,p_token uuid)
returns setof public.government_connections language plpgsql security definer set search_path=public as $$
begin
 insert into government_connections(owner_id,authority_id) values(p_owner,p_authority) on conflict do nothing;
 return query update government_connections set lock_token=p_token,lock_until=now()+interval '90 seconds'
 where owner_id=p_owner and authority_id=p_authority and (lock_until is null or lock_until<now()) returning *;
end; $$;
revoke all on function public.lock_government_connection(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.lock_government_connection(uuid,text,uuid) to service_role;
alter table public.issues add column if not exists photo_public boolean not null default false;
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
 insert into issues(owner_id,is_demo,type,severity,lat,lng,address,image_path,report_title,report_description,authority_status,authority_id,authority_reason,status,photo_public)
 values(p_owner,false,r.analysis->>'issueType',r.analysis->>'severity',(r.location->>'lat')::float8,(r.location->>'lng')::float8,r.location->>'address',r.storage_path,p_report->>'title',p_report->>'description','resolved',p_authority,'Confirmed by the reporting user; verify portal jurisdiction before sending.','ready',coalesce((p_contact->>'publishPhoto')::boolean,false)) returning id into new_id;
 update evidence set issue_id=new_id where storage_path=r.storage_path and owner_id=p_owner;
 update live_reports set issue_id=new_id,report=p_report,authority_id=p_authority,contact=p_contact,stage='queued_prepare',message='Preparing the official form',attempts=0,next_run_at=now(),updated_at=now() where id=p_id;
 return new_id;
end; $$;

commit;
