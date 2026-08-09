-- Published event discovery and attendee participation.
-- Event authoring remains service-role/web-portal only.

create table if not exists public.event_organizers (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete restrict,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  logo_key text,
  website_url text check (website_url is null or website_url ~* '^https?://'),
  contact_email citext,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.event_organizers(id) on delete restrict,
  campus_id uuid not null references public.campuses(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 160),
  summary text not null default '' check (char_length(summary) <= 500),
  description text not null check (char_length(description) <= 10000),
  category text not null,
  tags text[] not null default '{}',
  venue_name text,
  address_text text,
  latitude numeric(9, 6) check (latitude is null or latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude is null or longitude between -180 and 180),
  timezone text not null default 'Asia/Kolkata',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  registration_deadline timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  cover_key text,
  public_url text check (public_url is null or public_url ~* '^https?://'),
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'completed')),
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at),
  check (registration_deadline is null or registration_deadline <= starts_at),
  check (status <> 'published' or published_at is not null)
);

create table if not exists public.event_registrations (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('registered', 'waitlisted', 'cancelled')),
  waitlist_position bigint,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (event_id, user_id),
  check ((status = 'waitlisted' and waitlist_position is not null) or (status <> 'waitlisted' and waitlist_position is null))
);

create table if not exists public.event_bookmarks (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (event_id, user_id)
);

create table if not exists public.event_reminders (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  minutes_before integer not null default 1440 check (minutes_before between 0 and 10080),
  scheduled_for timestamptz not null,
  channels text[] not null default array['in_app']::text[],
  status text not null default 'scheduled' check (status in ('scheduled', 'sent', 'cancelled', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (event_id, user_id)
);

create table if not exists public.event_changes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  change_type text not null check (change_type in ('time', 'venue', 'cancelled', 'details')),
  previous_values jsonb not null default '{}'::jsonb,
  current_values jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists events_discovery_idx on public.events (campus_id, status, starts_at, id);
create index if not exists events_category_idx on public.events (campus_id, category, starts_at);
create index if not exists events_search_idx on public.events using gin ((title || ' ' || summary || ' ' || description) gin_trgm_ops);
create unique index if not exists event_waitlist_position_unique on public.event_registrations (event_id, waitlist_position) where waitlist_position is not null;
create index if not exists event_registrations_status_idx on public.event_registrations (event_id, status, waitlist_position);
create index if not exists event_reminders_due_idx on public.event_reminders (status, scheduled_for) where status = 'scheduled';

drop trigger if exists event_organizers_set_updated_at on public.event_organizers;
create trigger event_organizers_set_updated_at before update on public.event_organizers for each row execute function private.set_updated_at();
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events for each row execute function private.set_updated_at();
drop trigger if exists event_registrations_set_updated_at on public.event_registrations;
create trigger event_registrations_set_updated_at before update on public.event_registrations for each row execute function private.set_updated_at();
drop trigger if exists event_reminders_set_updated_at on public.event_reminders;
create trigger event_reminders_set_updated_at before update on public.event_reminders for each row execute function private.set_updated_at();

create or replace function public.register_for_event(target_event_id uuid)
returns public.event_registrations
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  target_event public.events;
  registered_total integer;
  next_position bigint;
  result public.event_registrations;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select * into target_event from public.events where id = target_event_id for update;
  if not found or target_event.status <> 'published' then raise exception 'event unavailable' using errcode = 'P0002'; end if;
  if target_event.registration_deadline is not null and target_event.registration_deadline < timezone('utc', now()) then raise exception 'registration closed' using errcode = 'P0001'; end if;
  if target_event.campus_id <> (select campus_id from public.users where id = actor and status = 'active') then raise exception 'event unavailable' using errcode = '42501'; end if;

  select count(*) into registered_total from public.event_registrations where event_id = target_event_id and status = 'registered';
  if target_event.capacity is null or registered_total < target_event.capacity then
    insert into public.event_registrations (event_id, user_id, status, waitlist_position)
    values (target_event_id, actor, 'registered', null)
    on conflict (event_id, user_id) do update set status = 'registered', waitlist_position = null
    returning * into result;
  else
    select coalesce(max(waitlist_position), 0) + 1 into next_position from public.event_registrations where event_id = target_event_id;
    insert into public.event_registrations (event_id, user_id, status, waitlist_position)
    values (target_event_id, actor, 'waitlisted', next_position)
    on conflict (event_id, user_id) do update set status = 'waitlisted', waitlist_position = excluded.waitlist_position
    returning * into result;
  end if;
  return result;
end;
$$;

create or replace function public.cancel_event_registration(target_event_id uuid)
returns public.event_registrations
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  previous_status text;
  result public.event_registrations;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  perform 1 from public.events where id = target_event_id for update;
  select status into previous_status from public.event_registrations where event_id = target_event_id and user_id = actor for update;
  update public.event_registrations set status = 'cancelled', waitlist_position = null where event_id = target_event_id and user_id = actor returning * into result;
  if previous_status = 'registered' then
    update public.event_registrations set status = 'registered', waitlist_position = null
    where (event_id, user_id) = (
      select event_id, user_id from public.event_registrations
      where event_id = target_event_id and status = 'waitlisted'
      order by waitlist_position, created_at, user_id limit 1 for update skip locked
    );
  end if;
  return result;
end;
$$;

alter table public.event_organizers enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.event_bookmarks enable row level security;
alter table public.event_reminders enable row level security;
alter table public.event_changes enable row level security;

create policy event_organizers_read_event_metadata on public.event_organizers for select to authenticated using (status = 'active');
create policy events_read_same_campus on public.events for select to authenticated using (
  campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active')
  and (status = 'published' or (status = 'cancelled' and exists (
    select 1 from public.event_registrations registration where registration.event_id = events.id and registration.user_id = public.current_user_id()
  )))
);
create policy event_registrations_read_self on public.event_registrations for select to authenticated using (user_id = public.current_user_id());
create policy event_bookmarks_self on public.event_bookmarks for all to authenticated using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());
create policy event_reminders_self on public.event_reminders for all to authenticated using (
  user_id = public.current_user_id()
  and exists (select 1 from public.events event where event.id = event_reminders.event_id and event.campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active'))
) with check (
  user_id = public.current_user_id()
  and exists (select 1 from public.events event where event.id = event_reminders.event_id and event.campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active') and event.status in ('published', 'cancelled'))
);
create policy event_changes_read_affected on public.event_changes for select to authenticated using (exists (
  select 1 from public.events event where event.id = event_changes.event_id and (
    event.status = 'published' or exists (
      select 1 from public.event_registrations registration where registration.event_id = event.id and registration.user_id = public.current_user_id()
    )
  )
));

revoke all on table public.event_organizers, public.events, public.event_registrations, public.event_changes from anon, authenticated;
grant select on table public.event_organizers, public.events, public.event_registrations, public.event_changes to authenticated;
grant select, insert, delete on table public.event_bookmarks to authenticated;
grant select, insert, update, delete on table public.event_reminders to authenticated;
revoke execute on function public.register_for_event(uuid), public.cancel_event_registration(uuid) from public, anon;
grant execute on function public.register_for_event(uuid), public.cancel_event_registration(uuid) to authenticated;
