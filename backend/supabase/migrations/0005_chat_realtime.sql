-- CampusSphere chat, adapted from the existing ChitChat Supabase contract.
-- Preserves conversations/messages and typing:<conversation-id> channels while
-- replacing participant arrays and client-owned authorization with normalized
-- memberships, RLS, and transactional RPCs.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid references public.campuses(id) on delete restrict,
  type text not null check (type in ('direct', 'team', 'group', 'event')),
  name text check (name is null or char_length(trim(name)) between 1 and 120),
  created_by uuid references public.users(id) on delete set null,
  direct_connection_id uuid unique references public.connections(id) on delete cascade,
  team_request_id uuid unique references public.team_requests(id) on delete cascade,
  event_id uuid unique references public.events(id) on delete cascade,
  last_message_id uuid,
  last_message_preview text,
  last_message_time timestamptz,
  last_message_sender uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((type = 'direct') = (direct_connection_id is not null)),
  check ((type = 'team') = (team_request_id is not null)),
  check ((type = 'event') = (event_id is not null)),
  check (type <> 'group' or created_by is not null)
);

create table if not exists public.conversation_members (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  notification_mode text not null default 'all' check (notification_mode in ('all', 'mentions', 'muted')),
  joined_at timestamptz not null default timezone('utc', now()),
  left_at timestamptz,
  last_read_at timestamptz,
  last_read_message_id uuid,
  unique (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  client_message_id text not null check (char_length(client_message_id) between 8 and 128),
  message_type text not null default 'text' check (message_type in ('text', 'file', 'link', 'gif', 'sticker', 'system')),
  text text check (text is null or char_length(text) <= 4000),
  link_url text check (link_url is null or link_url ~* '^https?://'),
  reply_to_message_id uuid references public.messages(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'visible' check (status in ('visible', 'deleted', 'removed')),
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (sender_id, client_message_id),
  check (jsonb_typeof(metadata) = 'object'),
  check (
    status <> 'visible'
    or message_type = 'system'
    or nullif(trim(coalesce(text, '')), '') is not null
    or link_url is not null
    or message_type in ('file', 'gif', 'sticker')
  )
);

alter table public.conversations
  add constraint conversations_last_message_fk foreign key (last_message_id) references public.messages(id) on delete set null;

alter table public.conversation_members
  add constraint conversation_members_last_read_fk foreign key (last_read_message_id) references public.messages(id) on delete set null;

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  uploader_id uuid not null references public.users(id) on delete cascade,
  storage_key text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null,
  byte_size bigint not null check (byte_size between 1 and 20971520),
  metadata jsonb not null default '{}'::jsonb,
  scan_status text not null default 'pending' check (scan_status in ('pending', 'clean', 'rejected', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction text not null check (char_length(reaction) between 1 and 32),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, user_id, reaction)
);

create table if not exists public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, user_id),
  check (read_at is null or delivered_at is null or read_at >= delivered_at)
);

create table if not exists public.chat_message_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  event_type text not null check (event_type in ('message_created', 'message_edited', 'message_deleted', 'reaction_changed', 'read_changed', 'membership_changed')),
  actor_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_presence (
  user_id uuid primary key references public.users(id) on delete cascade,
  status text not null default 'offline' check (status in ('online', 'away', 'offline')),
  last_seen_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists conversations_updated_idx on public.conversations (updated_at desc, id desc);
create index if not exists conversation_members_user_idx on public.conversation_members (user_id, left_at, conversation_id);
create index if not exists messages_conversation_cursor_idx on public.messages (conversation_id, created_at desc, id desc);
create index if not exists messages_search_idx on public.messages using gin ((coalesce(text, '')) gin_trgm_ops);
create index if not exists message_receipts_user_idx on public.message_receipts (user_id, read_at, message_id);
create index if not exists chat_message_events_room_idx on public.chat_message_events (room_id, created_at desc, id desc);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations for each row execute function private.set_updated_at();
drop trigger if exists messages_set_updated_at on public.messages;
create trigger messages_set_updated_at before update on public.messages for each row execute function private.set_updated_at();
drop trigger if exists user_presence_set_updated_at on public.user_presence;
create trigger user_presence_set_updated_at before update on public.user_presence for each row execute function private.set_updated_at();

create or replace function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.conversation_members member
    where member.conversation_id = target_conversation_id
      and member.user_id = public.current_user_id()
      and member.left_at is null
  );
