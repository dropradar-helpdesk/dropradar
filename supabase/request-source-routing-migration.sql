alter table public.tracking_requests
  add column if not exists matched_source_id text references public.official_sources(id) on delete set null;

alter table public.tracking_requests
  add column if not exists tracking_keywords text[] not null default '{}';

alter table public.tracking_requests
  add column if not exists watch_strategy text not null default 'unassigned';

do $$
begin
  alter table public.tracking_requests
    add constraint tracking_requests_watch_strategy_check
    check (watch_strategy in ('unassigned', 'reuse_source', 'new_source', 'manual_only'));
exception
  when duplicate_object then null;
end $$;

create or replace view public.tracking_request_feed as
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
  tr.created_at,
  tr.matched_source_id,
  tr.tracking_keywords,
  tr.watch_strategy
from public.tracking_requests tr
left join public.request_votes rv on rv.request_id = tr.id
where tr.hidden = false
  and tr.merged_into_id is null
  and tr.status <> 'quarantined'
group by tr.id;

create or replace function public.admin_set_tracking_request(
  p_request_id uuid,
  p_status text,
  p_hidden boolean default null,
  p_official_url text default null,
  p_admin_note text default null,
  p_matched_source_id text default null,
  p_tracking_keywords text[] default null,
  p_watch_strategy text default null,
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
    matched_source_id = case
      when p_matched_source_id is null then matched_source_id
      when nullif(trim(p_matched_source_id), '') is null then null
      else p_matched_source_id
    end,
    tracking_keywords = case
      when p_tracking_keywords is null then tracking_keywords
      else coalesce(array(
        select distinct trim(value)
        from unnest(p_tracking_keywords) as keyword(value)
        where nullif(trim(value), '') is not null
        limit 12
      ), '{}'::text[])
    end,
    watch_strategy = case
      when coalesce(p_watch_strategy, watch_strategy, 'unassigned') in ('unassigned', 'reuse_source', 'new_source', 'manual_only')
        then coalesce(p_watch_strategy, watch_strategy, 'unassigned')
      else watch_strategy
    end,
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

grant select on public.tracking_request_feed to anon, authenticated;
grant execute on function public.admin_set_tracking_request(uuid, text, boolean, text, text, text, text[], text, uuid) to authenticated;

notify pgrst, 'reload schema';
