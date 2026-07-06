-- DropRadar admin role for the current helpdesk account.
-- Run this after creating a Supabase Auth user with this email.
-- This does not store or change the user's password.

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'dropradar.helpdesk@gmail.com';

select
  id,
  email,
  raw_app_meta_data ->> 'role' as role,
  created_at,
  confirmed_at
from auth.users
where email = 'dropradar.helpdesk@gmail.com';
