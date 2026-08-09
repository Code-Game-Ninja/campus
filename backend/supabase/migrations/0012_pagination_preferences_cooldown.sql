-- Stable cursor pagination, quiet-hour preference helpers, connection cooldown.

-- Add quiet-hour suppression after applied migration 0008. Keep 0008 immutable.
create or replace function private.notification_channel_enabled(
  target_user_id uuid,
  target_channel text,
  target_category text
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (
    case target_channel
      when 'in_app' then coalesce(p.in_app_enabled, true)
      when 'email' then coalesce(p.email_enabled, true)
      when 'push' then coalesce(p.push_enabled, false)
      else false
    end
    and coalesce((p.category_settings -> target_category ->> target_channel)::boolean, true)
  )
  and not (
    target_channel in ('email', 'push')
    and nullif(p.quiet_hours ->> 'start', '') is not null
    and nullif(p.quiet_hours ->> 'end', '') is not null
    and case
      when (p.quiet_hours ->> 'start')::time <= (p.quiet_hours ->> 'end')::time then
        (timezone(coalesce(nullif(p.quiet_hours ->> 'timezone', ''), 'UTC'), now()))::time between (p.quiet_hours ->> 'start')::time and (p.quiet_hours ->> 'end')::time
      else
        (timezone(coalesce(nullif(p.quiet_hours ->> 'timezone', ''), 'UTC'), now()))::time >= (p.quiet_hours ->> 'start')::time
        or (timezone(coalesce(nullif(p.quiet_hours ->> 'timezone', ''), 'UTC'), now()))::time <= (p.quiet_hours ->> 'end')::time
    end
  )
  from (select 1) seed
  left join public.notification_preferences p on p.user_id = target_user_id
$$;

create or replace function public.request_connection(target_user_id uuid)
returns public.connections
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare actor uuid := public.current_user_id(); result public.connections; existing public.connections;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if actor = target_user_id then raise exception 'cannot connect to self' using errcode = '22023'; end if;
  if public.are_users_blocked(actor, target_user_id) then raise exception 'connection unavailable' using errcode = '42501'; end if;
  if not exists (select 1 from public.users u where u.id = target_user_id and u.status = 'active') then raise exception 'user unavailable' using errcode = 'P0002'; end if;
  select * into existing from public.connections
  where least(requester_id, addressee_id) = least(actor, target_user_id) and greatest(requester_id, addressee_id) = greatest(actor, target_user_id)
  for update;
  if found and existing.status in ('declined', 'removed', 'cancelled') and existing.responded_at > timezone('utc', now()) - interval '24 hours' then
    raise exception 'connection request cooldown active' using errcode = 'P0001';
  end if;
  insert into public.connections (requester_id, addressee_id, status, responded_at)
  values (actor, target_user_id, 'pending', null)
  on conflict ((least(requester_id, addressee_id)), (greatest(requester_id, addressee_id)))
  do update set requester_id = excluded.requester_id, addressee_id = excluded.addressee_id, status = 'pending', responded_at = null
    where public.connections.status in ('declined', 'removed', 'cancelled')
  returning * into result;
  if result.id is null then raise exception 'connection already exists' using errcode = '23505'; end if;
  return result;
end;
$$;

create or replace function public.update_notification_preferences(
  p_category text,
  p_in_app boolean default null,
  p_email boolean default null,
  p_push boolean default null,
  p_quiet_start text default null,
  p_quiet_end text default null,
  p_timezone text default null
)
returns public.notification_preferences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actor uuid := public.current_user_id(); result public.notification_preferences; settings jsonb; quiet jsonb;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_category is null or p_category !~ '^[a-z0-9_:-]{1,80}$' then raise exception 'invalid notification category' using errcode = '22023'; end if;
  if p_quiet_start is not null and nullif(p_quiet_start, '') is not null then perform p_quiet_start::time; end if;
  if p_quiet_end is not null and nullif(p_quiet_end, '') is not null then perform p_quiet_end::time; end if;
  if p_timezone is not null and nullif(p_timezone, '') is not null
     and not exists (select 1 from pg_timezone_names where name = p_timezone) then
    raise exception 'invalid notification timezone' using errcode = '22023';
  end if;
  select category_settings, quiet_hours into settings, quiet from public.notification_preferences where user_id = actor;
  settings := coalesce(settings, '{}'::jsonb) || jsonb_build_object(p_category, jsonb_strip_nulls(jsonb_build_object('in_app', p_in_app, 'email', p_email, 'push', p_push)));
  quiet := coalesce(quiet, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object('start', nullif(p_quiet_start, ''), 'end', nullif(p_quiet_end, ''), 'timezone', nullif(p_timezone, '')));
  insert into public.notification_preferences (user_id, category_settings, quiet_hours)
  values (actor, settings, quiet)
  on conflict (user_id) do update set category_settings = excluded.category_settings, quiet_hours = excluded.quiet_hours
  returning * into result;
  return result;
end;
$$;

create or replace function public.feed_page(p_limit integer default 25, p_before_created_at timestamptz default null, p_before_id uuid default null)
returns setof public.posts language sql stable security invoker set search_path = public, pg_temp as $$
  select p.* from public.posts p
  where public.can_view_post(p.id) and (p_before_created_at is null or (p.created_at, p.id) < (p_before_created_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by p.created_at desc, p.id desc limit least(greatest(coalesce(p_limit, 25), 1), 100);
$$;

create or replace function public.events_page(p_limit integer default 25, p_after_starts_at timestamptz default null, p_after_id uuid default null)
returns setof public.events language sql stable security invoker set search_path = public, pg_temp as $$
  select e.* from public.events e
  where e.campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active') and e.status = 'published'
    and (p_after_starts_at is null or (e.starts_at, e.id) > (p_after_starts_at, coalesce(p_after_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  order by e.starts_at asc, e.id asc limit least(greatest(coalesce(p_limit, 25), 1), 100);
$$;

create or replace function public.team_requests_page(p_limit integer default 25, p_before_created_at timestamptz default null, p_before_id uuid default null)
returns setof public.team_requests language sql stable security invoker set search_path = public, pg_temp as $$
  select t.* from public.team_requests t
  where t.status = 'open' and t.deleted_at is null and t.campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active')
    and not public.are_users_blocked(t.owner_id, public.current_user_id())
    and (p_before_created_at is null or (t.created_at, t.id) < (p_before_created_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by t.created_at desc, t.id desc limit least(greatest(coalesce(p_limit, 25), 1), 100);
$$;

create or replace function public.notifications_page(p_limit integer default 25, p_before_created_at timestamptz default null, p_before_id uuid default null, p_unread_only boolean default false)
returns setof public.notifications language sql stable security invoker set search_path = public, pg_temp as $$
  select n.* from public.notifications n
  where n.user_id = public.current_user_id() and (not p_unread_only or n.in_app_read_at is null)
    and (p_before_created_at is null or (n.created_at, n.id) < (p_before_created_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by n.created_at desc, n.id desc limit least(greatest(coalesce(p_limit, 25), 1), 100);
$$;

revoke execute on function public.update_notification_preferences(text, boolean, boolean, boolean, text, text, text), public.feed_page(integer, timestamptz, uuid), public.events_page(integer, timestamptz, uuid), public.team_requests_page(integer, timestamptz, uuid), public.notifications_page(integer, timestamptz, uuid, boolean) from public, anon;
grant execute on function public.update_notification_preferences(text, boolean, boolean, boolean, text, text, text), public.feed_page(integer, timestamptz, uuid), public.events_page(integer, timestamptz, uuid), public.team_requests_page(integer, timestamptz, uuid), public.notifications_page(integer, timestamptz, uuid, boolean) to authenticated;
