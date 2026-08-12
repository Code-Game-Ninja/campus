-- Return display labels for users already visible through an authorized
-- CampusSphere surface. Direct table reads are intentionally RLS-protected;
-- this narrow RPC prevents the mobile client from replacing valid names with
-- a misleading generic "Campus member" label.

-- Repair nullable display names left by older table shapes. New profile setup
-- already writes the chosen name; this only fills legacy gaps.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'display_name'
  ) then
    execute $statement$
      update public.profiles profile
      set display_name = coalesce(
        nullif(trim(profile.display_name), ''),
        nullif(trim(account.display_name), ''),
        nullif(profile.username::text, ''),
        'Student'
      )
      from public.users account
      where account.id = profile.user_id
        and nullif(trim(profile.display_name), '') is null
    $statement$;
  else
    update public.profiles
    set display_name = coalesce(nullif(username::text, ''), 'Student')
    where nullif(trim(display_name), '') is null;
  end if;
end;
$$;

create or replace function public.visible_profile_labels_mobile(p_user_ids uuid[])
returns setof jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select jsonb_build_object(
    'userId', p.user_id,
    'displayName', p.display_name,
    'avatarUrl', p.avatar_key,
    'campusId', target.campus_id
  )
  from public.profiles p
  join public.users target on target.id = p.user_id
  where p.user_id = any(coalesce(p_user_ids, '{}'::uuid[]))
    and target.status = 'active'
    and (
      p.user_id = public.current_user_id()
      or (
        not public.are_users_blocked(public.current_user_id(), p.user_id)
        and (
          public.can_view_profile(p.user_id)
          or exists (
        select 1
        from public.connections c
        where c.status in ('pending', 'accepted')
          and least(c.requester_id, c.addressee_id) = least(public.current_user_id(), p.user_id)
          and greatest(c.requester_id, c.addressee_id) = greatest(public.current_user_id(), p.user_id)
      )
      or exists (
        select 1
        from public.conversation_members mine
        join public.conversation_members theirs on theirs.conversation_id = mine.conversation_id
        where mine.user_id = public.current_user_id()
          and theirs.user_id = p.user_id
          and theirs.left_at is null
          and public.can_access_conversation(mine.conversation_id)
      )
      or exists (
        select 1
        from public.team_members mine
        join public.team_members theirs on theirs.team_request_id = mine.team_request_id
        where mine.user_id = public.current_user_id()
          and mine.left_at is null
          and theirs.user_id = p.user_id
          and theirs.left_at is null
      )
      or exists (
        select 1
        from public.posts post
        where post.author_id = p.user_id
          and public.can_view_post(post.id)
      )
      or exists (
        select 1
        from public.comments comment
        where comment.author_id = p.user_id
          and comment.status = 'published'
          and public.can_view_post(comment.post_id)
      )
      or exists (
        select 1
        from public.team_applications application
        join public.team_requests team on team.id = application.team_request_id
        where application.applicant_id = p.user_id
          and team.owner_id = public.current_user_id()
      )
      or exists (
        select 1
        from public.following follow
        where follow.follower_id = public.current_user_id()
          and follow.followee_id = p.user_id
      )
        )
      )
    );
$$;

revoke all on function public.visible_profile_labels_mobile(uuid[]) from public, anon;
grant execute on function public.visible_profile_labels_mobile(uuid[]) to authenticated;
