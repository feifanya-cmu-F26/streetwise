-- Disposable PostgreSQL only. All test records are rolled back.
begin;
insert into auth.users(id) values('10000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002');
insert into evidence(owner_id,storage_path,content_type,size_bytes) values('10000000-0000-4000-8000-000000000001','evidence/test/photo.jpg','image/jpeg',100);
insert into live_reports(id,owner_id,storage_path,location,analysis,stage)
values('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','evidence/test/photo.jpg','{"lat":37.394,"lng":-122.081}','{"mode":"live","issueType":"pothole","severity":"low"}','review');
do $$ declare issue uuid; blocked boolean:=false; begin
 begin
 perform approve_live_report('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','{"title":"test","description":"test","category":"pothole"}','mountain_view','{"email":"test@example.test"}');
 exception when others then blocked:=true;end;
 if not blocked then raise exception 'Owner isolation failed';end if;
 issue:=approve_live_report('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','{"title":"test","description":"test","category":"pothole"}','mountain_view','{"email":"test@example.test"}');
 if not exists(select 1 from evidence where storage_path='evidence/test/photo.jpg' and issue_id=issue) then raise exception 'Evidence link not atomic';end if;
 if not exists(select 1 from issues where id=issue and is_demo=false and photo_public=false)then raise exception 'Live issue flag missing';end if;
 blocked:=false;
 begin perform approve_live_report('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','{"title":"test","description":"test","category":"pothole"}','mountain_view','{}');exception when others then blocked:=true;end;
 if not blocked then raise exception 'Duplicate approval was accepted';end if;
end $$;
do $$ declare n integer;begin
 select count(*) into n from claim_live_report('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001');
 if n<>1 then raise exception 'Initial claim failed';end if;
 select count(*) into n from claim_live_report('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');
 if n<>0 then raise exception 'Concurrent claim not excluded';end if;
 perform control_live_report('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','pause','Wrong website');
 if (select stage from live_reports where id='20000000-0000-4000-8000-000000000001')<>'paused' then raise exception 'Pause lost';end if;
 update live_reports set stage='submitting',lease_until=now()-interval '1 minute' where id='20000000-0000-4000-8000-000000000001';
 perform claim_live_report('20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002');
 if (select stage from live_reports where id='20000000-0000-4000-8000-000000000001')<>'uncertain' then raise exception 'Expired send must not retry';end if;
end $$;
do $$ begin
 if has_function_privilege('anon','public.approve_live_report(uuid,uuid,jsonb,text,jsonb)','EXECUTE') then raise exception 'Anonymous RPC execution allowed';end if;
 if has_table_privilege('authenticated','public.live_reports','SELECT') then raise exception 'Private reports exposed';end if;
end $$;
do $$ declare n integer; begin
 select count(*) into n from lock_government_connection('10000000-0000-4000-8000-000000000001','mountain_view','30000000-0000-4000-8000-000000000001');
 if n<>1 then raise exception 'Context initial lock failed';end if;
 select count(*) into n from lock_government_connection('10000000-0000-4000-8000-000000000001','mountain_view','30000000-0000-4000-8000-000000000002');
 if n<>0 then raise exception 'Concurrent context lock not excluded';end if;
 select count(*) into n from lock_government_connection('10000000-0000-4000-8000-000000000002','mountain_view','30000000-0000-4000-8000-000000000002');
 if n<>1 then raise exception 'Owners do not have isolated contexts';end if;
 select count(*) into n from lock_government_connection('10000000-0000-4000-8000-000000000001','caltrans','30000000-0000-4000-8000-000000000002');
 if n<>1 then raise exception 'Agencies do not have isolated contexts';end if;
 if has_table_privilege('authenticated','public.government_connections','SELECT') then raise exception 'Government cookies exposed';end if;
 if has_function_privilege('anon','public.lock_government_connection(uuid,text,uuid)','EXECUTE') then raise exception 'Untrusted context locking allowed';end if;
end $$;
rollback;