$$;

create or replace function public.can_access_conversation(target_conversation_id uuid)
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1
    from public.conversations conversation
    where conversation.id = target_conversation_id
      and public.is_conversation_member(conversation.id)
      and (
        conversation.type <> 'direct'
        or exists (
          select 1 from public.connections connection
          where connection.id = conversation.direct_connection_id
            and connection.status = 'accepted'
            and not public.are_users_blocked(connection.requester_id, connection.addressee_id)
        )
      )
  );
$$;

create or replace function private.emit_chat_event()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  target_room uuid;
  target_message uuid;
  event_name text;
begin
  if tg_op = 'DELETE' then
    target_room := old.conversation_id;
    target_message := old.id;
    event_name := 'message_deleted';
  else
    target_room := new.conversation_id;
    target_message := new.id;
    event_name := case
      when tg_op = 'INSERT' then 'message_created'
      when new.status <> old.status and new.status in ('deleted', 'removed') then 'message_deleted'
      else 'message_edited'
    end;
  end if;
  insert into public.chat_message_events (room_id, message_id, event_type, actor_id)
  values (target_room, target_message, event_name, public.current_user_id());
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists messages_emit_event on public.messages;
create trigger messages_emit_event after insert or update on public.messages for each row execute function private.emit_chat_event();

create or replace function private.refresh_conversation_summary()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'visible' then
    update public.conversations
      set last_message_id = new.id,
          last_message_preview = case
            when new.message_type = 'text' then left(coalesce(new.text, ''), 180)
            when new.message_type = 'system' then left(coalesce(new.text, 'System message'), 180)
            else '[' || new.message_type || ']'
          end,
          last_message_time = new.created_at,
          last_message_sender = new.sender_id
      where id = new.conversation_id;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_refresh_conversation on public.messages;
create trigger messages_refresh_conversation after insert on public.messages for each row execute function private.refresh_conversation_summary();

create or replace function public.create_direct_conversation(other_user_id uuid)
returns public.conversations
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  connection public.connections;
  result public.conversations;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select * into connection
  from public.connections candidate
  where candidate.status = 'accepted'
    and least(candidate.requester_id, candidate.addressee_id) = least(actor, other_user_id)
    and greatest(candidate.requester_id, candidate.addressee_id) = greatest(actor, other_user_id)
  for update;
  if not found or public.are_users_blocked(actor, other_user_id) then raise exception 'direct chat unavailable' using errcode = '42501'; end if;

  insert into public.conversations (campus_id, type, created_by, direct_connection_id)
  values ((select campus_id from public.users where id = actor), 'direct', actor, connection.id)
  on conflict (direct_connection_id) do update set updated_at = excluded.updated_at
  returning * into result;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (result.id, actor, 'member'), (result.id, other_user_id, 'member')
  on conflict (conversation_id, user_id) do update set left_at = null;
  return result;
end;
$$;

create or replace function public.ensure_team_conversation(target_team_request_id uuid)
returns public.conversations
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  target_team public.team_requests;
  result public.conversations;
begin
  select * into target_team from public.team_requests where id = target_team_request_id;
  if not found then raise exception 'team unavailable' using errcode = 'P0002'; end if;
  if actor is not null and target_team.owner_id <> actor and not public.is_service_role() then raise exception 'not permitted' using errcode = '42501'; end if;

  insert into public.conversations (campus_id, type, name, created_by, team_request_id)
  values (target_team.campus_id, 'team', target_team.title, target_team.owner_id, target_team.id)
  on conflict (team_request_id) do update set name = excluded.name
  returning * into result;

  insert into public.conversation_members (conversation_id, user_id, role, left_at)
  select result.id, member.user_id, case when member.role = 'owner' then 'owner' else 'member' end, member.left_at
  from public.team_members member where member.team_request_id = target_team.id
  on conflict (conversation_id, user_id) do update set role = excluded.role, left_at = excluded.left_at;
  return result;
