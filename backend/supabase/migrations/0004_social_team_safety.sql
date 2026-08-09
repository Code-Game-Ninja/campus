-- Student social, Team Finder, relationships, notifications, safety, and consented analytics.
-- Chat tables are intentionally excluded until the existing web chat contract is reviewed.

alter table public.users
  add column if not exists analytics_consent_at timestamptz;

alter table public.profiles
  add column if not exists connections_visibility text not null default 'private'
    check (connections_visibility in ('public', 'connections', 'private'));

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete restrict,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  visibility text not null default 'campus' check (visibility in ('campus', 'connections', 'global', 'team', 'private')),
  team_request_id uuid,
  event_id uuid references public.events(id) on delete set null,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed', 'deleted')),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((visibility = 'team' and team_request_id is not null) or (visibility <> 'team'))
);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'document', 'link')),
  storage_key text,
  mime_type text,
  byte_size bigint check (byte_size is null or byte_size > 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  url text check (url is null or url ~* '^https?://'),
  metadata jsonb not null default '{}'::jsonb,
  display_order integer not null default 0 check (display_order >= 0),
  moderation_status text not null default 'pending' check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  check (storage_key is not null or url is not null)
);

create or replace function private.enforce_post_media_limit()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if new.media_type = 'image' and (select count(*) from public.post_media where post_id = new.post_id and media_type = 'image' and id <> new.id) >= 5 then
    raise exception 'a post may contain at most five images' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists post_media_limit on public.post_media;
create trigger post_media_limit before insert or update on public.post_media for each row execute function private.enforce_post_media_limit();

