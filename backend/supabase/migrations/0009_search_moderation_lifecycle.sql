-- Search, safety controls, account lifecycle, analytics redaction, and event
-- change fan-out. All mobile-facing writes remain RLS/user-scoped.

alter table public.users
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists last_session_revoked_at timestamptz,
  add column if not exists export_requested_at timestamptz;

create table if not exists public.rate_limit_buckets (
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null check (action ~ '^[a-z0-9_.:-]{1,80}$'),
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, action, window_started_at)
);

create table if not exists public.staff_roles (
  user_id uuid primary key references public.users(id) on delete cascade,
  role text not null check (role in ('moderator', 'support', 'admin')),
  granted_by uuid references public.users(id) on delete set null,
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz
);

create table if not exists public.account_deletion_jobs (
  user_id uuid primary key references public.users(id) on delete cascade,
  execute_after timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'failed', 'cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.account_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  request_type text not null check (request_type in ('data_export', 'account_deletion', 'campus_change')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  target_campus_id uuid references public.campuses(id) on delete set null,
  reason text check (reason is null or char_length(reason) <= 2000),
  requested_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create index if not exists account_requests_user_idx on public.account_requests (user_id, requested_at desc, id desc);
create index if not exists account_requests_queue_idx on public.account_requests (status, requested_at) where status in ('pending', 'processing');

create index if not exists rate_limit_cleanup_idx
  on public.rate_limit_buckets (window_started_at);

alter table public.rate_limit_buckets enable row level security;
alter table public.staff_roles enable row level security;
alter table public.account_deletion_jobs enable row level security;
alter table public.account_requests enable row level security;
revoke all on public.rate_limit_buckets from anon, authenticated;
revoke all on public.staff_roles, public.account_deletion_jobs from anon, authenticated;
revoke all on public.account_requests from anon, authenticated;
grant all on public.staff_roles, public.account_deletion_jobs to service_role;
grant select, insert, update on public.account_requests to authenticated;

drop trigger if exists account_requests_set_updated_at on public.account_requests;
create trigger account_requests_set_updated_at before update on public.account_requests for each row execute function private.set_updated_at();
create policy account_requests_self on public.account_requests for select to authenticated using (user_id = public.current_user_id());
create policy account_requests_insert_self on public.account_requests for insert to authenticated with check (user_id = public.current_user_id() and status = 'pending');
create policy account_requests_cancel_self on public.account_requests for update to authenticated using (user_id = public.current_user_id() and status = 'pending') with check (user_id = public.current_user_id() and status = 'cancelled');

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_service_role() or exists (
    select 1 from public.staff_roles
    where user_id = public.current_user_id() and role in ('moderator', 'admin') and revoked_at is null
  );
$$;

create or replace function public.consume_rate_limit(
  p_action text,
  p_limit integer,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  bucket timestamptz;
  count_now integer;
begin
  if actor is null then return false; end if;
  if p_action is null or p_action !~ '^[a-z0-9_.:-]{1,80}$' then
    raise exception 'invalid rate-limit action' using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 100000 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate-limit parameters' using errcode = '22023';
  end if;

  bucket := to_timestamp(floor(extract(epoch from timezone('utc', now())) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limit_buckets (user_id, action, window_started_at, request_count)
  values (actor, p_action, bucket, 1)
  on conflict (user_id, action, window_started_at)
  do update set request_count = public.rate_limit_buckets.request_count + 1,
                updated_at = timezone('utc', now())
  returning request_count into count_now;

  delete from public.rate_limit_buckets
  where user_id = actor and window_started_at < timezone('utc', now()) - interval '2 days';
  return count_now <= p_limit;
end;
$$;

revoke execute on function public.consume_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;

create or replace function private.enforce_account_request_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.user_id is distinct from public.current_user_id() then
    raise exception 'account request owner mismatch' using errcode = '42501';
  end if;
  if not public.consume_rate_limit('account_request', 10, 86400) then raise exception 'account request rate limit exceeded' using errcode = '42900'; end if;
  if exists (select 1 from public.account_requests where user_id = new.user_id and request_type = new.request_type and status in ('pending', 'processing')) then
    raise exception 'active account request already exists' using errcode = '23505';
  end if;
  return new;
end;
$$;

drop trigger if exists account_requests_rate_limit on public.account_requests;
create trigger account_requests_rate_limit before insert on public.account_requests for each row execute function private.enforce_account_request_rate_limit();

create or replace function public.apply_moderation_action(
  p_report_id uuid,
  p_action text,
  p_reason text default null
)
returns public.reports
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actor uuid := public.current_user_id(); target public.reports; result public.reports;
begin
  if not public.is_moderator() then raise exception 'moderator role required' using errcode = '42501'; end if;
  if p_action not in ('dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban', 'restrict_posting', 'restrict_chat', 'escalate', 'restore') then
    raise exception 'invalid moderation action' using errcode = '22023';
  end if;
  select * into target from public.reports where id = p_report_id for update;
  if not found then raise exception 'report not found' using errcode = 'P0002'; end if;

  if p_action = 'hide' and target.target_type = 'post' then update public.posts set status = 'hidden' where id = target.target_id; end if;
  if p_action = 'remove' and target.target_type = 'post' then update public.posts set status = 'removed', deleted_at = timezone('utc', now()) where id = target.target_id; end if;
  if p_action = 'remove' and target.target_type = 'comment' then update public.comments set status = 'removed', deleted_at = timezone('utc', now()) where id = target.target_id; end if;
  if p_action = 'remove' and target.target_type = 'message' then update public.messages set status = 'removed', deleted_at = timezone('utc', now()), text = null where id = target.target_id; end if;
  if p_action in ('suspend', 'ban') and target.target_type = 'user' then update public.users set status = 'suspended' where id = target.target_id; end if;
  if p_action = 'restore' and target.target_type = 'user' then update public.users set status = 'active' where id = target.target_id and status = 'suspended'; end if;
  if p_action = 'restore' and target.target_type = 'post' then update public.posts set status = 'published', deleted_at = null where id = target.target_id; end if;
  if p_action = 'restore' and target.target_type = 'comment' then update public.comments set status = 'published', deleted_at = null where id = target.target_id; end if;

  insert into public.moderation_actions (actor_id, target_type, target_id, action, reason, metadata)
  values (actor, target.target_type, target.target_id, p_action, nullif(trim(p_reason), ''), jsonb_build_object('report_id', target.id));
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (actor, 'moderation.' || p_action, target.target_type, target.target_id, jsonb_build_object('report_id', target.id));
  update public.reports
  set status = case when p_action = 'dismiss' then 'dismissed' when p_action = 'escalate' then 'reviewing' else 'resolved' end,
      resolution = coalesce(nullif(trim(p_reason), ''), p_action), resolved_by = actor,
      resolved_at = case when p_action = 'escalate' then null else timezone('utc', now()) end
  where id = target.id returning * into result;
  return result;
end;
$$;

revoke execute on function public.is_moderator(), public.apply_moderation_action(uuid, text, text) from public, anon;
grant execute on function public.is_moderator(), public.apply_moderation_action(uuid, text, text) to authenticated;

create or replace function public.list_moderation_queue(
  p_status text default 'open',
  p_limit integer default 50
)
returns setof public.reports
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_moderator() then
    raise exception 'moderator role required' using errcode = '42501';
  end if;
  if p_status not in ('open', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'invalid report status' using errcode = '22023';
  end if;
  return query
  select report.* from public.reports report
  where report.status = p_status
  order by report.created_at, report.id
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

create or replace function public.list_moderation_audit(p_limit integer default 100)
returns setof public.moderation_actions
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_moderator() then
    raise exception 'moderator role required' using errcode = '42501';
  end if;
  return query
  select action.* from public.moderation_actions action
  order by action.created_at desc, action.id desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

revoke execute on function public.list_moderation_queue(text, integer), public.list_moderation_audit(integer) from public, anon;
grant execute on function public.list_moderation_queue(text, integer), public.list_moderation_audit(integer) to authenticated;

create or replace function private.enforce_report_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.consume_rate_limit('report', 20, 86400) then
    raise exception 'report rate limit exceeded' using errcode = '42900';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit
before insert on public.reports
for each row execute function private.enforce_report_rate_limit();

create or replace function public.search_mobile(
  p_query text,
  p_type text default 'all',
  p_limit integer default 25
)
returns setof jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  q text := lower(trim(coalesce(p_query, '')));
  safe_q text;
  actor_campus uuid;
begin
  if char_length(q) < 2 then
    return;
  end if;
  p_type := coalesce(p_type, 'all');
  p_limit := coalesce(p_limit, 25);
  if p_type not in ('all', 'profile', 'event', 'post', 'team') then
    raise exception 'invalid search type' using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 100 then
    raise exception 'search limit must be between 1 and 100' using errcode = '22023';
  end if;
  safe_q := replace(replace(replace(q, '%', ''), '_', ''), chr(92), '');
  if safe_q = '' then
    return;
  end if;
  select campus_id into actor_campus from public.users where id = public.current_user_id() and status = 'active';

  return query
  with hits(doc_type, doc_id, title, excerpt, scope, score, created_at) as (
    select 'profile', p.user_id, p.display_name, left(coalesce(p.bio, ''), 240), 'campus',
      case when lower(coalesce(p.username::text, '')) = safe_q then 1.0 else 0.8 end, p.updated_at
    from public.profiles p
    where p.discoverable and public.can_view_profile(p.user_id)
      and (lower(p.display_name) like '%' || safe_q || '%' or lower(p.username::text) like '%' || safe_q || '%' or lower(coalesce(p.department, '')) like '%' || safe_q || '%')
      and p_type in ('all', 'profile')
    union all
    select 'event', e.id, e.title, left(coalesce(e.summary, e.description), 240), 'campus', 0.9, e.starts_at
    from public.events e
    where e.status = 'published' and e.campus_id = actor_campus
      and (lower(e.title) like '%' || safe_q || '%' or lower(e.summary) like '%' || safe_q || '%' or lower(e.description) like '%' || safe_q || '%')
      and p_type in ('all', 'event')
    union all
    select 'post', p.id, left(p.body, 80), left(p.body, 240), p.visibility, 0.8, p.created_at
    from public.posts p
    where public.can_view_post(p.id)
      and lower(p.body) like '%' || safe_q || '%'
      and p_type in ('all', 'post')
    union all
    select 'team', t.id, t.title, left(t.description, 240), 'campus', 0.85, t.created_at
    from public.team_requests t
    where t.status in ('open', 'filled') and t.deleted_at is null
      and t.campus_id = actor_campus
      and not public.are_users_blocked(t.owner_id, public.current_user_id())
      and (lower(t.title) like '%' || safe_q || '%' or lower(t.description) like '%' || safe_q || '%')
      and p_type in ('all', 'team')
  )
  select jsonb_build_object(
    'id', doc_id, 'docType', doc_type, 'title', title, 'excerpt', excerpt,
    'scope', scope, 'score', score, 'createdAt', created_at
  )
  from hits
  order by score desc, created_at desc, doc_id
  limit p_limit;
end;
$$;

revoke execute on function public.search_mobile(text, text, integer) from public, anon;
grant execute on function public.search_mobile(text, text, integer) to authenticated;

create or replace function public.record_analytics_event(
  p_event_name text,
  p_properties jsonb default '{}'::jsonb
)
returns public.analytics_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  result public.analytics_events;
  sanitized jsonb;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if not exists (select 1 from public.users where id = actor and analytics_consent_at is not null and status = 'active') then
    raise exception 'analytics consent required' using errcode = '42501';
  end if;
  if p_event_name is null or p_event_name !~ '^[a-z0-9_:.-]{1,100}$' then
    raise exception 'invalid analytics event' using errcode = '22023';
  end if;
  sanitized := coalesce(p_properties, '{}'::jsonb) - array['body', 'message', 'content', 'otp', 'token', 'access_token', 'refresh_token', 'password', 'email'];
  if jsonb_typeof(sanitized) <> 'object' then raise exception 'analytics properties must be an object' using errcode = '22023'; end if;
  insert into public.analytics_events (user_id, event_name, properties)
  values (actor, p_event_name, sanitized)
  returning * into result;
  return result;
end;
$$;

revoke insert on public.analytics_events from authenticated;
revoke execute on function public.record_analytics_event(text, jsonb) from public, anon;
grant execute on function public.record_analytics_event(text, jsonb) to authenticated;

create or replace function public.request_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actor uuid := public.current_user_id();
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if not exists (select 1 from public.users where id = actor and status in ('active', 'deleted')) then
    raise exception 'account unavailable' using errcode = 'P0002';
  end if;
  update public.users
  set status = 'deleted', deletion_requested_at = coalesce(deletion_requested_at, timezone('utc', now())), updated_at = timezone('utc', now())
  where id = actor;
  update public.profiles set discoverable = false, profile_visibility = 'private', updated_at = timezone('utc', now()) where user_id = actor;
  update public.user_devices set disabled_at = timezone('utc', now()) where user_id = actor and disabled_at is null;
  if not exists (
    select 1 from public.account_requests
    where user_id = actor and request_type = 'account_deletion' and status in ('pending', 'processing')
  ) then
    insert into public.account_requests (user_id, request_type, status)
    values (actor, 'account_deletion', 'pending');
  end if;
  insert into public.account_deletion_jobs (user_id, execute_after, status, attempt_count, locked_at, locked_by, last_error)
  values (actor, timezone('utc', now()) + interval '30 days', 'pending', 0, null, null, null)
  on conflict (user_id) do update set execute_after = excluded.execute_after, status = 'pending', attempt_count = 0, locked_at = null, locked_by = null, last_error = null;
  return jsonb_build_object('status', 'deleted', 'graceDays', 30, 'requestedAt', (select deletion_requested_at from public.users where id = actor));
end;
$$;

create or replace function public.cancel_account_deletion()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actor uuid := public.current_user_id(); restored_status text;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if not exists (select 1 from public.users where id = actor and status = 'deleted' and deletion_requested_at > timezone('utc', now()) - interval '30 days') then
    raise exception 'deletion grace period expired' using errcode = 'P0001';
  end if;
  restored_status := case when exists (select 1 from public.profiles where user_id = actor) then 'active' else 'pending' end;
  update public.users set status = restored_status, deletion_requested_at = null, updated_at = timezone('utc', now()) where id = actor;
  update public.account_deletion_jobs set status = 'cancelled', locked_at = null, locked_by = null where user_id = actor;
  return jsonb_build_object('status', restored_status);
end;
$$;

create or replace function public.request_data_export()
returns public.account_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actor uuid := public.current_user_id(); result public.account_requests;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  insert into public.account_requests (user_id, request_type, status) values (actor, 'data_export', 'pending') returning * into result;
  update public.users set export_requested_at = timezone('utc', now()) where id = actor;
  return result;
end;
$$;

create or replace function public.request_campus_change(p_target_campus_id uuid, p_reason text default null)
returns public.account_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actor uuid := public.current_user_id(); result public.account_requests;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if not exists (select 1 from public.campuses where id = p_target_campus_id and status = 'active') then raise exception 'campus unavailable' using errcode = 'P0002'; end if;
  insert into public.account_requests (user_id, request_type, target_campus_id, reason) values (actor, 'campus_change', p_target_campus_id, left(nullif(trim(p_reason), ''), 2000)) returning * into result;
  return result;
end;
$$;

create or replace function public.cancel_account_request(p_request_id uuid)
returns public.account_requests
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actor uuid := public.current_user_id(); result public.account_requests;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if exists (
    select 1 from public.account_requests
    where id = p_request_id and user_id = actor and request_type = 'account_deletion' and status = 'pending'
  ) then
    perform public.cancel_account_deletion();
  end if;
  update public.account_requests set status = 'cancelled' where id = p_request_id and user_id = actor and status = 'pending' returning * into result;
  if result.id is null then raise exception 'request unavailable' using errcode = 'P0002'; end if;
  return result;
end;
$$;

create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actor uuid := public.current_user_id(); result jsonb;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  update public.users set export_requested_at = timezone('utc', now()) where id = actor;
  select jsonb_build_object(
    'user', (select to_jsonb(u) - 'email' from public.users u where u.id = actor),
    'profile', (select to_jsonb(p) from public.profiles p where p.user_id = actor),
    'posts', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.posts p where p.author_id = actor), '[]'::jsonb),
    'comments', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.comments c where c.author_id = actor), '[]'::jsonb),
    'teams', coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at) from public.team_requests t where t.owner_id = actor), '[]'::jsonb),
    'applications', coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at) from public.team_applications a where a.applicant_id = actor), '[]'::jsonb),
    'connections', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.connections c where c.requester_id = actor or c.addressee_id = actor), '[]'::jsonb),
    'notifications', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at) from public.notifications n where n.user_id = actor), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke execute on function public.request_account_deletion(), public.cancel_account_deletion(), public.request_data_export(), public.request_campus_change(uuid, text), public.cancel_account_request(uuid), public.export_my_data() from public, anon;
