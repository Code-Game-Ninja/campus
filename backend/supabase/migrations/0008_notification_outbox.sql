-- Reliable in-app notification creation and provider-neutral delivery outbox.
-- Invocation is intentionally service-role/job-only; no email or push provider
-- is configured by this migration.

alter table public.notifications
  add column if not exists dedupe_key text;

create unique index if not exists notifications_dedupe_uidx
  on public.notifications (dedupe_key)
  where dedupe_key is not null;

create table if not exists public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email', 'push')),
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  available_at timestamptz not null default timezone('utc', now()),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 20),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists notification_outbox_due_idx
  on public.notification_outbox (available_at, created_at)
  where status in ('pending', 'failed');

drop trigger if exists notification_outbox_set_updated_at on public.notification_outbox;
create trigger notification_outbox_set_updated_at
before update on public.notification_outbox
for each row execute function private.set_updated_at();

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
  select case target_channel
    when 'in_app' then coalesce(p.in_app_enabled, true)
    when 'email' then coalesce(p.email_enabled, true)
    when 'push' then coalesce(p.push_enabled, false)
    else false
  end
  and coalesce((p.category_settings -> target_category ->> target_channel)::boolean, true)
  from (select 1) seed
  left join public.notification_preferences p on p.user_id = target_user_id
$$;

create or replace function public.enqueue_due_event_reminders(batch_size integer default 100)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  queued_count integer := 0;
  reminder record;
  notification_id uuid;
  reminder_key text;
begin
  if batch_size < 1 or batch_size > 500 then
    raise exception 'batch_size must be between 1 and 500' using errcode = '22023';
  end if;

  for reminder in
    select r.event_id, r.user_id, r.scheduled_for, r.minutes_before,
           e.title, e.starts_at, e.venue_name, e.status as event_status
    from public.event_reminders r
    join public.events e on e.id = r.event_id
    where r.status = 'scheduled'
      and r.scheduled_for <= timezone('utc', now())
      and e.status in ('published', 'cancelled')
    order by r.scheduled_for, r.event_id, r.user_id
    for update of r skip locked
    limit batch_size
  loop
    reminder_key := 'event-reminder:' || reminder.event_id::text || ':' || reminder.user_id::text || ':' || reminder.scheduled_for::text;

    insert into public.notifications (user_id, type, subject_type, subject_id, payload, dedupe_key)
    values (
      reminder.user_id,
      case when reminder.event_status = 'cancelled' then 'event_cancelled' else 'event_reminder' end,
      'event',
      reminder.event_id,
      jsonb_build_object(
        'event_id', reminder.event_id,
        'title', reminder.title,
        'starts_at', reminder.starts_at,
        'venue_name', reminder.venue_name,
        'minutes_before', reminder.minutes_before,
        'event_status', reminder.event_status
      ),
      reminder_key
    )
    on conflict (dedupe_key) where dedupe_key is not null
    do update set dedupe_key = excluded.dedupe_key
    returning id into notification_id;

    if private.notification_channel_enabled(reminder.user_id, 'in_app', 'event_reminders') then
      insert into public.notification_outbox (notification_id, channel, dedupe_key, status, sent_at)
      values (notification_id, 'in_app', reminder_key || ':in_app', 'sent', timezone('utc', now()))
      on conflict (dedupe_key) do nothing;
    end if;

    if private.notification_channel_enabled(reminder.user_id, 'email', 'event_reminders') then
      insert into public.notification_outbox (notification_id, channel, dedupe_key)
      values (notification_id, 'email', reminder_key || ':email')
      on conflict (dedupe_key) do nothing;
    end if;

    if private.notification_channel_enabled(reminder.user_id, 'push', 'event_reminders') then
      insert into public.notification_outbox (notification_id, channel, dedupe_key)
      values (notification_id, 'push', reminder_key || ':push')
      on conflict (dedupe_key) do nothing;
    end if;

    update public.event_reminders
    set status = 'sent'
    where event_id = reminder.event_id and user_id = reminder.user_id;

    queued_count := queued_count + 1;
  end loop;

  return queued_count;
end;
$$;

create or replace function public.claim_notification_outbox(worker_id text, batch_size integer default 50)
returns setof public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if nullif(trim(worker_id), '') is null then
    raise exception 'worker_id is required' using errcode = '22023';
  end if;
  if batch_size < 1 or batch_size > 200 then
    raise exception 'batch_size must be between 1 and 200' using errcode = '22023';
  end if;

  return query
  with due as (
    select o.id
    from public.notification_outbox o
    where o.status in ('pending', 'failed')
      and o.attempt_count < o.max_attempts
      and o.available_at <= timezone('utc', now())
      and (o.locked_at is null or o.locked_at < timezone('utc', now()) - interval '10 minutes')
    order by o.available_at, o.created_at
    for update skip locked
    limit batch_size
  )
  update public.notification_outbox o
  set status = 'processing',
      locked_at = timezone('utc', now()),
      locked_by = trim(worker_id),
      attempt_count = o.attempt_count + 1,
      last_error = null
  from due
  where o.id = due.id
  returning o.*;
end;
$$;

create or replace function public.complete_notification_delivery(
  outbox_id uuid,
  delivered boolean,
  error_message text default null,
  retry_after_seconds integer default 60
)
returns public.notification_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.notification_outbox;
begin
  if retry_after_seconds < 1 or retry_after_seconds > 86400 then
    raise exception 'retry_after_seconds must be between 1 and 86400' using errcode = '22023';
  end if;

  update public.notification_outbox o
  set status = case
        when delivered then 'sent'
        when o.attempt_count >= o.max_attempts then 'cancelled'
        else 'failed'
      end,
      sent_at = case when delivered then timezone('utc', now()) else null end,
      available_at = case when delivered then o.available_at else timezone('utc', now()) + make_interval(secs => retry_after_seconds) end,
      locked_at = null,
      locked_by = null,
      last_error = case when delivered then null else left(coalesce(error_message, 'delivery failed'), 4000) end
  where o.id = outbox_id and o.status = 'processing'
  returning o.* into result;

  if result.id is null then
    raise exception 'outbox item is not processing or does not exist' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

alter table public.notification_outbox enable row level security;

revoke all on table public.notification_outbox from anon, authenticated;
grant all on table public.notification_outbox to service_role;
revoke all on function public.enqueue_due_event_reminders(integer) from public, anon, authenticated;
revoke all on function public.claim_notification_outbox(text, integer) from public, anon, authenticated;
revoke all on function public.complete_notification_delivery(uuid, boolean, text, integer) from public, anon, authenticated;
grant execute on function public.enqueue_due_event_reminders(integer) to service_role;
grant execute on function public.claim_notification_outbox(text, integer) to service_role;
grant execute on function public.complete_notification_delivery(uuid, boolean, text, integer) to service_role;
