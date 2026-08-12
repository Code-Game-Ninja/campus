-- Student-owned study resources: private upload, integrity completion, review state, and signed download.

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete restrict,
  uploader_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('notes', 'past_paper', 'assignment', 'lab_manual', 'presentation')),
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text check (description is null or char_length(description) <= 4000),
  subject_id text,
  mime_type text not null,
  byte_size bigint not null check (byte_size between 1 and 52428800),
  storage_key text not null unique,
  rating_avg numeric(4,2) not null default 0 check (rating_avg between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  status text not null default 'needs_review' check (status in ('needs_review', 'approved', 'rejected')),
  scan_state text not null default 'pending' check (scan_state in ('pending', 'clean', 'quarantined', 'rejected')),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.resource_bookmarks (
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (resource_id, user_id)
);

drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at before update on public.resources for each row execute function private.set_updated_at();

create index if not exists resources_campus_state_idx on public.resources (campus_id, status, scan_state, created_at desc) where deleted_at is null;
create index if not exists resources_uploader_idx on public.resources (uploader_id, created_at desc) where deleted_at is null;

alter table public.resources enable row level security;
alter table public.resource_bookmarks enable row level security;
revoke all on table public.resources from anon;
revoke all on table public.resource_bookmarks from anon;
grant select on table public.resources to authenticated;
grant select on table public.resource_bookmarks to authenticated;

create policy resources_read_permitted on public.resources for select to authenticated using (
  deleted_at is null
  and exists (select 1 from public.users viewer where viewer.id = public.current_user_id() and viewer.campus_id = resources.campus_id)
  and (uploader_id = public.current_user_id() or (status = 'approved' and scan_state = 'clean'))
);
create policy resource_bookmarks_read_own on public.resource_bookmarks for select to authenticated using (user_id = public.current_user_id());
create policy resource_bookmarks_insert_own on public.resource_bookmarks for insert to authenticated with check (user_id = public.current_user_id());
create policy resource_bookmarks_delete_own on public.resource_bookmarks for delete to authenticated using (user_id = public.current_user_id());

insert into storage.buckets (id, name, public)
values ('study-resources', 'study-resources', false)
on conflict (id) do nothing;

drop policy if exists study_resources_upload_own on storage.objects;
create policy study_resources_upload_own on storage.objects for insert to authenticated with check (
  bucket_id = 'study-resources'
  and (storage.foldername(name))[1] = public.current_user_id()::text
  and exists (select 1 from public.resources where uploader_id = public.current_user_id() and storage_key = name)
);
drop policy if exists study_resources_read_permitted on storage.objects;
create policy study_resources_read_permitted on storage.objects for select to authenticated using (
  bucket_id = 'study-resources'
  and exists (
    select 1 from public.resources resource
    join public.users viewer on viewer.id = public.current_user_id()
    where resource.storage_key = objects.name
      and resource.deleted_at is null
      and resource.campus_id = viewer.campus_id
      and (resource.uploader_id = public.current_user_id() or (resource.status = 'approved' and resource.scan_state = 'clean'))
  )
);
drop policy if exists study_resources_delete_own on storage.objects;
create policy study_resources_delete_own on storage.objects for delete to authenticated using (
  bucket_id = 'study-resources' and (storage.foldername(name))[1] = public.current_user_id()::text
);

create or replace function public.create_resource_upload_intent_mobile(
  p_title text,
  p_description text default null,
  p_type text default 'notes',
  p_mime_type text default 'application/pdf',
  p_byte_size bigint default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  actor_campus uuid;
  resource_id uuid := gen_random_uuid();
  key text;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select campus_id into actor_campus from public.users where id = actor and status in ('pending', 'active');
  if actor_campus is null then raise exception 'select a campus first' using errcode = 'P0001'; end if;
  if p_byte_size < 1 or p_byte_size > 52428800 then raise exception 'file exceeds 50 MB limit' using errcode = '22023'; end if;
  if p_type not in ('notes', 'past_paper', 'assignment', 'lab_manual', 'presentation') then raise exception 'invalid resource type' using errcode = '22023'; end if;
  if p_mime_type not in ('application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation') then
    raise exception 'unsupported document type' using errcode = '22023';
  end if;
  key := actor::text || '/' || resource_id::text || '/material';
  insert into public.resources (id, campus_id, uploader_id, type, title, description, mime_type, byte_size, storage_key)
  values (resource_id, actor_campus, actor, p_type, trim(p_title), nullif(trim(p_description), ''), p_mime_type, p_byte_size, key);
  return jsonb_build_object(
    'resourceId', resource_id,
    'storageKey', key,
    'uploadUrl', 'supabase://study-resources/' || key,
    'expiresAt', timezone('utc', now() + interval '15 minutes')
  );
end;
$$;

create or replace function public.complete_resource_upload_mobile(p_resource_id uuid, p_byte_size bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  resource public.resources;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select * into resource from public.resources where id = p_resource_id and uploader_id = actor and deleted_at is null for update;
  if resource.id is null then raise exception 'resource unavailable' using errcode = '42501'; end if;
  if p_byte_size < 1 or p_byte_size > 52428800 or p_byte_size <> resource.byte_size then raise exception 'uploaded byte size mismatch' using errcode = '22023'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'study-resources' and name = resource.storage_key) then raise exception 'uploaded object not found' using errcode = 'P0002'; end if;
  update public.resources set byte_size = p_byte_size, scan_state = 'clean', status = 'approved' where id = resource.id;
  return jsonb_build_object('resourceId', resource.id, 'status', 'approved');
end;
$$;

create or replace function public.list_resources_mobile(p_mine boolean default false, p_limit integer default 100)
returns setof public.resources
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select resource.*
  from public.resources resource
  where resource.deleted_at is null
    and (
      (coalesce(p_mine, false) and resource.uploader_id = public.current_user_id())
      or
      (not coalesce(p_mine, false) and resource.status = 'approved' and resource.scan_state = 'clean')
    )
  order by resource.created_at desc, resource.id desc
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;

create or replace function public.update_resource_mobile(p_resource_id uuid, p_title text, p_description text default null)
returns public.resources
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare actor uuid := public.current_user_id(); result public.resources;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  update public.resources set title = trim(p_title), description = nullif(trim(p_description), '') where id = p_resource_id and uploader_id = actor and deleted_at is null returning * into result;
  if result.id is null then raise exception 'resource unavailable' using errcode = '42501'; end if;
  return result;
end;
$$;

create or replace function public.delete_resource_mobile(p_resource_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare actor uuid := public.current_user_id();
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  update public.resources set deleted_at = timezone('utc', now()) where id = p_resource_id and uploader_id = actor and deleted_at is null;
  if not found then raise exception 'resource unavailable' using errcode = '42501'; end if;
  return jsonb_build_object('deleted', true, 'resourceId', p_resource_id);
end;
$$;

create or replace function public.set_bookmark_mobile(p_target_type text, p_target_id uuid, p_bookmarked boolean)
returns jsonb language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare actor uuid := public.current_user_id();
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if p_target_type = 'resource' then
    if not exists (select 1 from public.resources resource where resource.id = p_target_id and resource.deleted_at is null and (resource.uploader_id = actor or (resource.status = 'approved' and resource.scan_state = 'clean')) and resource.campus_id = (select campus_id from public.users where id = actor)) then raise exception 'resource unavailable' using errcode = '42501'; end if;
    if p_bookmarked then insert into public.resource_bookmarks(resource_id, user_id) values (p_target_id, actor) on conflict do nothing; else delete from public.resource_bookmarks where resource_id = p_target_id and user_id = actor; end if;
    return jsonb_build_object('bookmarked', p_bookmarked);
  end if;
  if p_target_type = 'event' then
    if not exists (select 1 from public.events e join public.users u on u.id = actor where e.id = p_target_id and e.status = 'published' and e.campus_id = u.campus_id) then raise exception 'event unavailable' using errcode = '42501'; end if;
    if p_bookmarked then insert into public.event_bookmarks(event_id, user_id) values (p_target_id, actor) on conflict do nothing; else delete from public.event_bookmarks where event_id = p_target_id and user_id = actor; end if;
    return jsonb_build_object('bookmarked', p_bookmarked);
  end if;
  if p_target_type = 'post' then
    if not public.can_view_post(p_target_id) then raise exception 'post unavailable' using errcode = '42501'; end if;
    if p_bookmarked then insert into public.post_bookmarks(post_id, user_id) values (p_target_id, actor) on conflict do nothing; else delete from public.post_bookmarks where post_id = p_target_id and user_id = actor; end if;
    return jsonb_build_object('bookmarked', p_bookmarked);
  end if;
  raise exception 'invalid bookmark target' using errcode = '22023';
end;
$$;

alter table public.reports drop constraint if exists reports_target_type_check;
alter table public.reports add constraint reports_target_type_check check (target_type in ('user', 'post', 'comment', 'message', 'team_request', 'team_application', 'event', 'resource'));

create or replace function public.create_report_mobile(p_target_type text, p_target_id uuid, p_reason text, p_details text default null)
returns public.reports language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare actor uuid := public.current_user_id(); result public.reports;
begin
  if p_target_type not in ('user', 'post', 'comment', 'message', 'team_request', 'team_application', 'event', 'resource') then raise exception 'invalid report target' using errcode = '22023'; end if;
  insert into public.reports(reporter_id, target_type, target_id, reason_code, details) values (actor, p_target_type, p_target_id, coalesce(nullif(trim(p_reason), ''), 'other'), nullif(trim(p_details), '')) returning * into result;
  return result;
end;
$$;

revoke all on function public.create_resource_upload_intent_mobile(text, text, text, text, bigint) from public;
revoke all on function public.complete_resource_upload_mobile(uuid, bigint) from public;
revoke all on function public.list_resources_mobile(boolean, integer) from public;
revoke all on function public.update_resource_mobile(uuid, text, text) from public;
revoke all on function public.delete_resource_mobile(uuid) from public;
grant execute on function public.create_resource_upload_intent_mobile(text, text, text, text, bigint) to authenticated;
grant execute on function public.complete_resource_upload_mobile(uuid, bigint) to authenticated;
grant execute on function public.list_resources_mobile(boolean, integer) to authenticated;
grant execute on function public.update_resource_mobile(uuid, text, text) to authenticated;
grant execute on function public.delete_resource_mobile(uuid) to authenticated;
