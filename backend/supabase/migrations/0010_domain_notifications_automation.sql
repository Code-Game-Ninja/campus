-- Domain notification fan-out, Team Finder expiry, and post media storage.

create or replace function private.enqueue_notification(
  p_user_id uuid,
  p_type text,
  p_actor_id uuid,
  p_subject_type text,
  p_subject_id uuid,
  p_payload jsonb,
  p_dedupe_key text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare notification_id uuid;
begin
  if p_user_id is null or p_user_id = p_actor_id then return null; end if;
  insert into public.notifications (user_id, type, actor_id, subject_type, subject_id, payload, dedupe_key)
  values (p_user_id, p_type, p_actor_id, p_subject_type, p_subject_id, coalesce(p_payload, '{}'::jsonb), p_dedupe_key)
  on conflict (dedupe_key) where dedupe_key is not null do update set dedupe_key = excluded.dedupe_key
  returning id into notification_id;
  if private.notification_channel_enabled(p_user_id, 'in_app', p_type) then
    insert into public.notification_outbox (notification_id, channel, dedupe_key, status, sent_at)
    values (notification_id, 'in_app', p_dedupe_key || ':in_app', 'sent', timezone('utc', now())) on conflict (dedupe_key) do nothing;
  end if;
  if private.notification_channel_enabled(p_user_id, 'email', p_type) then
    insert into public.notification_outbox (notification_id, channel, dedupe_key)
    values (notification_id, 'email', p_dedupe_key || ':email') on conflict (dedupe_key) do nothing;
  end if;
  if private.notification_channel_enabled(p_user_id, 'push', p_type) then
    insert into public.notification_outbox (notification_id, channel, dedupe_key)
    values (notification_id, 'push', p_dedupe_key || ':push') on conflict (dedupe_key) do nothing;
  end if;
  return notification_id;
end;
$$;

create or replace function private.notify_post_interaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare owner_id uuid; notification_type text; entity_id uuid;
begin
  if tg_table_name = 'comments' then
    select author_id into owner_id from public.posts where id = new.post_id;
    notification_type := 'comment'; entity_id := new.id;
    perform private.enqueue_notification(owner_id, notification_type, new.author_id, 'post', new.post_id,
      jsonb_build_object('post_id', new.post_id, 'comment_id', new.id), 'comment:' || new.id::text);
  else
    select author_id into owner_id from public.posts where id = new.post_id;
    notification_type := 'post_reaction'; entity_id := new.post_id;
    perform private.enqueue_notification(owner_id, notification_type, new.user_id, 'post', new.post_id,
      jsonb_build_object('post_id', new.post_id, 'reaction', new.reaction_type), 'reaction:' || new.post_id::text || ':' || new.user_id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists comments_notify_owner on public.comments;
create trigger comments_notify_owner after insert on public.comments for each row execute function private.notify_post_interaction();
drop trigger if exists reactions_notify_owner on public.post_reactions;
create trigger reactions_notify_owner after insert on public.post_reactions for each row execute function private.notify_post_interaction();

create or replace function private.notify_connection_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform private.enqueue_notification(new.addressee_id, 'connection_request', new.requester_id, 'connection', new.id,
      jsonb_build_object('connection_id', new.id), 'connection-request:' || new.id::text);
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'accepted' then
    perform private.enqueue_notification(new.requester_id, 'connection_accepted', new.addressee_id, 'connection', new.id,
      jsonb_build_object('connection_id', new.id), 'connection-accepted:' || new.id::text);
  end if;
  return new;
end;
$$;

drop trigger if exists connections_notify on public.connections;
create trigger connections_notify after insert or update of status on public.connections for each row execute function private.notify_connection_change();

create or replace function private.notify_team_application_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare owner_id uuid; team_title text;
begin
  select owner_id, title into owner_id, team_title from public.team_requests where id = new.team_request_id;
  if tg_op = 'INSERT' and new.status = 'pending' and new.application_kind = 'application' then
    perform private.enqueue_notification(owner_id, 'team_application', new.applicant_id, 'team_request', new.team_request_id,
      jsonb_build_object('application_id', new.id, 'team_title', team_title), 'team-application:' || new.id::text);
  elsif tg_op = 'INSERT' and new.status = 'pending' and new.application_kind = 'invitation' then
    perform private.enqueue_notification(new.applicant_id, 'team_invitation', new.invited_by, 'team_request', new.team_request_id,
      jsonb_build_object('application_id', new.id, 'team_title', team_title), 'team-invitation:' || new.id::text);
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status in ('accepted', 'rejected') then
    perform private.enqueue_notification(new.applicant_id, 'team_application_' || new.status, new.decided_by, 'team_request', new.team_request_id,
      jsonb_build_object('application_id', new.id, 'team_title', team_title), 'team-decision:' || new.id::text || ':' || new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists team_applications_notify on public.team_applications;
create trigger team_applications_notify after insert or update of status on public.team_applications for each row execute function private.notify_team_application_change();

create or replace function private.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare recipient record;
begin
  if new.message_type = 'system' then return new; end if;
  for recipient in
    select member.user_id from public.conversation_members member
    where member.conversation_id = new.conversation_id and member.user_id <> new.sender_id
      and member.left_at is null and member.notification_mode <> 'muted'
  loop
    perform private.enqueue_notification(recipient.user_id, 'chat_message', new.sender_id, 'conversation', new.conversation_id,
      jsonb_build_object('conversation_id', new.conversation_id, 'message_id', new.id, 'message_type', new.message_type),
      'chat-message:' || new.id::text || ':' || recipient.user_id::text);
  end loop;
  return new;
end;
$$;

drop trigger if exists messages_notify_members on public.messages;
create trigger messages_notify_members after insert on public.messages for each row execute function private.notify_chat_message();

create or replace function public.expire_team_requests(p_batch_size integer default 500)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare changed integer;
begin
  if not public.is_service_role() then raise exception 'service role required' using errcode = '42501'; end if;
  if p_batch_size < 1 or p_batch_size > 5000 then raise exception 'invalid batch size' using errcode = '22023'; end if;
  with due as (
    select id from public.team_requests where status = 'open' and application_deadline < timezone('utc', now())
    order by application_deadline for update skip locked limit p_batch_size
  )
  update public.team_requests set status = 'expired' where id in (select id from due);
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke execute on function public.expire_team_requests(integer) from public, anon, authenticated;
grant execute on function public.expire_team_requests(integer) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists post_media_read on storage.objects;
create policy post_media_read on storage.objects for select to authenticated using (
  bucket_id = 'post-media' and exists (
    select 1 from public.post_media media
    where media.storage_key = name and public.can_view_post(media.post_id)
  )
);
drop policy if exists post_media_insert on storage.objects;
create policy post_media_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'post-media' and (storage.foldername(name))[1] = public.current_user_id()::text
);
drop policy if exists post_media_delete on storage.objects;
create policy post_media_delete on storage.objects for delete to authenticated using (
  bucket_id = 'post-media' and (storage.foldername(name))[1] = public.current_user_id()::text
);
