-- Mobile domain helpers that preserve RLS boundaries while returning the
-- aggregate or state-machine information needed by attendee/student screens.

alter table public.team_applications
  add column if not exists application_kind text not null default 'application'
    check (application_kind in ('application', 'invitation')),
  add column if not exists invited_by uuid references public.users(id) on delete set null;

create or replace function public.event_registered_count(target_event_id uuid)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.event_registrations registration
  join public.events event on event.id = registration.event_id
  where registration.event_id = target_event_id
    and registration.status = 'registered'
    and event.campus_id = (select campus_id from public.users where id = public.current_user_id() and status = 'active');
$$;

create or replace function public.invite_to_team(target_team_request_id uuid, target_user_id uuid)
returns public.team_applications
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare actor uuid := public.current_user_id(); result public.team_applications;
begin
  if not exists (select 1 from public.team_requests where id = target_team_request_id and owner_id = actor and status = 'open') then
    raise exception 'not permitted' using errcode = '42501';
  end if;
  if public.are_users_blocked(actor, target_user_id) then raise exception 'user unavailable' using errcode = '42501'; end if;
  insert into public.team_applications (team_request_id, applicant_id, status, application_kind, invited_by)
  values (target_team_request_id, target_user_id, 'pending', 'invitation', actor)
  on conflict (team_request_id, applicant_id) where status in ('pending', 'accepted')
  do update set status = 'pending', application_kind = 'invitation', invited_by = actor, decided_by = null, decided_at = null
  returning * into result;
  return result;
end;
$$;

create or replace function public.respond_team_invitation(target_application_id uuid, decision text)
returns public.team_applications
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  application public.team_applications;
  target_team public.team_requests;
  active_members integer;
  result public.team_applications;
begin
  if decision not in ('accepted', 'rejected') then raise exception 'invalid invitation decision' using errcode = '22023'; end if;
  select * into application from public.team_applications
    where id = target_application_id and applicant_id = actor and application_kind = 'invitation' and status = 'pending'
    for update;
  if not found then raise exception 'invitation unavailable' using errcode = 'P0002'; end if;
  select * into target_team from public.team_requests where id = application.team_request_id and status = 'open' for update;
  if not found or public.are_users_blocked(target_team.owner_id, actor) then raise exception 'invitation unavailable' using errcode = '42501'; end if;
  if decision = 'accepted' then
    select count(*) into active_members from public.team_members where team_request_id = target_team.id and left_at is null;
    if active_members >= target_team.desired_member_count then raise exception 'team is full' using errcode = 'P0001'; end if;
    insert into public.team_members (team_request_id, user_id, role, joined_at, left_at)
    values (target_team.id, actor, 'member', timezone('utc', now()), null)
    on conflict (team_request_id, user_id) do update set role = 'member', joined_at = excluded.joined_at, left_at = null;
    if active_members + 1 >= target_team.desired_member_count then update public.team_requests set status = 'filled' where id = target_team.id; end if;
  end if;
  update public.team_applications set status = decision, decided_by = actor, decided_at = timezone('utc', now())
    where id = target_application_id returning * into result;
  return result;
end;
$$;

create or replace function public.ensure_team_conversation(target_team_request_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare actor uuid := public.current_user_id(); target_team public.team_requests; result public.conversations;
begin
  select * into target_team from public.team_requests where id = target_team_request_id;
  if not found then raise exception 'team unavailable' using errcode = 'P0002'; end if;
  if actor is not null and not public.is_service_role()
    and not exists (select 1 from public.team_members where team_request_id = target_team_request_id and user_id = actor and left_at is null)
  then raise exception 'not permitted' using errcode = '42501'; end if;
  insert into public.conversations (campus_id, type, name, created_by, team_request_id)
  values (target_team.campus_id, 'team', target_team.title, target_team.owner_id, target_team.id)
  on conflict (team_request_id) do update set name = excluded.name returning * into result;
  insert into public.conversation_members (conversation_id, user_id, role, left_at)
  select result.id, member.user_id, case when member.role = 'owner' then 'owner' else 'member' end, member.left_at
  from public.team_members member where member.team_request_id = target_team.id
  on conflict (conversation_id, user_id) do update set role = excluded.role, left_at = excluded.left_at;
  return result;
end;
$$;

create or replace function public.create_team_request_mobile(
  p_title text,
  p_description text,
  p_team_type text default 'project',
  p_desired_member_count integer default 4,
  p_skills text[] default '{}'
)
returns public.team_requests
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare actor uuid := public.current_user_id(); campus uuid; result public.team_requests; skill_name text; skill_id uuid;
begin
  if p_desired_member_count not between 2 and 10 then raise exception 'team size must be between 2 and 10' using errcode = '22023'; end if;
  select campus_id into campus from public.users where id = actor and status = 'active';
  if campus is null then raise exception 'profile incomplete' using errcode = 'P0001'; end if;
  insert into public.team_requests (owner_id, campus_id, title, description, team_type, desired_member_count)
  values (actor, campus, trim(p_title), trim(p_description), coalesce(nullif(trim(p_team_type), ''), 'project'), p_desired_member_count)
  returning * into result;
  foreach skill_name in array coalesce(p_skills, '{}') loop
    insert into public.skills (name) values (trim(skill_name)::citext) on conflict (name) do update set name = excluded.name returning id into skill_id;
    insert into public.team_request_skills (team_request_id, skill_id, requirement) values (result.id, skill_id, 'required') on conflict do nothing;
  end loop;
  return result;
end;
$$;

create or replace function public.update_team_request_mobile(
  target_team_request_id uuid,
  p_title text default null,
  p_description text default null,
  p_status text default null,
  p_skills text[] default null
)
returns public.team_requests
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare actor uuid := public.current_user_id(); result public.team_requests; skill_name text; skill_id uuid;
begin
  update public.team_requests set
    title = coalesce(nullif(trim(p_title), ''), title),
    description = coalesce(nullif(trim(p_description), ''), description),
    status = case
      when p_status is null or trim(p_status) = '' then status
      when p_status in ('open', 'filled', 'closed', 'cancelled', 'expired') then p_status
      else status
    end
  where id = target_team_request_id and owner_id = actor returning * into result;
  if result.id is null then raise exception 'team unavailable' using errcode = '42501'; end if;
  if p_skills is not null then
    delete from public.team_request_skills where team_request_id = result.id;
    foreach skill_name in array p_skills loop
      insert into public.skills (name) values (trim(skill_name)::citext) on conflict (name) do update set name = excluded.name returning id into skill_id;
      insert into public.team_request_skills (team_request_id, skill_id, requirement) values (result.id, skill_id, 'required') on conflict do nothing;
    end loop;
  end if;
  return result;
end;
$$;

revoke execute on function public.event_registered_count(uuid), public.invite_to_team(uuid, uuid), public.respond_team_invitation(uuid, text), public.create_team_request_mobile(text, text, text, integer, text[]), public.update_team_request_mobile(uuid, text, text, text, text[]) from public, anon;
grant execute on function public.event_registered_count(uuid), public.invite_to_team(uuid, uuid), public.respond_team_invitation(uuid, text), public.create_team_request_mobile(text, text, text, integer, text[]), public.update_team_request_mobile(uuid, text, text, text, text[]) to authenticated;
