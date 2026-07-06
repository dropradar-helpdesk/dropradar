-- Grants required by the ingest-official-sources Edge Function.
-- Run after schema.sql / monitoring-v1-migration.sql on existing projects.

grant usage on schema public to service_role;

grant select on public.official_sources to service_role;
grant select on public.tracking_request_feed to service_role;
grant select, insert on public.source_checks to service_role;
grant select, insert, update on public.ingest_runs to service_role;
grant select, insert, update, delete on public.intake_candidates to service_role;
grant select, insert, update, delete on public.moderation_rules to service_role;
grant select, insert on public.admin_decisions to service_role;
grant select, insert on public.moderation_notes to service_role;
grant usage, select on all sequences in schema public to service_role;
