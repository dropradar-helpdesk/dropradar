-- DropRadar local/staging admin role template.
-- Replace the email before running in Supabase SQL Editor.
-- Do not use this as a public app login flow.

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'YOUR_ADMIN_EMAIL@example.com';

select
  id,
  email,
  raw_app_meta_data ->> 'role' as role
from auth.users
where email = 'YOUR_ADMIN_EMAIL@example.com';