end;
$$;

create or replace function public.create_group_conversation(group_name text, member_ids uuid[] default '{}'::uuid[])
returns public.conversations
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  member_id uuid;
  result public.conversations;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if char_length(trim(group_name)) not between 1 and 120 then raise exception 'invalid group name' using errcode = '22023'; end if;
  if coalesce(array_length(member_ids, 1), 0) > 99 then raise exception 'group member limit exceeded' using errcode = '22023'; end if;

  foreach member_id in array member_ids loop
    if member_id <> actor and (not public.has_accepted_connection(actor, member_id) or public.are_users_blocked(actor, member_id)) then
      raise exception 'group member unavailable' using errcode = '42501';
    end if;
  end loop;

  insert into public.conversations (campus_id, type, name, created_by)
  values ((select campus_id from public.users where id = actor), 'group', trim(group_name), actor)
  returning * into result;
  insert into public.conversation_members (conversation_id, user_id, role) values (result.id, actor, 'owner');
  insert into public.conversation_members (conversation_id, user_id, role)
  select result.id, candidate, 'member' from unnest(member_ids) candidate where candidate <> actor
  on conflict (conversation_id, user_id) do nothing;
  return result;
end;
$$;

create or replace function public.ensure_event_conversation(target_event_id uuid)
returns public.conversations
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  target_event public.events;
  result public.conversations;
begin
  if not public.is_service_role() then raise exception 'not permitted' using errcode = '42501'; end if;
  select * into target_event from public.events where id = target_event_id and status in ('published', 'completed');
  if not found then raise exception 'event unavailable' using errcode = 'P0002'; end if;
  insert into public.conversations (campus_id, type, name, event_id)
  values (target_event.campus_id, 'event', target_event.title, target_event.id)
  on conflict (event_id) do update set name = excluded.name
  returning * into result;
  insert into public.conversation_members (conversation_id, user_id, role)
  select result.id, registration.user_id, 'member'
  from public.event_registrations registration
  where registration.event_id = target_event.id and registration.status = 'registered'
  on conflict (conversation_id, user_id) do update set left_at = null;
  return result;
end;
$$;

create or replace function public.send_message(
  target_conversation_id uuid,
  target_client_message_id text,
  target_message_type text default 'text',
  target_text text default null,
  target_link_url text default null,
  target_reply_to_message_id uuid default null,
  target_metadata jsonb default '{}'::jsonb
)
returns public.messages
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  result public.messages;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if not public.can_access_conversation(target_conversation_id) then raise exception 'conversation unavailable' using errcode = '42501'; end if;
  if target_reply_to_message_id is not null and not exists (select 1 from public.messages m where m.id = target_reply_to_message_id and m.conversation_id = target_conversation_id and m.status = 'visible') then
    raise exception 'reply target unavailable' using errcode = 'P0002';
  end if;
  insert into public.messages (conversation_id, sender_id, client_message_id, message_type, text, link_url, reply_to_message_id, metadata)
  values (target_conversation_id, actor, target_client_message_id, target_message_type, nullif(trim(target_text), ''), target_link_url, target_reply_to_message_id, coalesce(target_metadata, '{}'::jsonb))
  on conflict (sender_id, client_message_id) do nothing
  returning * into result;
  if result.id is null then
    select * into result from public.messages where sender_id = actor and client_message_id = target_client_message_id;
  end if;
  return result;
end;
$$;

create or replace function public.edit_message(target_message_id uuid, replacement_text text)
returns public.messages
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare result public.messages;
begin
  update public.messages
    set text = nullif(trim(replacement_text), ''), edited_at = timezone('utc', now())
    where id = target_message_id and sender_id = public.current_user_id() and status = 'visible'
      and message_type in ('text', 'link') and created_at >= timezone('utc', now()) - interval '15 minutes'
    returning * into result;
  if result.id is null then raise exception 'message cannot be edited' using errcode = '42501'; end if;
  return result;
