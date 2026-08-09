-- Enforce moderator restrictions and retention cleanup at database boundary.

create table if not exists public.user_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  restriction text not null check (restriction in ('posting', 'chat')),
  reason text,
  imposed_by uuid references public.users(id) on delete set null,
  imposed_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  revoked_at timestamptz
);

create unique index if not exists user_restrictions_active_uidx
  on public.user_restrictions (user_id, restriction)
  where revoked_at is null;

alter table public.user_restrictions enable row level security;
revoke all on public.user_restrictions from anon, authenticated;
grant all on public.user_restrictions to service_role;

create or replace function public.has_active_restriction(p_user_id uuid, p_restriction text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_restrictions
    where user_id = p_user_id and restriction = p_restriction and revoked_at is null
      and (expires_at is null or expires_at > timezone('utc', now()))
  );
$$;

create or replace function private.enforce_content_restriction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare actor uuid;
begin
  actor := case tg_table_name when 'posts' then new.author_id when 'comments' then new.author_id else new.owner_id end;
  if actor is null or (not public.is_service_role() and actor <> public.current_user_id()) then
    raise exception 'content owner mismatch' using errcode = '42501';
  end if;
  if public.has_active_restriction(actor, 'posting') then raise exception 'posting restricted' using errcode = '42501'; end if;
  return new;
end;
$$;

create or replace function private.enforce_chat_restriction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.sender_id is null or (not public.is_service_role() and new.sender_id <> public.current_user_id()) then
    raise exception 'message sender mismatch' using errcode = '42501';
  end if;
  if public.has_active_restriction(new.sender_id, 'chat') then raise exception 'chat restricted' using errcode = '42501'; end if;
  return new;
end;
$$;

drop trigger if exists posts_restriction on public.posts;
create trigger posts_restriction before insert or update of body, visibility, team_request_id, event_id on public.posts for each row execute function private.enforce_content_restriction();
drop trigger if exists comments_restriction on public.comments;
create trigger comments_restriction before insert or update of body, parent_comment_id on public.comments for each row execute function private.enforce_content_restriction();
drop trigger if exists team_requests_restriction on public.team_requests;
create trigger team_requests_restriction before insert or update of title, description, team_type, desired_member_count, commitment_level, availability, application_deadline on public.team_requests for each row execute function private.enforce_content_restriction();
drop trigger if exists messages_restriction on public.messages;
create trigger messages_restriction before insert or update of text, link_url, reply_to_message_id, metadata on public.messages for each row execute function private.enforce_chat_restriction();

create or replace function private.sync_moderation_restriction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.target_type = 'user' and new.action in ('restrict_posting', 'restrict_chat') then
    insert into public.user_restrictions (user_id, restriction, reason, imposed_by)
    values (new.target_id, case when new.action = 'restrict_posting' then 'posting' else 'chat' end, new.reason, new.actor_id)
    on conflict (user_id, restriction) where revoked_at is null
    do update set reason = excluded.reason, imposed_by = excluded.imposed_by, imposed_at = timezone('utc', now()), expires_at = null;
  elsif new.target_type = 'user' and new.action = 'restore' then
    update public.user_restrictions set revoked_at = timezone('utc', now()) where user_id = new.target_id and revoked_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists moderation_sync_restriction on public.moderation_actions;
create trigger moderation_sync_restriction after insert on public.moderation_actions for each row execute function private.sync_moderation_restriction();

create or replace function public.cleanup_retention()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare notifications_removed integer; rate_buckets_removed integer; presence_removed integer;
begin
  if not public.is_service_role() then raise exception 'service role required' using errcode = '42501'; end if;
  delete from public.notifications n
  where n.created_at < timezone('utc', now()) - make_interval(days => coalesce((select history_retention_days from public.notification_preferences p where p.user_id = n.user_id), 90));
  get diagnostics notifications_removed = row_count;
  delete from public.rate_limit_buckets where window_started_at < timezone('utc', now()) - interval '2 days';
  get diagnostics rate_buckets_removed = row_count;
  delete from public.user_presence where status = 'offline' and last_seen_at < timezone('utc', now()) - interval '90 days';
  get diagnostics presence_removed = row_count;
  return jsonb_build_object('notifications', notifications_removed, 'rateBuckets', rate_buckets_removed, 'presence', presence_removed);
end;
$$;

revoke execute on function public.cleanup_retention() from public, anon, authenticated;
grant execute on function public.cleanup_retention() to service_role;
