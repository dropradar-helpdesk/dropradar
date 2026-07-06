-- DropRadar Supabase schema draft.
-- Run only in a fresh Supabase project or review carefully before applying.
--
-- Design notes:
-- - Public cards and official-source facts are readable by everyone.
-- - Anonymous users can submit tracking requests and votes only through RPC.
-- - Raw request vote rows and anonymous fingerprints are not publicly readable.
-- - User GPS is intentionally not part of this schema. Only public destination
--   coordinates are stored in spot_locations.

create extension if not exists pgcrypto;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

create or replace function public.normalize_request_term(raw_term text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(trim(replace(coalesce(raw_term, ''), '　', ' '))), '\s+', ' ', 'g');
$$;

create or replace function public.anonymous_fingerprint(raw_key text)
returns text
language sql
stable
as $$
  select case
    when nullif(trim(coalesce(raw_key, '')), '') is null then null
    else encode(extensions.digest(trim(raw_key), 'sha256'), 'hex')
  end;
$$;

create table public.official_sources (
  id text primary key,
  name text not null,
  url text not null,
  category text not null,
  check_mode text not null default 'manual',
  watch_urls text[] not null default '{}',
  discovery_keywords text[] not null default '{}',
  cadence text,
  robots_checked_at timestamptz,
  terms_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drops (
  id text primary key,
  title_ja text not null,
  title_en text,
  brand text not null,
  category text not null,
  method text not null default 'official',
  state text not null check (state in ('soon', 'store', 'lottery', 'online')),
  status_ja text,
  status_en text,
  official_url text not null,
  source_label text,
  source_id text references public.official_sources(id),
  release_at date,
  deadline_at date,
  area_ja text,
  area_en text,
  purchase_limit_ja text,
  purchase_limit_en text,
  how_ja text,
  how_en text,
  tags text[] not null default '{}',
  icon text,
  art_a text,
  art_b text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.spot_locations (
  id text primary key,
  name_ja text not null,
  name_en text,
  category text not null,
  lat numeric(9,6),
  lng numeric(9,6),
  map_query_ja text,
  map_query_en text,
  access_ja text,
  access_en text,
  official_url text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spot_locations_destination_check
    check ((lat is not null and lng is not null) or map_query_ja is not null or map_query_en is not null)
);

create table public.source_checks (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.official_sources(id) on delete cascade,
  checked_at timestamptz not null default now(),
  hash text,
  added_count integer not null default 0,
  removed_count integer not null default 0,
  links_json jsonb not null default '{}'::jsonb,
  review_status text not null default 'needs_review',
  note text
);

create table public.ingest_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'official_sources',
  status text not null default 'running' check (status in ('running', 'complete', 'failed')),
  dry_run boolean not null default false,
  source_count integer not null default 0,
  candidate_count integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text,
  meta_json jsonb not null default '{}'::jsonb
);

create table public.tracking_requests (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  normalized_term text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'quarantined')),
  official_url text,
  hidden boolean not null default false,
  search_count integer not null default 0 check (search_count >= 0),
  merged_into_id uuid references public.tracking_requests(id),
  admin_note text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracking_requests_term_length check (char_length(term) between 1 and 80),
  constraint tracking_requests_normalized_length check (char_length(normalized_term) between 1 and 80)
);

create table public.request_votes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.tracking_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  voter_hash text,
  vote_type text not null check (vote_type in ('candidate', 'problem')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint request_votes_owner_check check (user_id is not null or voter_hash is not null)
);

create unique index request_votes_user_once
  on public.request_votes(request_id, user_id)
  where user_id is not null;

create unique index request_votes_anon_once
  on public.request_votes(request_id, voter_hash)
  where user_id is null and voter_hash is not null;

create table public.request_search_signals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.tracking_requests(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  requester_hash text,
  created_at timestamptz not null default now(),
  constraint request_search_signals_owner_check check (user_id is not null or requester_hash is not null)
);

create unique index request_search_signals_user_once
  on public.request_search_signals(request_id, user_id)
  where user_id is not null;

create unique index request_search_signals_anon_once
  on public.request_search_signals(request_id, requester_hash)
  where user_id is null and requester_hash is not null;

