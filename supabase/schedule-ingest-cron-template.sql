-- Template for scheduling ingest-official-sources.
-- Do not commit real publishable keys or ingest secrets into this file.
-- Replace the placeholder values only inside the Supabase SQL Editor, or use the Vault UI.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

select vault.create_secret('https://YOUR_PROJECT_ID.supabase.co', 'dropradar_project_url');
select vault.create_secret('YOUR_SUPABASE_PUBLISHABLE_KEY', 'dropradar_publishable_key');
select vault.create_secret('YOUR_INGEST_CRON_SECRET', 'dropradar_ingest_cron_secret');

select cron.unschedule(jobid)
from cron.job
where jobname = 'dropradar-ingest-official-sources-v1';

select cron.schedule(
  'dropradar-ingest-official-sources-v1',
  '17 22 * * *', -- 07:17 JST daily
  $$
  select
    net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'dropradar_project_url') || '/functions/v1/ingest-official-sources',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'dropradar_publishable_key'),
        'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'dropradar_publishable_key'),
        'x-ingest-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'dropradar_ingest_cron_secret')
      ),
      body := jsonb_build_object(
        'dryRun', false,
        'sourceIds', jsonb_build_array(
          'bandai-hobby-gunpla',
          'bandai-spirits-products',
          'dragonball-official',
          'hololive-official',
          'ichiban-kuji-official',
          'pokemon-card-tcg',
          'pokemon-goods-center',
          'square-enix-dragonquest-goods'
        )
      )
    ) as request_id;
  $$
);