end;
$$;

create or replace function public.delete_message(target_message_id uuid)
returns public.messages
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare result public.messages;
begin
  update public.messages
    set text = null, link_url = null, metadata = '{}'::jsonb, status = 'deleted', deleted_at = timezone('utc', now())
    where id = target_message_id and sender_id = public.current_user_id() and status = 'visible'
      and created_at >= timezone('utc', now()) - interval '15 minutes'
    returning * into result;
  if result.id is null then raise exception 'message cannot be deleted' using errcode = '42501'; end if;
  return result;
end;
$$;

create or replace function public.mark_conversation_read(target_conversation_id uuid, through_message_id uuid default null)
returns public.conversation_members
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  read_time timestamptz := timezone('utc', now());
  result public.conversation_members;
begin
  if not public.can_access_conversation(target_conversation_id) then raise exception 'conversation unavailable' using errcode = '42501'; end if;
  if through_message_id is not null then
    select created_at into read_time from public.messages where id = through_message_id and conversation_id = target_conversation_id;
    if read_time is null then raise exception 'message unavailable' using errcode = 'P0002'; end if;
  end if;
  update public.conversation_members set last_read_at = read_time, last_read_message_id = through_message_id
    where conversation_id = target_conversation_id and user_id = actor and left_at is null returning * into result;
  insert into public.message_receipts (message_id, user_id, delivered_at, read_at)
  select message.id, actor, coalesce(receipt.delivered_at, timezone('utc', now())), read_time
  from public.messages message
  left join public.message_receipts receipt on receipt.message_id = message.id and receipt.user_id = actor
  where message.conversation_id = target_conversation_id and message.sender_id <> actor and message.created_at <= read_time
  on conflict (message_id, user_id) do update set delivered_at = coalesce(public.message_receipts.delivered_at, excluded.delivered_at), read_at = greatest(public.message_receipts.read_at, excluded.read_at);
  insert into public.chat_message_events (room_id, message_id, event_type, actor_id) values (target_conversation_id, through_message_id, 'read_changed', actor);
  return result;
end;
$$;

create or replace function public.set_message_reaction(target_message_id uuid, target_reaction text, enabled boolean default true)
returns boolean
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  target_room uuid;
begin
  select conversation_id into target_room from public.messages where id = target_message_id and status = 'visible';
  if target_room is null or not public.can_access_conversation(target_room) then raise exception 'message unavailable' using errcode = '42501'; end if;
  if char_length(target_reaction) not between 1 and 32 then raise exception 'invalid reaction' using errcode = '22023'; end if;
  if enabled then
    insert into public.message_reactions (message_id, user_id, reaction) values (target_message_id, actor, target_reaction) on conflict do nothing;
  else
    delete from public.message_reactions where message_id = target_message_id and user_id = actor and reaction = target_reaction;
  end if;
  insert into public.chat_message_events (room_id, message_id, event_type, actor_id) values (target_room, target_message_id, 'reaction_changed', actor);
  return enabled;
end;
$$;

create or replace function public.attach_message_file(
  target_message_id uuid,
  target_storage_key text,
  target_file_name text,
  target_mime_type text,
  target_byte_size bigint,
  target_metadata jsonb default '{}'::jsonb
)
returns public.message_attachments
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  actor uuid := public.current_user_id();
  target_room uuid;
  result public.message_attachments;
begin
  select conversation_id into target_room from public.messages where id = target_message_id and sender_id = actor and status = 'visible';
  if target_room is null or not public.can_access_conversation(target_room) then raise exception 'message unavailable' using errcode = '42501'; end if;
  if target_storage_key !~ ('^' || target_room::text || '/' || actor::text || '/') then raise exception 'invalid attachment path' using errcode = '42501'; end if;
  insert into public.message_attachments (message_id, uploader_id, storage_key, file_name, mime_type, byte_size, metadata)
  values (target_message_id, actor, target_storage_key, target_file_name, target_mime_type, target_byte_size, coalesce(target_metadata, '{}'::jsonb))
  returning * into result;
  return result;
end;
$$;