create table if not exists public.post_polls (
  post_id uuid primary key references public.posts(id) on delete cascade,
  allows_multiple boolean not null default false,
  closes_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.post_poll_options (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.post_polls(post_id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 160),
  display_order integer not null check (display_order >= 0),
  unique (post_id, display_order),
  unique (post_id, label)
);

create table if not exists public.post_poll_votes (
  option_id uuid not null references public.post_poll_options(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (option_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  status text not null default 'published' check (status in ('published', 'hidden', 'removed', 'deleted')),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function private.enforce_flat_comments()
returns trigger language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if new.parent_comment_id is not null then
    raise exception 'nested comment replies are not enabled in the MVP' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_flat_only on public.comments;
create trigger comments_flat_only before insert or update on public.comments for each row execute function private.enforce_flat_comments();

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type = 'like'),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create table if not exists public.post_bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create table if not exists public.team_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  campus_id uuid not null references public.campuses(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text not null check (char_length(trim(description)) between 1 and 4000),
  team_type text not null,
  desired_member_count integer not null check (desired_member_count between 2 and 10),
  commitment_level text not null default 'flexible' check (commitment_level in ('low', 'moderate', 'high', 'flexible')),
  availability jsonb not null default '{}'::jsonb,
  application_deadline timestamptz,
  target_completion_date timestamptz,
  status text not null default 'open' check (status in ('open', 'filled', 'closed', 'cancelled', 'expired')),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (target_completion_date is null or application_deadline is null or target_completion_date >= application_deadline)
);

alter table public.posts
  add constraint posts_team_request_fk foreign key (team_request_id) references public.team_requests(id) on delete set null;

create table if not exists public.team_request_skills (
  team_request_id uuid not null references public.team_requests(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  requirement text not null check (requirement in ('required', 'preferred')),
  primary key (team_request_id, skill_id)
);

create table if not exists public.team_request_interests (
  team_request_id uuid not null references public.team_requests(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete restrict,
  primary key (team_request_id, interest_id)
);

create table if not exists public.team_applications (
  id uuid primary key default gen_random_uuid(),
  team_request_id uuid not null references public.team_requests(id) on delete cascade,
  applicant_id uuid not null references public.users(id) on delete cascade,
  message text not null default '' check (char_length(message) <= 2000),
  selected_skills jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'withdrawn', 'cancelled')),
  decided_by uuid references public.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists team_applications_active_unique
  on public.team_applications (team_request_id, applicant_id)
  where status in ('pending', 'accepted');

create table if not exists public.team_members (
  team_request_id uuid not null references public.team_requests(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default timezone('utc', now()),
  left_at timestamptz,
  primary key (team_request_id, user_id)
);

create unique index if not exists team_requests_active_owner_unique on public.team_members (team_request_id) where role = 'owner' and left_at is null;
create index if not exists team_members_user_idx on public.team_members (user_id, left_at);

create table if not exists public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users(id) on delete cascade,
  addressee_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'removed', 'cancelled', 'blocked')),
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (requester_id <> addressee_id)
);

create unique index if not exists connections_pair_unique on public.connections ((least(requester_id, addressee_id)), (greatest(requester_id, addressee_id)));
create table if not exists public.following (
  follower_id uuid not null references public.users(id) on delete cascade,
  followee_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  actor_id uuid references public.users(id) on delete set null,
  subject_type text,
  subject_id uuid,
  payload jsonb not null default '{}'::jsonb,
  in_app_read_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  category_settings jsonb not null default '{}'::jsonb,
  quiet_hours jsonb not null default '{}'::jsonb,
  history_retention_days integer check (history_retention_days is null or history_retention_days between 1 and 3650),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios', 'web', 'other')),
  push_token text,
  device_label text,
  last_seen_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (push_token)
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('user', 'post', 'comment', 'message', 'team_request', 'team_application', 'event')),
  target_id uuid not null,
  reason_code text not null,
  details text check (details is null or char_length(details) <= 4000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  resolution text,
  resolved_by uuid references public.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  action text not null check (action in ('dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban', 'restrict_posting', 'restrict_chat', 'escalate', 'restore')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.users(id) on delete set null,
  event_name text not null check (event_name ~ '^[a-z0-9_:.-]{1,100}$'),
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(properties) = 'object')
);

create index if not exists posts_feed_idx on public.posts (campus_id, status, created_at desc, id desc);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);
create index if not exists posts_search_idx on public.posts using gin ((body) gin_trgm_ops);
create index if not exists post_media_post_idx on public.post_media (post_id, display_order);
create index if not exists comments_post_idx on public.comments (post_id, created_at, id);
create index if not exists team_requests_discovery_idx on public.team_requests (status, campus_id, created_at desc, id desc);
create index if not exists team_requests_search_idx on public.team_requests using gin ((title || ' ' || description) gin_trgm_ops);
create index if not exists team_applications_request_idx on public.team_applications (team_request_id, status, created_at);
create index if not exists connections_participant_idx on public.connections (requester_id, status, updated_at desc);
create index if not exists connections_addressee_idx on public.connections (addressee_id, status, updated_at desc);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc, id desc);
create index if not exists reports_queue_idx on public.reports (status, created_at);
create index if not exists analytics_events_time_idx on public.analytics_events (occurred_at desc);

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at before update on public.posts for each row execute function private.set_updated_at();
drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at before update on public.comments for each row execute function private.set_updated_at();
drop trigger if exists team_requests_set_updated_at on public.team_requests;
create trigger team_requests_set_updated_at before update on public.team_requests for each row execute function private.set_updated_at();
drop trigger if exists team_applications_set_updated_at on public.team_applications;
create trigger team_applications_set_updated_at before update on public.team_applications for each row execute function private.set_updated_at();
drop trigger if exists connections_set_updated_at on public.connections;
create trigger connections_set_updated_at before update on public.connections for each row execute function private.set_updated_at();
drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;
create trigger notification_preferences_set_updated_at before update on public.notification_preferences for each row execute function private.set_updated_at();
drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at before update on public.reports for each row execute function private.set_updated_at();

