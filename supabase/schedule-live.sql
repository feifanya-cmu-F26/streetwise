-- Run only after deploying. Vault must contain streetwise_app_url (HTTPS origin)
-- and streetwise_cron_secret matching Vercel CRON_SECRET. No credentials in Git.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('streetwise-worker','* * * * *', $job$
 select net.http_get(
  url := (select decrypted_secret from vault.decrypted_secrets where name='streetwise_app_url') || '/api/cron',
  headers := jsonb_build_object('Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='streetwise_cron_secret')),
  timeout_milliseconds := 300000
 ) where exists(select 1 from public.live_reports where
  (stage in ('queued_analysis','analyzing','queued_prepare','preparing','queued_submit','submitting','queued_track','tracking','queued_verify','verifying') and (lease_until is null or lease_until<now()) and next_run_at<=now())
  or (stage='submitted' and tracking_supported is distinct from false and next_run_at<=now())
 );
$job$);