create or replace function public.search_messages(search_text text, result_limit integer default 50)
returns setof public.messages
language sql stable security definer set search_path = public, pg_temp as $$
  select message.*
  from public.messages message
  where message.status = 'visible'
    and message.text ilike '%' || replace(replace(search_text, '%', '\\%'), '_', '\\_') || '%' escape '\\'
    and public.can_access_conversation(message.conversation_id)
    and not public.are_users_blocked(message.sender_id, public.current_user_id())
  order by message.created_at desc, message.id desc
  limit least(greatest(result_limit, 1), 100);
$$;

create or replace function private.sync_team_chat_membership()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare target_conversation_id uuid;
begin
  if tg_op = 'DELETE' then
    select id into target_conversation_id from public.conversations where team_request_id = old.team_request_id;
  else
    select id into target_conversation_id from public.conversations where team_request_id = new.team_request_id;
  end if;
  if target_conversation_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  insert into public.conversation_members (conversation_id, user_id, role, joined_at, left_at)
  values (
    target_conversation_id,
    case when tg_op = 'DELETE' then old.user_id else new.user_id end,
    case when (case when tg_op = 'DELETE' then old.role else new.role end) = 'owner' then 'owner' else 'member' end,
    case when tg_op = 'DELETE' then old.joined_at else new.joined_at end,
    case when tg_op = 'DELETE' then timezone('utc', now()) else new.left_at end
  )
  on conflict (conversation_id, user_id) do update set role = excluded.role, joined_at = excluded.joined_at, left_at = excluded.left_at;
  insert into public.chat_message_events (room_id, event_type, actor_id) values (target_conversation_id, 'membership_changed', public.current_user_id());
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists team_members_sync_chat on public.team_members;
create trigger team_members_sync_chat after insert or update or delete on public.team_members for each row execute function private.sync_team_chat_membership();

create or replace function private.create_team_chat()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public.ensure_team_conversation(new.id);
  return new;
end;
$$;

drop trigger if exists team_requests_create_chat on public.team_requests;
create trigger team_requests_create_chat after insert on public.team_requests for each row execute function private.create_team_chat();

create or replace function private.sync_event_chat_membership()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare target_conversation_id uuid;
begin
  select id into target_conversation_id from public.conversations where event_id = new.event_id;
  if target_conversation_id is null then return new; end if;
  insert into public.conversation_members (conversation_id, user_id, role, left_at)
  values (target_conversation_id, new.user_id, 'member', case when new.status = 'registered' then null else timezone('utc', now()) end)
  on conflict (conversation_id, user_id) do update set left_at = excluded.left_at;
  return new;
end;
$$;

drop trigger if exists event_registrations_sync_chat on public.event_registrations;
create trigger event_registrations_sync_chat after insert or update on public.event_registrations for each row execute function private.sync_event_chat_membership();

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.message_attachments enable row level security;
alter table public.message_reactions enable row level security;
alter table public.message_receipts enable row level security;
alter table public.chat_message_events enable row level security;
alter table public.user_presence enable row level security;

create policy conversations_read_member on public.conversations for select to authenticated using (public.can_access_conversation(id));
create policy conversation_members_read_member on public.conversation_members for select to authenticated using (public.can_access_conversation(conversation_id));
create policy conversation_members_preferences_self on public.conversation_members for update to authenticated using (user_id = public.current_user_id() and public.can_access_conversation(conversation_id)) with check (user_id = public.current_user_id());
create policy messages_read_member on public.messages for select to authenticated using (public.can_access_conversation(conversation_id) and not public.are_users_blocked(sender_id, public.current_user_id()));
create policy message_attachments_read_member on public.message_attachments for select to authenticated using (exists (select 1 from public.messages message where message.id = message_attachments.message_id and public.can_access_conversation(message.conversation_id) and not public.are_users_blocked(message.sender_id, public.current_user_id())));
create policy message_reactions_read_member on public.message_reactions for select to authenticated using (exists (select 1 from public.messages message where message.id = message_reactions.message_id and public.can_access_conversation(message.conversation_id)));
create policy message_receipts_read_member on public.message_receipts for select to authenticated using (exists (select 1 from public.messages message where message.id = message_receipts.message_id and public.can_access_conversation(message.conversation_id)));
create policy chat_message_events_read_member on public.chat_message_events for select to authenticated using (public.can_access_conversation(room_id));
create policy user_presence_read_connections on public.user_presence for select to authenticated using (user_id = public.current_user_id() or public.has_accepted_connection(user_id, public.current_user_id()));
create policy user_presence_write_self on public.user_presence for all to authenticated using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());

