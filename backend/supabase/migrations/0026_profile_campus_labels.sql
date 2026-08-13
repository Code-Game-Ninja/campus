-- Expose college name with an already-authorized public profile.
-- No email, private fields, or campus membership data is widened.

create or replace function public.get_discoverable_profile_mobile(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  actor_campus uuid;
  result jsonb;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  select campus_id into actor_campus from public.users where id = actor and status = 'active';
  if not found then raise exception 'account unavailable' using errcode = '42501'; end if;

  select jsonb_build_object(
    'userId', p.user_id,
    'displayName', p.display_name,
    'campusName', campus.name,
    'campusId', u.campus_id,
    'username', p.username,
    'avatarUrl', p.avatar_key,
    'course', p.course,
    'department', p.department,
    'studyYear', p.study_year,
    'graduationYear', p.graduation_year,
    'location', p.location_text,
    'bio', p.bio,
    'availability', p.availability,
    'profileVisibility', p.profile_visibility,
    'skills', coalesce((select array_agg(s.name::text order by s.name::text) from public.profile_skills ps join public.skills s on s.id = ps.skill_id where ps.user_id = p.user_id), '{}'::text[]),
    'interests', coalesce((select array_agg(i.name::text order by i.name::text) from public.profile_interests pi join public.interests i on i.id = pi.interest_id where pi.user_id = p.user_id), '{}'::text[]),
    'links', '[]'::jsonb,
    'discoverable', true,
    'isSelf', p.user_id = actor,
    'isCrossCampus', u.campus_id is distinct from actor_campus
  ) into result
  from public.profiles p
  join public.users u on u.id = p.user_id
  left join public.campuses campus on campus.id = u.campus_id
  where p.user_id = p_user_id and u.status = 'active'
    and (p.user_id = actor or (p.discoverable and not public.are_users_blocked(actor, p.user_id)));
  return result;
end;
$$;

revoke execute on function public.get_discoverable_profile_mobile(uuid) from public, anon;
grant execute on function public.get_discoverable_profile_mobile(uuid) to authenticated;
