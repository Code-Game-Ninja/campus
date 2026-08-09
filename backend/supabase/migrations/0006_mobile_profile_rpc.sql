-- Mobile-safe identity/profile onboarding RPCs. Keep campus/profile writes
-- onboarding flags transactional while the mobile client remains student-only.
alter table public.profiles
  add column if not exists study_year integer check (study_year between 1 and 12);

create or replace function public.bootstrap_mobile_identity(target_campus_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare actor uuid := public.current_user_id();
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if not exists (select 1 from public.campuses where id = target_campus_id and status = 'active') then
    raise exception 'campus unavailable' using errcode = 'P0002';
  end if;
  update public.users set campus_id = target_campus_id, status = 'active' where id = actor;
  return jsonb_build_object('userId', actor, 'campusId', target_campus_id, 'created', true);
end;
$$;

create or replace function public.update_my_profile(
  p_display_name text,
  p_department text default null,
  p_study_year integer default null,
  p_bio text default '',
  p_discoverable boolean default false,
  p_skills text[] default '{}',
  p_interests text[] default '{}',
  p_link_label text default null,
  p_link_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  actor_campus uuid;
  result jsonb;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select campus_id into actor_campus from public.users where id = actor and status in ('pending', 'active');
  if actor_campus is null then raise exception 'select a campus first' using errcode = 'P0001'; end if;
  insert into public.profiles (user_id, display_name, username, department, study_year, bio, discoverable)
  values (
    actor,
    trim(p_display_name),
    left(lower(regexp_replace(trim(p_display_name), '[^a-zA-Z0-9_]+', '_', 'g')), 25) || '_' || substr(actor::text, 1, 6),
    nullif(trim(p_department), ''),
    p_study_year,
    coalesce(p_bio, ''),
    coalesce(p_discoverable, false)
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name,
    department = excluded.department,
    study_year = excluded.study_year,
    bio = excluded.bio,
    discoverable = excluded.discoverable;
  delete from public.profile_skills where user_id = actor;
  insert into public.skills (name) select trim(value)::citext from unnest(coalesce(p_skills, '{}')) value where char_length(trim(value)) > 0 on conflict (name) do nothing;
  insert into public.profile_skills (user_id, skill_id) select actor, skill.id from public.skills skill where skill.name = any(coalesce(p_skills, '{}')::citext[]);
  delete from public.profile_interests where user_id = actor;
  insert into public.interests (name) select trim(value)::citext from unnest(coalesce(p_interests, '{}')) value where char_length(trim(value)) > 0 on conflict (name) do nothing;
  insert into public.profile_interests (user_id, interest_id) select actor, interest.id from public.interests interest where interest.name = any(coalesce(p_interests, '{}')::citext[]);
  delete from public.profile_links where user_id = actor;
  if nullif(trim(p_link_url), '') is not null then
    insert into public.profile_links (user_id, link_type, url) values (
      actor,
      case lower(coalesce(nullif(trim(p_link_label), ''), 'other'))
        when 'github' then 'github' when 'linkedin' then 'linkedin' when 'portfolio' then 'portfolio'
        when 'instagram' then 'instagram' else 'other' end,
      trim(p_link_url)
    );
  end if;
  update public.users set status = 'active', onboarding_completed_at = timezone('utc', now()) where id = actor;
  select jsonb_build_object(
    'userId', profile.user_id, 'displayName', profile.display_name, 'avatarUrl', profile.avatar_key,
    'department', profile.department, 'studyYear', profile.study_year, 'bio', profile.bio,
    'discoverable', profile.discoverable, 'isSelf', true, 'isCrossCampus', false,
    'skills', coalesce((select jsonb_agg(skill.name order by skill.name) from public.profile_skills link join public.skills skill on skill.id = link.skill_id where link.user_id = actor), '[]'::jsonb),
    'interests', coalesce((select jsonb_agg(interest.name order by interest.name) from public.profile_interests link join public.interests interest on interest.id = link.interest_id where link.user_id = actor), '[]'::jsonb),
    'links', coalesce((select jsonb_agg(jsonb_build_object('label', link.link_type, 'url', link.url) order by link.display_order) from public.profile_links link where link.user_id = actor), '[]'::jsonb)
  ) into result from public.profiles profile where profile.user_id = actor;
  return result;
end;
$$;

revoke execute on function public.bootstrap_mobile_identity(uuid), public.update_my_profile(text, text, integer, text, boolean, text[], text[], text, text) from public, anon;
grant execute on function public.bootstrap_mobile_identity(uuid), public.update_my_profile(text, text, integer, text, boolean, text[], text[], text, text) to authenticated;