revoke all on public.conversations, public.conversation_members, public.messages, public.message_attachments, public.message_reactions, public.message_receipts, public.chat_message_events, public.user_presence from anon;
revoke all on public.conversations, public.conversation_members, public.messages, public.message_attachments, public.message_reactions, public.message_receipts, public.chat_message_events from authenticated;
grant select on public.conversations, public.conversation_members, public.messages, public.message_attachments, public.message_reactions, public.message_receipts, public.chat_message_events to authenticated;
grant update (notification_mode) on public.conversation_members to authenticated;
grant select, insert, update, delete on public.user_presence to authenticated;

revoke execute on function public.create_direct_conversation(uuid), public.ensure_team_conversation(uuid), public.create_group_conversation(text, uuid[]), public.ensure_event_conversation(uuid), public.send_message(uuid, text, text, text, text, uuid, jsonb), public.edit_message(uuid, text), public.delete_message(uuid), public.mark_conversation_read(uuid, uuid), public.set_message_reaction(uuid, text, boolean), public.attach_message_file(uuid, text, text, text, bigint, jsonb), public.search_messages(text, integer) from public, anon;
grant execute on function public.create_direct_conversation(uuid), public.ensure_team_conversation(uuid), public.create_group_conversation(text, uuid[]), public.send_message(uuid, text, text, text, text, uuid, jsonb), public.edit_message(uuid, text), public.delete_message(uuid), public.mark_conversation_read(uuid, uuid), public.set_message_reaction(uuid, text, boolean), public.attach_message_file(uuid, text, text, text, bigint, jsonb), public.search_messages(text, integer) to authenticated;
revoke execute on function public.ensure_event_conversation(uuid) from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/zip']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy chat_attachments_read_member on storage.objects for select to authenticated using (
  bucket_id = 'chat-attachments'
  and public.can_access_conversation(((storage.foldername(name))[1])::uuid)
);
create policy chat_attachments_insert_member on storage.objects for insert to authenticated with check (
  bucket_id = 'chat-attachments'
  and public.can_access_conversation(((storage.foldername(name))[1])::uuid)
  and (storage.foldername(name))[2] = public.current_user_id()::text
);
create policy chat_attachments_delete_owner on storage.objects for delete to authenticated using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[2] = public.current_user_id()::text
);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations') then
    alter publication supabase_realtime add table public.conversations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_message_events') then
    alter publication supabase_realtime add table public.chat_message_events;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_presence') then
    alter publication supabase_realtime add table public.user_presence;
  end if;
end;
$$;

-- Backfill chats for Team Finder requests created before this migration.
do $$
declare team record;
begin
  for team in select id from public.team_requests loop
    perform public.ensure_team_conversation(team.id);
  end loop;
end;
$$;

comment on table public.conversations is 'ChitChat-compatible room identity with normalized authorization.';
comment on table public.messages is 'Persisted chat messages; mutations are restricted to RPC functions.';
comment on table public.chat_message_events is 'Small Realtime invalidation events consumed by the mobile Phoenix client.';
comment on function public.send_message(uuid, text, text, text, text, uuid, jsonb) is 'Idempotent message send keyed by sender_id and client_message_id.';
comment on function public.edit_message(uuid, text) is 'Edits eligible text/link messages for fifteen minutes after creation.';
comment on function public.delete_message(uuid) is 'Soft deletes eligible messages for fifteen minutes after creation.';
comment on function public.attach_message_file(uuid, text, text, text, bigint, jsonb) is 'Associates a scanned/private-storage attachment with a message owned by the caller.';