create or replace function public.are_users_blocked(first_user uuid, second_user uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when public.current_user_id() is null or public.current_user_id() not in (first_user, second_user) then false
    else exists (select 1 from public.user_blocks b where (b.blocker_id = first_user and b.blocked_id = second_user) or (b.blocker_id = second_user and b.blocked_id = first_user))
  end;
$$;

create or replace function public.has_accepted_connection(first_user uuid, second_user uuid)
returns boolean language sql stable security invoker set search_path = public, pg_temp as $$
  select exists (select 1 from public.connections c where least(c.requester_id, c.addressee_id) = least(first_user, second_user) and greatest(c.requester_id, c.addressee_id) = greatest(first_user, second_user) and c.status = 'accepted');
$$;

create or replace function public.can_view_post(target_post_id uuid)
returns boolean language sql stable security invoker set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.posts p
    where p.id = target_post_id
      and (
        p.author_id = public.current_user_id()
        or (
          p.status = 'published'
          and not public.are_users_blocked(p.author_id, public.current_user_id())
          and (
            p.visibility = 'global'
            or (p.visibility = 'campus' and p.campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active'))
            or (p.visibility = 'connections' and public.has_accepted_connection(p.author_id, public.current_user_id()))
            or (p.visibility = 'team' and exists (select 1 from public.team_members m where m.team_request_id = p.team_request_id and m.user_id = public.current_user_id() and m.left_at is null))
          )
        )
      )
  );
$$;

create or replace function public.can_view_profile(target_user_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = target_user_id
      and (
        p.user_id = public.current_user_id()
        or (
          not public.are_users_blocked(p.user_id, public.current_user_id())
          and (
            (p.discoverable and p.profile_visibility = 'campus' and exists (
              select 1 from public.users viewer join public.users target on target.id = p.user_id
              where viewer.id = public.current_user_id() and viewer.campus_id = target.campus_id
            ))
            or (p.profile_visibility = 'connections' and public.has_accepted_connection(p.user_id, public.current_user_id()))
          )
        )
      )
  );
$$;

create or replace function private.add_team_owner()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.team_members (team_request_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

drop trigger if exists team_requests_add_owner on public.team_requests;
create trigger team_requests_add_owner after insert on public.team_requests for each row execute function private.add_team_owner();

create or replace function public.withdraw_team_application(target_application_id uuid)
returns public.team_applications
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  result public.team_applications;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  update public.team_applications
    set status = 'withdrawn', decided_by = actor, decided_at = timezone('utc', now())
    where id = target_application_id and applicant_id = actor and status = 'pending'
    returning * into result;
  if result.id is null then raise exception 'application unavailable' using errcode = 'P0002'; end if;
  return result;
end;
$$;

create or replace function public.decide_team_application(target_application_id uuid, decision text)
returns public.team_applications
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  application public.team_applications;
  target_team public.team_requests;
  active_members integer;
  result public.team_applications;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if decision not in ('accepted', 'rejected') then raise exception 'invalid application decision' using errcode = '22023'; end if;

  select * into application from public.team_applications where id = target_application_id for update;
  if not found or application.status <> 'pending' then raise exception 'application unavailable' using errcode = 'P0002'; end if;
  select * into target_team from public.team_requests where id = application.team_request_id for update;
  if target_team.owner_id <> actor or target_team.status <> 'open' then raise exception 'not permitted' using errcode = '42501'; end if;
  if public.are_users_blocked(actor, application.applicant_id) then raise exception 'application unavailable' using errcode = '42501'; end if;

  if decision = 'accepted' then
    select count(*) into active_members from public.team_members where team_request_id = target_team.id and left_at is null;
    if active_members >= target_team.desired_member_count then raise exception 'team is full' using errcode = 'P0001'; end if;
    insert into public.team_members (team_request_id, user_id, role, joined_at, left_at)
      values (target_team.id, application.applicant_id, 'member', timezone('utc', now()), null)
      on conflict (team_request_id, user_id) do update set role = 'member', joined_at = excluded.joined_at, left_at = null;
    if active_members + 1 >= target_team.desired_member_count then update public.team_requests set status = 'filled' where id = target_team.id; end if;
  end if;

  update public.team_applications set status = decision, decided_by = actor, decided_at = timezone('utc', now())
    where id = target_application_id returning * into result;
  return result;
end;
$$;

create or replace function public.request_connection(target_user_id uuid)
returns public.connections
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  result public.connections;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if actor = target_user_id then raise exception 'cannot connect to self' using errcode = '22023'; end if;
  if public.are_users_blocked(actor, target_user_id) then raise exception 'connection unavailable' using errcode = '42501'; end if;
  if not exists (select 1 from public.users u where u.id = target_user_id and u.status = 'active') then raise exception 'user unavailable' using errcode = 'P0002'; end if;

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

create or replace function public.respond_connection(target_connection_id uuid, decision text)
returns public.connections
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  result public.connections;
begin
  if decision not in ('accepted', 'declined') then raise exception 'invalid connection decision' using errcode = '22023'; end if;
  update public.connections
    set status = decision, responded_at = timezone('utc', now())
    where id = target_connection_id and addressee_id = actor and status = 'pending'
      and not public.are_users_blocked(requester_id, addressee_id)
    returning * into result;
  if result.id is null then raise exception 'connection unavailable' using errcode = 'P0002'; end if;
  return result;
end;
$$;

create or replace function public.cancel_or_remove_connection(target_connection_id uuid)
returns public.connections
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  result public.connections;
begin
  update public.connections
    set status = case when status = 'pending' and requester_id = actor then 'cancelled' else 'removed' end,
        responded_at = timezone('utc', now())
    where id = target_connection_id
      and (requester_id = actor or addressee_id = actor)
      and (status = 'accepted' or (status = 'pending' and requester_id = actor))
    returning * into result;
  if result.id is null then raise exception 'connection unavailable' using errcode = 'P0002'; end if;
  return result;
end;
$$;

alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_polls enable row level security;
alter table public.post_poll_options enable row level security;
alter table public.post_poll_votes enable row level security;
alter table public.comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_bookmarks enable row level security;
alter table public.team_requests enable row level security;
alter table public.team_request_skills enable row level security;
alter table public.team_request_interests enable row level security;
alter table public.team_applications enable row level security;
alter table public.team_members enable row level security;
alter table public.connections enable row level security;
alter table public.following enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_devices enable row level security;
alter table public.user_blocks enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.analytics_events enable row level security;

create policy posts_read_visible on public.posts for select to authenticated using (
  author_id = public.current_user_id() or (
    status = 'published' and not public.are_users_blocked(author_id, public.current_user_id()) and (
      visibility = 'global'
      or (visibility = 'campus' and campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active'))
      or (visibility = 'connections' and public.has_accepted_connection(author_id, public.current_user_id()))
      or (visibility = 'team' and exists (select 1 from public.team_members m where m.team_request_id = posts.team_request_id and m.user_id = public.current_user_id() and m.left_at is null))
    )
  )
);
create policy posts_insert_self on public.posts for insert to authenticated with check (author_id = public.current_user_id() and campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active') and status in ('published', 'deleted') and (visibility <> 'team' or exists (select 1 from public.team_members m where m.team_request_id = posts.team_request_id and m.user_id = public.current_user_id() and m.left_at is null)));
create policy posts_update_self on public.posts for update to authenticated using (author_id = public.current_user_id()) with check (author_id = public.current_user_id() and campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active') and status in ('published', 'deleted') and (visibility <> 'team' or exists (select 1 from public.team_members m where m.team_request_id = posts.team_request_id and m.user_id = public.current_user_id() and m.left_at is null)));
create policy posts_delete_self on public.posts for delete to authenticated using (author_id = public.current_user_id());

create policy post_media_visible on public.post_media for select to authenticated using (public.can_view_post(post_id));
create policy post_media_owner_write on public.post_media for all to authenticated using (exists (select 1 from public.posts p where p.id = post_media.post_id and p.author_id = public.current_user_id())) with check (exists (select 1 from public.posts p where p.id = post_media.post_id and p.author_id = public.current_user_id()));
create policy post_polls_visible on public.post_polls for select to authenticated using (public.can_view_post(post_id));
create policy post_polls_owner_write on public.post_polls for all to authenticated using (exists (select 1 from public.posts p where p.id = post_polls.post_id and p.author_id = public.current_user_id())) with check (exists (select 1 from public.posts p where p.id = post_polls.post_id and p.author_id = public.current_user_id()));
create policy post_poll_options_visible on public.post_poll_options for select to authenticated using (exists (select 1 from public.post_polls poll where poll.post_id = post_poll_options.post_id) and public.can_view_post(post_id));
create policy post_poll_options_owner_write on public.post_poll_options for all to authenticated using (exists (select 1 from public.post_polls poll join public.posts p on p.id = poll.post_id where poll.post_id = post_poll_options.post_id and p.author_id = public.current_user_id())) with check (exists (select 1 from public.post_polls poll join public.posts p on p.id = poll.post_id where poll.post_id = post_poll_options.post_id and p.author_id = public.current_user_id()));
create policy post_poll_votes_self on public.post_poll_votes for all to authenticated using (user_id = public.current_user_id() and exists (select 1 from public.post_poll_options o where o.id = post_poll_votes.option_id and public.can_view_post(o.post_id))) with check (user_id = public.current_user_id() and exists (select 1 from public.post_poll_options o where o.id = post_poll_votes.option_id and public.can_view_post(o.post_id)));
create policy comments_read_visible on public.comments for select to authenticated using (public.can_view_post(post_id));
create policy comments_insert_self on public.comments for insert to authenticated with check (author_id = public.current_user_id() and public.can_view_post(post_id));
create policy comments_update_self on public.comments for update to authenticated using (author_id = public.current_user_id()) with check (author_id = public.current_user_id());
create policy comments_delete_self on public.comments for delete to authenticated using (author_id = public.current_user_id());
create policy reactions_visible on public.post_reactions for select to authenticated using (public.can_view_post(post_id));
create policy reactions_self on public.post_reactions for all to authenticated using (user_id = public.current_user_id() and public.can_view_post(post_id)) with check (user_id = public.current_user_id() and public.can_view_post(post_id));
create policy bookmarks_self on public.post_bookmarks for all to authenticated using (user_id = public.current_user_id() and public.can_view_post(post_id)) with check (user_id = public.current_user_id() and public.can_view_post(post_id));

create policy team_requests_read on public.team_requests for select to authenticated using ((owner_id = public.current_user_id() or (status in ('open', 'filled') and deleted_at is null)) and not public.are_users_blocked(owner_id, public.current_user_id()));
create policy team_requests_insert_self on public.team_requests for insert to authenticated with check (owner_id = public.current_user_id() and campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active'));
create policy team_requests_update_owner on public.team_requests for update to authenticated using (owner_id = public.current_user_id()) with check (owner_id = public.current_user_id() and campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active'));
create policy team_requests_delete_owner on public.team_requests for delete to authenticated using (owner_id = public.current_user_id());
create policy team_request_taxonomy_read on public.team_request_skills for select to authenticated using (exists (select 1 from public.team_requests t where t.id = team_request_skills.team_request_id));
create policy team_request_taxonomy_write on public.team_request_skills for all to authenticated using (exists (select 1 from public.team_requests t where t.id = team_request_skills.team_request_id and t.owner_id = public.current_user_id())) with check (exists (select 1 from public.team_requests t where t.id = team_request_skills.team_request_id and t.owner_id = public.current_user_id()));
create policy team_request_interests_read on public.team_request_interests for select to authenticated using (exists (select 1 from public.team_requests t where t.id = team_request_interests.team_request_id));
create policy team_request_interests_write on public.team_request_interests for all to authenticated using (exists (select 1 from public.team_requests t where t.id = team_request_interests.team_request_id and t.owner_id = public.current_user_id())) with check (exists (select 1 from public.team_requests t where t.id = team_request_interests.team_request_id and t.owner_id = public.current_user_id()));
create policy team_applications_read on public.team_applications for select to authenticated using (applicant_id = public.current_user_id() or exists (select 1 from public.team_requests t where t.id = team_applications.team_request_id and t.owner_id = public.current_user_id()));
create policy team_applications_insert_self on public.team_applications for insert to authenticated with check (
  applicant_id = public.current_user_id() and status = 'pending' and decided_by is null and decided_at is null
  and exists (select 1 from public.team_requests t where t.id = team_applications.team_request_id and t.status = 'open' and t.owner_id <> public.current_user_id() and (t.application_deadline is null or t.application_deadline >= timezone('utc', now())))
  and not public.are_users_blocked(applicant_id, (select owner_id from public.team_requests where id = team_request_id))
);
create policy team_members_read_participant on public.team_members for select to authenticated using (user_id = public.current_user_id() or exists (select 1 from public.team_requests t where t.id = team_members.team_request_id and t.owner_id = public.current_user_id()));

create policy connections_participants on public.connections for select to authenticated using ((requester_id = public.current_user_id() or addressee_id = public.current_user_id()) and not public.are_users_blocked(requester_id, addressee_id));
create policy following_self on public.following for all to authenticated using (follower_id = public.current_user_id()) with check (follower_id = public.current_user_id());

create policy notifications_self on public.notifications for select to authenticated using (user_id = public.current_user_id());
create policy notifications_mark_read on public.notifications for update to authenticated using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());
create policy notification_preferences_self on public.notification_preferences for all to authenticated using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());
create policy devices_self on public.user_devices for all to authenticated using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());
create policy blocks_self on public.user_blocks for all to authenticated using (blocker_id = public.current_user_id()) with check (blocker_id = public.current_user_id() and blocked_id <> public.current_user_id());
create policy reports_self on public.reports for insert to authenticated with check (reporter_id = public.current_user_id() and status = 'open' and resolution is null and resolved_by is null and resolved_at is null);
create policy reports_read_self on public.reports for select to authenticated using (reporter_id = public.current_user_id());
create policy analytics_consent_insert on public.analytics_events for insert to authenticated with check (user_id = public.current_user_id() and exists (select 1 from public.users u where u.id = public.current_user_id() and u.analytics_consent_at is not null));

revoke all on table public.posts, public.post_media, public.post_polls, public.post_poll_options, public.post_poll_votes, public.comments, public.post_reactions, public.post_bookmarks, public.team_requests, public.team_request_skills, public.team_request_interests, public.team_applications, public.team_members, public.connections, public.following, public.notifications, public.notification_preferences, public.user_devices, public.user_blocks, public.reports, public.moderation_actions, public.audit_logs, public.analytics_events from anon;
grant select, insert, update, delete on public.posts, public.post_media, public.post_polls, public.post_poll_options, public.post_poll_votes, public.comments, public.post_reactions, public.post_bookmarks, public.team_requests, public.team_request_skills, public.team_request_interests, public.following, public.notification_preferences, public.user_devices, public.user_blocks, public.reports to authenticated;
grant select on public.connections to authenticated;
grant select, insert on public.team_applications to authenticated;
grant select on public.team_members to authenticated;
grant select, update (in_app_read_at) on public.notifications to authenticated;
grant select, insert on public.analytics_events to authenticated;
revoke all on public.moderation_actions, public.audit_logs from authenticated, anon;
grant update (analytics_consent_at) on public.users to authenticated;
revoke execute on function public.withdraw_team_application(uuid), public.decide_team_application(uuid, text), public.request_connection(uuid), public.respond_connection(uuid, text), public.cancel_or_remove_connection(uuid) from public, anon;
grant execute on function public.withdraw_team_application(uuid), public.decide_team_application(uuid, text), public.request_connection(uuid), public.respond_connection(uuid, text), public.cancel_or_remove_connection(uuid) to authenticated;

drop policy if exists profiles_read_permitted on public.profiles;
create policy profiles_read_permitted on public.profiles for select to authenticated using (
  user_id = public.current_user_id()
  or (
    not public.are_users_blocked(user_id, public.current_user_id())
    and (
      (discoverable and profile_visibility = 'campus' and exists (
        select 1 from public.users viewer join public.users target on target.id = profiles.user_id
        where viewer.id = public.current_user_id() and viewer.campus_id = target.campus_id
      ))
      or (profile_visibility = 'connections' and public.has_accepted_connection(user_id, public.current_user_id()))
    )
  )
);

drop policy if exists profile_skills_read_self on public.profile_skills;
create policy profile_skills_read_permitted on public.profile_skills for select to authenticated using (public.can_view_profile(user_id));
drop policy if exists profile_interests_read_self on public.profile_interests;
create policy profile_interests_read_permitted on public.profile_interests for select to authenticated using (public.can_view_profile(user_id));
drop policy if exists profile_links_read_self on public.profile_links;
create policy profile_links_read_permitted on public.profile_links for select to authenticated using (public.can_view_profile(user_id));