create table public.intake_candidates (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.official_sources(id) on delete set null,
  request_id uuid references public.tracking_requests(id) on delete set null,
  title text not null,
  official_url text,
  risk_level text not null default 'review' check (risk_level in ('safe', 'review', 'block')),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected', 'quarantined')),
  detected_at timestamptz not null default now(),
  signals_json jsonb not null default '{}'::jsonb,
  moderation_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.moderation_rules (
  id uuid primary key default gen_random_uuid(),
  rule_type text not null,
  pattern text not null,
  action text not null check (action in ('allow', 'review', 'block')),
  severity integer not null default 1 check (severity between 1 and 5),
  enabled boolean not null default true,
  note text,
  updated_at timestamptz not null default now()
);

create table public.admin_decisions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id),
  action text not null check (action in ('approve', 'reject', 'quarantine', 'hold', 'merge', 'publish', 'hide', 'restore', 'update')),
  target_table text not null,
  target_id text not null,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz not null default now()
);

create table public.moderation_notes (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id),
  target_table text not null,
  target_id text not null,
  note text not null,
  visibility text not null default 'internal' check (visibility in ('internal', 'public_reason')),
  created_at timestamptz not null default now()
);

create table public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  drop_id text not null references public.drops(id) on delete cascade,
  rank text not null default 'C' check (rank in ('S', 'A', 'B', 'C')),
  rank_order integer not null default 999,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, drop_id)
);

create table public.user_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  drop_id text not null references public.drops(id) on delete cascade,
  plan_date date,
  status text not null default 'unchecked',
  day_mode text not null default 'balanced',
  calendar_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, drop_id)
);

create table public.budget_envelopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  drop_id text references public.drops(id) on delete cascade,
  category text not null default 'content',
  amount_yen integer not null default 0 check (amount_yen >= 0),
  spent_yen integer not null default 0 check (spent_yen >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, month, drop_id, category)
);

create view public.tracking_request_feed as
select
  tr.id,
  tr.term,
  tr.normalized_term,
  tr.status,
  tr.official_url,
  tr.search_count,
  coalesce(count(rv.id) filter (where rv.vote_type = 'candidate'), 0)::integer as candidate_votes,
  coalesce(count(rv.id) filter (where rv.vote_type = 'problem'), 0)::integer as problem_votes,
  tr.last_seen_at,
  tr.created_at
from public.tracking_requests tr
left join public.request_votes rv on rv.request_id = tr.id
where tr.hidden = false
  and tr.merged_into_id is null
  and tr.status <> 'quarantined'
group by tr.id;