grant execute on function public.request_account_deletion(), public.cancel_account_deletion(), public.request_data_export(), public.request_campus_change(uuid, text), public.cancel_account_request(uuid), public.export_my_data() to authenticated;

create or replace function public.purge_deleted_accounts(p_grace_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare removed_count integer;
begin
  if not public.is_service_role() then raise exception 'service role required' using errcode = '42501'; end if;
  if p_grace_days < 1 or p_grace_days > 3650 then raise exception 'invalid grace period' using errcode = '22023'; end if;
  with doomed as (
    select id from public.users where status = 'deleted' and deletion_requested_at is not null and deletion_requested_at <= timezone('utc', now()) - make_interval(days => p_grace_days)
  )
  delete from public.users where id in (select id from doomed);
  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;

create or replace function public.claim_account_deletions(p_worker_id text, p_batch_size integer default 25)
returns setof public.account_deletion_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_service_role() then raise exception 'service role required' using errcode = '42501'; end if;
  if nullif(trim(p_worker_id), '') is null or p_batch_size < 1 or p_batch_size > 100 then raise exception 'invalid claim parameters' using errcode = '22023'; end if;
  return query
  with due as (
    select job.user_id from public.account_deletion_jobs job
    where job.status in ('pending', 'failed') and job.execute_after <= timezone('utc', now())
      and (job.locked_at is null or job.locked_at < timezone('utc', now()) - interval '15 minutes')
    order by job.execute_after for update skip locked limit p_batch_size
  )
  update public.account_deletion_jobs job
  set status = 'processing', attempt_count = job.attempt_count + 1,
      locked_at = timezone('utc', now()), locked_by = trim(p_worker_id), last_error = null
  from due where job.user_id = due.user_id returning job.*;
end;
$$;

create or replace function public.fail_account_deletion(p_user_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_service_role() then raise exception 'service role required' using errcode = '42501'; end if;
  update public.account_deletion_jobs
  set status = 'failed', locked_at = null, locked_by = null, last_error = left(coalesce(p_error, 'delete failed'), 4000),
      execute_after = timezone('utc', now()) + make_interval(
        mins => least(1440, greatest(5, (power(2::numeric, least(attempt_count, 8)) * 5)::integer))
      )
  where user_id = p_user_id;
end;
$$;

revoke execute on function public.purge_deleted_accounts(integer) from public, anon, authenticated;
grant execute on function public.purge_deleted_accounts(integer) to service_role;
revoke execute on function public.claim_account_deletions(text, integer), public.fail_account_deletion(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_account_deletions(text, integer), public.fail_account_deletion(uuid, text) to service_role;

create or replace function private.emit_event_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare change_type text; previous_values jsonb; current_values jsonb; notification_key text;
begin
  if old.status is not distinct from new.status
     and old.starts_at is not distinct from new.starts_at
     and old.ends_at is not distinct from new.ends_at
     and old.venue_name is not distinct from new.venue_name
     and old.title is not distinct from new.title then
    return new;
  end if;
  change_type := case when old.status is distinct from new.status and new.status = 'cancelled' then 'cancelled'
    when old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at then 'time'
    when old.venue_name is distinct from new.venue_name then 'venue' else 'details' end;
  previous_values := jsonb_build_object('status', old.status, 'starts_at', old.starts_at, 'ends_at', old.ends_at, 'venue_name', old.venue_name, 'title', old.title);
  current_values := jsonb_build_object('status', new.status, 'starts_at', new.starts_at, 'ends_at', new.ends_at, 'venue_name', new.venue_name, 'title', new.title);
  insert into public.event_changes (event_id, change_type, previous_values, current_values) values (new.id, change_type, previous_values, current_values);
  if change_type = 'time' then
    update public.event_reminders
    set scheduled_for = new.starts_at - make_interval(mins => minutes_before), status = 'scheduled'
    where event_id = new.id and status <> 'cancelled';
  elsif change_type = 'cancelled' then
    update public.event_reminders set status = 'cancelled' where event_id = new.id and status = 'scheduled';
  end if;
  notification_key := 'event-change:' || new.id::text || ':' || new.updated_at::text || ':' || change_type;
  insert into public.notifications (user_id, type, subject_type, subject_id, payload, dedupe_key)
  select registration.user_id, case when change_type = 'cancelled' then 'event_cancelled' else 'event_changed' end, 'event', new.id,
    jsonb_build_object('event_id', new.id, 'change_type', change_type, 'title', new.title, 'starts_at', new.starts_at, 'ends_at', new.ends_at, 'venue_name', new.venue_name, 'status', new.status), notification_key || ':' || registration.user_id::text
  from public.event_registrations registration
  where registration.event_id = new.id and registration.status in ('registered', 'waitlisted')
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
  insert into public.notification_outbox (notification_id, channel, dedupe_key, status, sent_at)
  select notification.id, 'in_app', notification.dedupe_key || ':in_app', 'sent', timezone('utc', now())
  from public.notifications notification
  where notification.dedupe_key like notification_key || ':%'
  on conflict (dedupe_key) do nothing;
  return new;
end;
$$;

drop trigger if exists events_emit_change on public.events;
create trigger events_emit_change after update of status, starts_at, ends_at, venue_name, title on public.events
for each row execute function private.emit_event_change();

grant select on public.rate_limit_buckets to service_role;
