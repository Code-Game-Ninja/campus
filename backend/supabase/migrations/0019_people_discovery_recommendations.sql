-- Safe cross-campus people discovery and deterministic Team Finder recommendations.
-- Discoverability exposes only the summary fields returned here. Full profile
-- rows continue to obey profile_visibility and existing RLS policies.

create or replace function public.search_people_mobile(
  p_query text,
  p_limit integer default 25
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  actor_campus uuid;
  q text := lower(trim(coalesce(p_query, '')));
  safe_q text;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  select campus_id into actor_campus
  from public.users
  where id = actor and status = 'active';
  if not found then
    raise exception 'account unavailable' using errcode = '42501';
  end if;
  if char_length(q) < 2 then return; end if;
  if coalesce(p_limit, 25) < 1 or coalesce(p_limit, 25) > 100 then
    raise exception 'search limit must be between 1 and 100' using errcode = '22023';
  end if;

  safe_q := replace(replace(replace(q, '%', ''), '_', ''), chr(92), '');
  if safe_q = '' then return; end if;

  return query
  select jsonb_build_object(
    'id', p.user_id,
    'docType', 'person',
    'title', p.display_name,
    'excerpt', case when p.username is null then coalesce(p.department, '') else '@' || p.username::text end,
    'scope', 'global',
    'score', case
      when lower(coalesce(p.username::text, '')) = safe_q then 1.0
      when lower(p.display_name) = safe_q then 0.98
      when lower(p.display_name) like safe_q || '%' then 0.9
      else 0.8
    end,
    'createdAt', p.updated_at
  )
  from public.profiles p
  join public.users u on u.id = p.user_id
  where p.user_id <> actor
    and p.discoverable
    and u.status = 'active'
    and not public.are_users_blocked(actor, p.user_id)
    and (
      lower(p.display_name) like '%' || safe_q || '%'
      or lower(coalesce(p.username::text, '')) like '%' || safe_q || '%'
      or lower(coalesce(p.department, '')) like '%' || safe_q || '%'
    )
  order by
    case when lower(coalesce(p.username::text, '')) = safe_q then 0
         when lower(p.display_name) = safe_q then 1
         when lower(p.display_name) like safe_q || '%' then 2
         else 3 end,
    (u.campus_id = actor_campus) desc,
    p.display_name,
    p.user_id
  limit coalesce(p_limit, 25);
end;
$$;

create or replace function public.recommend_people_mobile(p_limit integer default 30)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  actor_campus uuid;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  select campus_id into actor_campus
  from public.users
  where id = actor and status = 'active';
  if not found then
    raise exception 'account unavailable' using errcode = '42501';
  end if;
  if coalesce(p_limit, 30) < 1 or coalesce(p_limit, 30) > 100 then
    raise exception 'recommendation limit must be between 1 and 100' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select
      p.user_id,
      p.display_name,
      p.department,
      p.updated_at,
      u.campus_id,
      coalesce((
        select array_agg(distinct overlap.tag order by overlap.tag)
        from (
          select s.name::text as tag
          from public.profile_skills candidate_skill
          join public.profile_skills actor_skill
            on actor_skill.user_id = actor and actor_skill.skill_id = candidate_skill.skill_id
          join public.skills s on s.id = candidate_skill.skill_id
          where candidate_skill.user_id = p.user_id
          union all
          select i.name::text as tag
          from public.profile_interests candidate_interest
          join public.profile_interests actor_interest
            on actor_interest.user_id = actor and actor_interest.interest_id = candidate_interest.interest_id
          join public.interests i on i.id = candidate_interest.interest_id
          where candidate_interest.user_id = p.user_id
        ) overlap
      ), '{}'::text[]) as matched_tags,
      exists (
        select 1
        from public.profile_skills candidate_skill
        join public.profile_skills actor_skill
          on actor_skill.user_id = actor and actor_skill.skill_id = candidate_skill.skill_id
        where candidate_skill.user_id = p.user_id
      ) as has_skill_overlap,
      exists (
        select 1
        from public.profile_interests candidate_interest
        join public.profile_interests actor_interest
          on actor_interest.user_id = actor and actor_interest.interest_id = candidate_interest.interest_id
        where candidate_interest.user_id = p.user_id
      ) as has_interest_overlap,
      exists (
        select 1
        from jsonb_each(
          case when jsonb_typeof(actor_profile.availability) = 'object'
            then actor_profile.availability else '{}'::jsonb end
        ) mine
        join jsonb_each(
          case when jsonb_typeof(p.availability) = 'object'
            then p.availability else '{}'::jsonb end
        ) theirs
          on theirs.key = mine.key and theirs.value = mine.value
      ) as has_availability_overlap
    from public.profiles p
    join public.users u on u.id = p.user_id
    join public.profiles actor_profile on actor_profile.user_id = actor
    where p.user_id <> actor
      and p.discoverable
      and u.status = 'active'
      and not public.are_users_blocked(actor, p.user_id)
  )
  select jsonb_build_object(
    'userId', user_id,
    'displayName', display_name,
    'department', department,
    'matchedTags', matched_tags,
    'explanations', array_remove(array[
      case when has_skill_overlap then 'skill_overlap' end,
      case when has_interest_overlap then 'interest_overlap' end,
      case when has_availability_overlap then 'availability' end,
      case when cardinality(matched_tags) = 0 and not has_availability_overlap then 'recency' end
    ]::text[], null),
    'scope', 'global',
    'isCrossCampus', campus_id is distinct from actor_campus
  )
  from candidates
  order by
    cardinality(matched_tags) desc,
    has_availability_overlap desc,
    (campus_id = actor_campus) desc,
    updated_at desc,
    user_id
  limit coalesce(p_limit, 30);
end;
$$;

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
  select campus_id into actor_campus
  from public.users
  where id = actor and status = 'active';
  if not found then
    raise exception 'account unavailable' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'userId', p.user_id,
    'displayName', p.display_name,
    'username', p.username,
    'avatarUrl', null,
    'course', p.course,
    'department', p.department,
    'studyYear', null,
    'graduationYear', null,
    'location', null,
    'availability', '{}'::jsonb,
    'profileVisibility', 'private',
    'bio', null,
    'skills', coalesce((
      select array_agg(s.name::text order by s.name::text)
      from public.profile_skills ps join public.skills s on s.id = ps.skill_id
      where ps.user_id = p.user_id
    ), '{}'::text[]),
    'interests', coalesce((
      select array_agg(i.name::text order by i.name::text)
      from public.profile_interests pi join public.interests i on i.id = pi.interest_id
      where pi.user_id = p.user_id
    ), '{}'::text[]),
    'links', '[]'::jsonb,
    'discoverable', true,
    'isSelf', p.user_id = actor,
    'isCrossCampus', u.campus_id is distinct from actor_campus
  ) into result
  from public.profiles p
  join public.users u on u.id = p.user_id
  where p.user_id = p_user_id
    and u.status = 'active'
    and (p.user_id = actor or (p.discoverable and not public.are_users_blocked(actor, p.user_id)));

  return result;
end;
$$;

revoke execute on function public.search_people_mobile(text, integer) from public, anon;
revoke execute on function public.recommend_people_mobile(integer) from public, anon;
revoke execute on function public.get_discoverable_profile_mobile(uuid) from public, anon;
grant execute on function public.search_people_mobile(text, integer) to authenticated;
grant execute on function public.recommend_people_mobile(integer) to authenticated;
grant execute on function public.get_discoverable_profile_mobile(uuid) to authenticated;