create or replace function public.submit_tracking_request(p_term text, p_device_key text default null)
returns table (
  id uuid,
  term text,
  normalized_term text,
  status text,
  official_url text,
  search_count integer,
  candidate_votes integer,
  problem_votes integer,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
  canonical text;
  request_row public.tracking_requests%rowtype;
  current_user_id uuid := auth.uid();
  anon_hash text := public.anonymous_fingerprint(p_device_key);
  signal_rows integer := 0;
begin
  canonical := trim(regexp_replace(replace(coalesce(p_term, ''), '　', ' '), '\s+', ' ', 'g'));
  normalized := public.normalize_request_term(canonical);

  if char_length(normalized) < 1 or char_length(normalized) > 80 then
    raise exception 'tracking request term must be 1-80 characters';
  end if;

  if current_user_id is null and anon_hash is null then
    raise exception 'anonymous requests require a device key';
  end if;

  insert into public.tracking_requests (term, normalized_term, search_count, last_seen_at, updated_at)
  values (canonical, normalized, 0, now(), now())
  on conflict on constraint tracking_requests_normalized_term_key do update set
    last_seen_at = now(),
    updated_at = now()
  returning * into request_row;

  if current_user_id is not null then
    insert into public.request_search_signals (request_id, user_id)
    values (request_row.id, current_user_id)
    on conflict (request_id, user_id) where user_id is not null do nothing;
  else
    insert into public.request_search_signals (request_id, requester_hash)
    values (request_row.id, anon_hash)
    on conflict (request_id, requester_hash) where user_id is null and requester_hash is not null do nothing;
  end if;

  get diagnostics signal_rows = row_count;

  if signal_rows > 0 then
    update public.tracking_requests tr
    set search_count = tr.search_count + 1,
        last_seen_at = now(),
        updated_at = now()
    where tr.id = request_row.id
    returning * into request_row;
  end if;

  return query
    select
      feed.id,
      feed.term,
      feed.normalized_term,
      feed.status,
      feed.official_url,
      feed.search_count,
      feed.candidate_votes,
      feed.problem_votes,
      feed.last_seen_at
    from public.tracking_request_feed feed
    where feed.id = request_row.id;
end;
$$;

create or replace function public.vote_tracking_request(p_request_id uuid, p_vote_type text, p_device_key text default null)
returns table (
  id uuid,
  term text,
  normalized_term text,
  status text,
  official_url text,
  search_count integer,
  candidate_votes integer,
  problem_votes integer,
  last_seen_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  anon_hash text := public.anonymous_fingerprint(p_device_key);
  target public.tracking_requests%rowtype;
begin
  if p_vote_type not in ('candidate', 'problem') then
    raise exception 'vote_type must be candidate or problem';
  end if;

  select tr.* into target
  from public.tracking_requests tr
  where tr.id = p_request_id
    and tr.hidden = false
    and tr.merged_into_id is null
    and tr.status in ('pending', 'approved');

  if not found then
    raise exception 'tracking request is not voteable';
  end if;

  if current_user_id is null and anon_hash is null then
    raise exception 'anonymous votes require a device key';
  end if;

  if current_user_id is not null then
    insert into public.request_votes (request_id, user_id, vote_type, updated_at)
    values (p_request_id, current_user_id, p_vote_type, now())
    on conflict (request_id, user_id) where user_id is not null
    do update set vote_type = excluded.vote_type, updated_at = now();
  else
    insert into public.request_votes (request_id, voter_hash, vote_type, updated_at)
    values (p_request_id, anon_hash, p_vote_type, now())
    on conflict (request_id, voter_hash) where user_id is null and voter_hash is not null
    do update set vote_type = excluded.vote_type, updated_at = now();
  end if;

  return query
    select
      feed.id,
      feed.term,
      feed.normalized_term,
      feed.status,
      feed.official_url,
      feed.search_count,
      feed.candidate_votes,
      feed.problem_votes,
      feed.last_seen_at
    from public.tracking_request_feed feed
    where feed.id = p_request_id;
end;
$$;

create or replace function public.admin_set_tracking_request(
  p_request_id uuid,
  p_status text,
  p_hidden boolean default null,
  p_official_url text default null,
  p_admin_note text default null,
  p_merged_into_id uuid default null
)
returns public.tracking_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  before_row jsonb;
  after_row public.tracking_requests%rowtype;
begin
  if not public.is_admin() then
    raise exception 'admin only';
  end if;

  if p_status not in ('pending', 'approved', 'rejected', 'quarantined') then
    raise exception 'invalid tracking request status';
  end if;

  select to_jsonb(tr.*) into before_row
  from public.tracking_requests tr
  where tr.id = p_request_id;

  if before_row is null then
    raise exception 'tracking request not found';
  end if;

  update public.tracking_requests
  set
    status = p_status,
    hidden = coalesce(p_hidden, hidden),
    official_url = nullif(trim(coalesce(p_official_url, official_url, '')), ''),
    admin_note = nullif(trim(coalesce(p_admin_note, admin_note, '')), ''),
    merged_into_id = p_merged_into_id,
    updated_at = now()
  where id = p_request_id
  returning * into after_row;

  insert into public.admin_decisions (admin_user_id, action, target_table, target_id, before_json, after_json)
  values (
    auth.uid(),
    case
      when p_status = 'approved' then 'approve'
      when p_status = 'rejected' then 'reject'
      when p_status = 'quarantined' then 'quarantine'
      else 'hold'
    end,
    'tracking_requests',
    p_request_id::text,
    before_row,
    to_jsonb(after_row)
  );

  if nullif(trim(coalesce(p_admin_note, '')), '') is not null then
    insert into public.moderation_notes (admin_user_id, target_table, target_id, note)
    values (auth.uid(), 'tracking_requests', p_request_id::text, trim(p_admin_note));
  end if;

  return after_row;
end;
$$;

alter table public.official_sources enable row level security;
alter table public.drops enable row level security;
alter table public.spot_locations enable row level security;
alter table public.source_checks enable row level security;
alter table public.ingest_runs enable row level security;
alter table public.tracking_requests enable row level security;
alter table public.request_votes enable row level security;
alter table public.request_search_signals enable row level security;
alter table public.intake_candidates enable row level security;
alter table public.moderation_rules enable row level security;
alter table public.admin_decisions enable row level security;
alter table public.moderation_notes enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_plans enable row level security;
alter table public.budget_envelopes enable row level security;

create policy "public can read official sources"
  on public.official_sources for select
  using (true);

create policy "admin manages official sources"
  on public.official_sources for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "public can read published drops"
  on public.drops for select
  using (published_at is not null);

create policy "admin manages drops"
  on public.drops for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "public can read published spot locations"
  on public.spot_locations for select
  using (published_at is not null);

create policy "admin manages spot locations"
  on public.spot_locations for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin reads source checks"
  on public.source_checks for select
  using (public.is_admin());

create policy "admin writes source checks"
  on public.source_checks for insert
  with check (public.is_admin());

create policy "admin reads ingest runs"
  on public.ingest_runs for select
  using (public.is_admin());

create policy "admin writes ingest runs"
  on public.ingest_runs for insert
  with check (public.is_admin());

create policy "admin updates ingest runs"
  on public.ingest_runs for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin reads tracking requests"
  on public.tracking_requests for select
  using (public.is_admin());

create policy "admin manages tracking requests"
  on public.tracking_requests for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin reads request votes"
  on public.request_votes for select
  using (public.is_admin());

create policy "admin manages request votes"
  on public.request_votes for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin reads request search signals"
  on public.request_search_signals for select
  using (public.is_admin());

create policy "admin manages request search signals"
  on public.request_search_signals for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin reads intake candidates"
  on public.intake_candidates for select
  using (public.is_admin());

create policy "admin manages intake candidates"
  on public.intake_candidates for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin manages moderation rules"
  on public.moderation_rules for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin reads decisions"
  on public.admin_decisions for select
  using (public.is_admin());

create policy "admin writes decisions"
  on public.admin_decisions for insert
  with check (public.is_admin());

create policy "admin reads moderation notes"
  on public.moderation_notes for select
  using (public.is_admin());

create policy "admin writes moderation notes"
  on public.moderation_notes for insert
  with check (public.is_admin());

create policy "users manage own favorites"
  on public.user_favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own plans"
  on public.user_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own budgets"
  on public.budget_envelopes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.official_sources to anon, authenticated;
grant select on public.drops to anon, authenticated;
grant select on public.spot_locations to anon, authenticated;
grant select on public.tracking_request_feed to anon, authenticated;
grant select, insert on public.source_checks to authenticated;
grant select, insert, update on public.ingest_runs to authenticated;
grant select, insert, update, delete on public.intake_candidates to authenticated;
grant select, insert, update, delete on public.moderation_rules to authenticated;
grant select, insert on public.admin_decisions to authenticated;
grant select, insert on public.moderation_notes to authenticated;

grant usage on schema public to service_role;
grant select on public.official_sources to service_role;
grant select, insert on public.source_checks to service_role;
grant select, insert, update on public.ingest_runs to service_role;
grant select, insert, update, delete on public.intake_candidates to service_role;
grant select, insert, update, delete on public.moderation_rules to service_role;
grant select, insert on public.admin_decisions to service_role;
grant select, insert on public.moderation_notes to service_role;
grant usage, select on all sequences in schema public to service_role;
grant execute on function public.submit_tracking_request(text, text) to anon, authenticated;
grant execute on function public.vote_tracking_request(uuid, text, text) to anon, authenticated;
grant execute on function public.admin_set_tracking_request(uuid, text, boolean, text, text, uuid) to authenticated;

comment on view public.tracking_request_feed is
  'Public aggregate view for no-login tracking requests. Raw vote rows and anonymous hashes stay hidden.';

comment on function public.submit_tracking_request(text, text) is
  'Loginless request intake. Normalizes duplicate terms and returns the public aggregate row.';

comment on function public.vote_tracking_request(uuid, text, text) is
  'Loginless request voting. One vote per signed-in user or anonymous device fingerprint.';

comment on table public.request_search_signals is
  'Internal duplicate guard for search/request demand. Public users see only aggregate search_count.';

comment on table public.spot_locations is
  'Public pilgrimage/detour destinations only. Do not add user GPS history or current-location logs.';
