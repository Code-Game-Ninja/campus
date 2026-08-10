-- Close mobile write gaps with authenticated, transactional RPCs.

alter table public.team_requests add column if not exists custom_questions jsonb not null default '[]'::jsonb;
alter table public.user_devices add column if not exists updated_at timestamptz not null default timezone('utc', now());
create unique index if not exists user_devices_user_label_unique on public.user_devices(user_id, device_label);
alter table public.posts add column if not exists title text;
alter table public.posts add column if not exists post_kind text not null default 'discussion';
do $$ begin
  if not exists(select 1 from pg_constraint where conname='posts_title_length_check') then alter table public.posts add constraint posts_title_length_check check(title is null or char_length(trim(title)) between 1 and 160); end if;
  if not exists(select 1 from pg_constraint where conname='posts_kind_check') then alter table public.posts add constraint posts_kind_check check(post_kind in ('discussion','announcement','achievement','meme')); end if;
end $$;

create or replace function public.update_my_profile_mobile(
  p_display_name text,
  p_username text default null,
  p_course text default null,
  p_department text default null,
  p_study_year integer default null,
  p_graduation_year integer default null,
  p_avatar_key text default null,
  p_location text default null,
  p_availability jsonb default null,
  p_bio text default '',
  p_discoverable boolean default false,
  p_profile_visibility text default null,
  p_age_confirmed boolean default false,
  p_terms_accepted boolean default false,
  p_privacy_accepted boolean default false,
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
declare actor uuid := public.current_user_id(); campus uuid; username_value citext; existing_username citext; age_at timestamptz; terms_at timestamptz; privacy_at timestamptz;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  select campus_id,age_confirmed_at,terms_accepted_at,privacy_accepted_at into campus,age_at,terms_at,privacy_at from public.users where id = actor and status in ('pending','active');
  if campus is null then raise exception 'select a campus first' using errcode = 'P0001'; end if;
  if age_at is null and p_age_confirmed is distinct from true then raise exception 'age confirmation required' using errcode = '22023'; end if;
  if (terms_at is null and p_terms_accepted is distinct from true) or (privacy_at is null and p_privacy_accepted is distinct from true) then raise exception 'terms and privacy consent required' using errcode = '22023'; end if;
  if p_profile_visibility is not null and p_profile_visibility not in ('campus','connections','private') then raise exception 'invalid profile visibility' using errcode = '22023'; end if;
  select username into existing_username from public.profiles where user_id=actor;
  if p_username is null or trim(p_username) = '' then
    username_value := coalesce(existing_username, left(lower(regexp_replace(trim(p_display_name), '[^a-zA-Z0-9_]+', '_', 'g')), 25) || '_' || substr(actor::text, 1, 6));
  else username_value := lower(trim(p_username))::citext; end if;
  if username_value::text !~ '^[a-z0-9_]{3,32}$' then raise exception 'invalid username' using errcode = '22023'; end if;
  insert into public.profiles (user_id, display_name, username, course, department, study_year, graduation_year, avatar_key, location_text, availability, bio, discoverable, profile_visibility)
  values (actor, trim(p_display_name), username_value, nullif(trim(p_course),''), nullif(trim(p_department),''), p_study_year, p_graduation_year, nullif(trim(p_avatar_key),''), nullif(trim(p_location),''), coalesce(p_availability,'{}'::jsonb), coalesce(p_bio,''), coalesce(p_discoverable,false), coalesce(p_profile_visibility,'private'))
  on conflict (user_id) do update set display_name=excluded.display_name, username=excluded.username, course=coalesce(nullif(trim(p_course),''),profiles.course), department=excluded.department, study_year=excluded.study_year, graduation_year=coalesce(p_graduation_year,profiles.graduation_year), avatar_key=coalesce(nullif(trim(p_avatar_key),''),profiles.avatar_key), location_text=coalesce(nullif(trim(p_location),''),profiles.location_text), availability=coalesce(p_availability,profiles.availability), bio=excluded.bio, discoverable=excluded.discoverable, profile_visibility=coalesce(p_profile_visibility,profiles.profile_visibility);
  update public.users set age_confirmed_at=case when p_age_confirmed then coalesce(age_confirmed_at, timezone('utc',now())) else age_confirmed_at end, terms_accepted_at=case when p_terms_accepted then coalesce(terms_accepted_at, timezone('utc',now())) else terms_accepted_at end, privacy_accepted_at=case when p_privacy_accepted then coalesce(privacy_accepted_at, timezone('utc',now())) else privacy_accepted_at end, status='active', onboarding_completed_at=timezone('utc',now()) where id=actor;
  delete from public.profile_skills where user_id=actor;
  insert into public.skills(name) select trim(value)::citext from unnest(coalesce(p_skills,'{}')) value where char_length(trim(value))>0 on conflict(name) do nothing;
  insert into public.profile_skills(user_id,skill_id) select actor,s.id from public.skills s where s.name=any(coalesce(p_skills,'{}')::citext[]);
  delete from public.profile_interests where user_id=actor;
  insert into public.interests(name) select trim(value)::citext from unnest(coalesce(p_interests,'{}')) value where char_length(trim(value))>0 on conflict(name) do nothing;
  insert into public.profile_interests(user_id,interest_id) select actor,i.id from public.interests i where i.name=any(coalesce(p_interests,'{}')::citext[]);
  delete from public.profile_links where user_id=actor;
  if nullif(trim(p_link_url),'') is not null then insert into public.profile_links(user_id,link_type,url) values(actor,case lower(coalesce(nullif(trim(p_link_label),''),'other')) when 'github' then 'github' when 'linkedin' then 'linkedin' when 'portfolio' then 'portfolio' when 'instagram' then 'instagram' else 'other' end,trim(p_link_url)); end if;
  return (select jsonb_build_object('userId',actor,'campusId',campus,'displayName',p.display_name,'username',p.username,'course',p.course,'department',p.department,'studyYear',p.study_year,'graduationYear',p.graduation_year,'avatarUrl',p.avatar_key,'location',p.location_text,'availability',p.availability,'bio',p.bio,'discoverable',p.discoverable,'profileVisibility',p.profile_visibility,'skills',to_jsonb(coalesce(p_skills,'{}')),'interests',to_jsonb(coalesce(p_interests,'{}'))) from public.profiles p where p.user_id=actor);
end;
$$;

create or replace function public.create_team_request_mobile_v2(
  p_title text, p_description text, p_team_type text default 'project', p_desired_member_count integer default 4,
  p_required_skills text[] default '{}', p_preferred_skills text[] default '{}', p_interests text[] default '{}',
  p_commitment_level text default 'flexible', p_availability jsonb default '{}'::jsonb,
  p_application_deadline timestamptz default null, p_target_completion_date timestamptz default null,
  p_custom_questions jsonb default '[]'::jsonb
)
returns public.team_requests
language plpgsql security definer set search_path=public,auth,pg_temp
as $$
declare actor uuid:=public.current_user_id(); campus uuid; result public.team_requests; item text; sid uuid; iid uuid;
begin
  if actor is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_desired_member_count not between 2 and 10 then raise exception 'team size must be between 2 and 10' using errcode='22023'; end if;
  if p_commitment_level not in ('low','moderate','high','flexible') then raise exception 'invalid commitment level' using errcode='22023'; end if;
  if p_target_completion_date is not null and p_application_deadline is not null and p_target_completion_date < p_application_deadline then raise exception 'completion date must follow deadline' using errcode='22023'; end if;
  select campus_id into campus from public.users where id=actor and status='active'; if campus is null then raise exception 'profile incomplete' using errcode='P0001'; end if;
  insert into public.team_requests(owner_id,campus_id,title,description,team_type,desired_member_count,commitment_level,availability,application_deadline,target_completion_date)
  values(actor,campus,trim(p_title),trim(p_description),coalesce(nullif(trim(p_team_type),''),'project'),p_desired_member_count,p_commitment_level,coalesce(p_availability,'{}'::jsonb),p_application_deadline,p_target_completion_date)
  returning * into result;
  update public.team_requests set custom_questions=coalesce(p_custom_questions,'[]'::jsonb) where id=result.id returning * into result;
  foreach item in array coalesce(p_required_skills,'{}') loop insert into public.skills(name) values(trim(item)::citext) on conflict(name) do update set name=excluded.name returning id into sid; insert into public.team_request_skills values(result.id,sid,'required') on conflict do nothing; end loop;
  foreach item in array coalesce(p_preferred_skills,'{}') loop insert into public.skills(name) values(trim(item)::citext) on conflict(name) do update set name=excluded.name returning id into sid; insert into public.team_request_skills values(result.id,sid,'preferred') on conflict do nothing; end loop;
  foreach item in array coalesce(p_interests,'{}') loop insert into public.interests(name) values(trim(item)::citext) on conflict(name) do update set name=excluded.name returning id into iid; insert into public.team_request_interests values(result.id,iid) on conflict do nothing; end loop;
  return result;
end; $$;

create or replace function public.create_post_mobile(p_title text,p_body text,p_kind text default 'discussion',p_visibility text default 'campus',p_event_id uuid default null,p_team_request_id uuid default null,p_media jsonb default '[]'::jsonb,p_poll jsonb default null)
returns public.posts language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); campus uuid; result public.posts; media_item jsonb; poll_options jsonb; poll_option record;
begin
  select campus_id into campus from public.users where id=actor and status='active'; if campus is null then raise exception 'profile incomplete' using errcode='P0001'; end if;
  if p_kind not in ('discussion','announcement','achievement','meme') then raise exception 'invalid post kind' using errcode='22023'; end if;
  if p_title is not null and char_length(trim(p_title)) > 160 then raise exception 'post title is too long' using errcode='22023'; end if;
  if p_visibility not in ('campus','connections','global','team','private') then raise exception 'invalid visibility' using errcode='22023'; end if;
  if jsonb_typeof(coalesce(p_media,'[]'::jsonb)) <> 'array' then raise exception 'media must be an array' using errcode='22023'; end if;
  if jsonb_array_length(coalesce(p_media,'[]'::jsonb)) > 6 then raise exception 'too many media items' using errcode='22023'; end if;
  if p_event_id is not null and not exists(select 1 from public.events where id=p_event_id and campus_id=campus and status='published') then raise exception 'event unavailable' using errcode='42501'; end if;
  if p_team_request_id is not null and not exists(select 1 from public.team_members where team_request_id=p_team_request_id and user_id=actor and left_at is null) then raise exception 'team unavailable' using errcode='42501'; end if;
  insert into public.posts(author_id,campus_id,title,post_kind,body,visibility,event_id,team_request_id) values(actor,campus,nullif(trim(p_title),''),p_kind,trim(p_body),p_visibility,p_event_id,p_team_request_id) returning * into result;
  for media_item in select * from jsonb_array_elements(coalesce(p_media,'[]'::jsonb)) loop insert into public.post_media(post_id,media_type,storage_key,mime_type,byte_size,width,height,url,metadata,display_order) values(result.id,media_item->>'mediaType',nullif(media_item->>'storageKey',''),nullif(media_item->>'mimeType',''),nullif(media_item->>'byteSize','')::bigint,nullif(media_item->>'width','')::int,nullif(media_item->>'height','')::int,nullif(media_item->>'url',''),coalesce(media_item->'metadata','{}'::jsonb),coalesce(nullif(media_item->>'displayOrder','')::int,0)); end loop;
  if p_poll is not null then
    if jsonb_typeof(p_poll) <> 'object' then raise exception 'poll must be an object' using errcode='22023'; end if;
    poll_options:=p_poll->'options';
    if jsonb_typeof(poll_options) <> 'array' or jsonb_array_length(poll_options) not between 2 and 6 then raise exception 'poll must contain two to six options' using errcode='22023'; end if;
    insert into public.post_polls(post_id,allows_multiple,closes_at) values(result.id,coalesce((p_poll->>'allowsMultiple')::boolean,false),nullif(p_poll->>'closesAt','')::timestamptz);
    for poll_option in select value,ordinality from jsonb_array_elements_text(poll_options) with ordinality loop
      insert into public.post_poll_options(post_id,label,display_order) values(result.id,trim(poll_option.value),poll_option.ordinality-1);
    end loop;
  end if;
  return result;
end; $$;

create or replace function public.post_poll_state_mobile(p_post_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); result jsonb;
begin
  if actor is null then raise exception 'authentication required' using errcode='28000'; end if;
  if not public.can_view_post(p_post_id) then raise exception 'post unavailable' using errcode='42501'; end if;
  select jsonb_build_object(
    'postId',poll.post_id,
    'allowsMultiple',poll.allows_multiple,
    'closesAt',poll.closes_at,
    'options',coalesce(jsonb_agg(jsonb_build_object(
      'id',option.id,
      'label',option.label,
      'votes',(select count(*) from public.post_poll_votes vote where vote.option_id=option.id),
      'viewerSelected',exists(select 1 from public.post_poll_votes vote where vote.option_id=option.id and vote.user_id=actor)
    ) order by option.display_order),'[]'::jsonb)
  ) into result
  from public.post_polls poll
  join public.post_poll_options option on option.post_id=poll.post_id
  where poll.post_id=p_post_id
  group by poll.post_id,poll.allows_multiple,poll.closes_at;
  return result;
end; $$;

create or replace function public.set_post_poll_vote_mobile(p_option_id uuid,p_selected boolean)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); target_post uuid; multiple boolean; closes timestamptz;
begin
  select option.post_id,poll.allows_multiple,poll.closes_at into target_post,multiple,closes
  from public.post_poll_options option join public.post_polls poll on poll.post_id=option.post_id
  where option.id=p_option_id;
  if actor is null then raise exception 'authentication required' using errcode='28000'; end if;
  if target_post is null or not public.can_view_post(target_post) then raise exception 'poll unavailable' using errcode='42501'; end if;
  if closes is not null and closes<=timezone('utc',now()) then raise exception 'poll is closed' using errcode='22023'; end if;
  perform 1 from public.post_polls where post_id=target_post for update;
  if p_selected then
    if not multiple then delete from public.post_poll_votes where user_id=actor and option_id in(select id from public.post_poll_options where post_id=target_post); end if;
    insert into public.post_poll_votes(option_id,user_id) values(p_option_id,actor) on conflict do nothing;
  else delete from public.post_poll_votes where option_id=p_option_id and user_id=actor;
  end if;
  return public.post_poll_state_mobile(target_post);
end; $$;

create or replace function public.create_comment_mobile(p_post_id uuid,p_body text,p_parent_comment_id uuid default null)
returns public.comments language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); result public.comments;
begin
  if p_parent_comment_id is not null then raise exception 'nested comment replies are not enabled in the MVP' using errcode='22023'; end if;
  if not public.can_view_post(p_post_id) then raise exception 'post unavailable' using errcode='42501'; end if;
  insert into public.comments(post_id,author_id,body,parent_comment_id) values(p_post_id,actor,trim(p_body),null) returning * into result; return result;
end; $$;

create or replace function public.set_post_reaction_mobile(p_post_id uuid,p_enabled boolean)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); added boolean;
begin
  if actor is null then raise exception 'authentication required' using errcode='28000'; end if;
  if not public.can_view_post(p_post_id) then raise exception 'post unavailable' using errcode='42501'; end if;
  if p_enabled then insert into public.post_reactions(post_id,user_id) values(p_post_id,actor) on conflict do nothing; added:=true; else delete from public.post_reactions where post_id=p_post_id and user_id=actor; added:=false; end if; return jsonb_build_object('added',added);
end; $$;

create or replace function public.set_bookmark_mobile(p_target_type text,p_target_id uuid,p_bookmarked boolean)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); bookmarked boolean;
begin
  if actor is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_target_type='event' then if not exists(select 1 from public.events e join public.users u on u.id=actor where e.id=p_target_id and e.status='published' and e.campus_id=u.campus_id) then raise exception 'event unavailable' using errcode='42501'; end if; if p_bookmarked then insert into public.event_bookmarks(event_id,user_id) values(p_target_id,actor) on conflict do nothing; else delete from public.event_bookmarks where event_id=p_target_id and user_id=actor; end if; bookmarked:=p_bookmarked;
  elsif p_target_type='post' then if not public.can_view_post(p_target_id) then raise exception 'post unavailable' using errcode='42501'; end if; if p_bookmarked then insert into public.post_bookmarks(post_id,user_id) values(p_target_id,actor) on conflict do nothing; else delete from public.post_bookmarks where post_id=p_target_id and user_id=actor; end if; bookmarked:=p_bookmarked;
  else raise exception 'invalid bookmark target' using errcode='22023'; end if; return jsonb_build_object('bookmarked',bookmarked);
end; $$;

create or replace function public.apply_to_team_mobile(p_team_request_id uuid,p_message text default '',p_selected_skills jsonb default '[]'::jsonb,p_answers jsonb default '{}'::jsonb)
returns public.team_applications language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); result public.team_applications;
begin
  if actor is null then raise exception 'authentication required' using errcode='28000'; end if;
  if not exists(select 1 from public.team_requests t where t.id=p_team_request_id and t.status='open' and t.deleted_at is null and t.owner_id<>actor and (t.application_deadline is null or t.application_deadline>timezone('utc',now())) and not public.are_users_blocked(t.owner_id,actor)) then raise exception 'team unavailable' using errcode='42501'; end if;
  insert into public.team_applications(team_request_id,applicant_id,message,selected_skills,answers,status) values(p_team_request_id,actor,coalesce(p_message,''),coalesce(p_selected_skills,'[]'::jsonb),coalesce(p_answers,'{}'::jsonb),'pending') on conflict (team_request_id,applicant_id) where status in ('pending','accepted') do update set message=excluded.message,selected_skills=excluded.selected_skills,answers=excluded.answers,updated_at=timezone('utc',now()) returning * into result;
  return result;
end; $$;

create or replace function public.set_follow_mobile(p_target_user_id uuid,p_following boolean)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); following_now boolean;
begin
  if actor is null then raise exception 'authentication required' using errcode='28000'; end if;
  if actor=p_target_user_id or public.are_users_blocked(actor,p_target_user_id) then raise exception 'profile unavailable' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where user_id=p_target_user_id and discoverable) then raise exception 'profile unavailable' using errcode='42501'; end if;
  if p_following then insert into public.following values(actor,p_target_user_id,timezone('utc',now())) on conflict do nothing; following_now:=true; else delete from public.following where follower_id=actor and followee_id=p_target_user_id; following_now:=false; end if; return jsonb_build_object('following',following_now);
end; $$;

create or replace function public.register_device_mobile(p_platform text,p_push_token text,p_device_label text)
returns public.user_devices language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); result public.user_devices;
begin
  if actor is null then raise exception 'authentication required' using errcode='28000'; end if;
  if p_platform not in ('android','ios','web','other') or nullif(trim(p_device_label),'') is null or nullif(trim(p_push_token),'') is null then raise exception 'invalid device registration' using errcode='22023'; end if;
  insert into public.user_devices(user_id,platform,push_token,device_label,disabled_at) values(actor,p_platform,p_push_token,p_device_label,null) on conflict (user_id,device_label) do update set platform=excluded.platform,push_token=excluded.push_token,disabled_at=null,updated_at=timezone('utc',now()) returning * into result; return result;
end; $$;

create or replace function public.mark_notification_read_mobile(p_notification_id uuid)
returns public.notifications language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); result public.notifications;
begin
  update public.notifications set in_app_read_at=coalesce(in_app_read_at,timezone('utc',now())) where id=p_notification_id and user_id=actor returning * into result; if result.id is null then raise exception 'notification unavailable' using errcode='42501'; end if; return result;
end; $$;

create or replace function public.update_post_mobile(p_post_id uuid,p_body text,p_visibility text default null)
returns public.posts language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); result public.posts;
begin
  if p_visibility is not null and p_visibility not in ('campus','connections','global','team','private') then raise exception 'invalid visibility' using errcode='22023'; end if;
  update public.posts set body=coalesce(nullif(trim(p_body),''),body),visibility=coalesce(p_visibility,visibility),edited_at=timezone('utc',now()) where id=p_post_id and author_id=actor and status='published' returning * into result;
  if result.id is null then raise exception 'post unavailable' using errcode='42501'; end if; return result;
end; $$;

create or replace function public.delete_post_mobile(p_post_id uuid)
returns public.posts language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); result public.posts;
begin update public.posts set status='deleted',deleted_at=timezone('utc',now()),body='[deleted]' where id=p_post_id and author_id=actor and status<>'deleted' returning * into result; if result.id is null then raise exception 'post unavailable' using errcode='42501'; end if; return result; end; $$;

create or replace function public.set_event_reminder_mobile(p_event_id uuid,p_enabled boolean,p_minutes_before integer default 1440)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); start_at timestamptz;
begin
  select e.starts_at into start_at from public.events e join public.users u on u.id=actor where e.id=p_event_id and e.status='published' and e.campus_id=u.campus_id;
  if start_at is null then raise exception 'event unavailable' using errcode='42501'; end if;
  if p_enabled then insert into public.event_reminders(event_id,user_id,minutes_before,scheduled_for,channels,status) values(p_event_id,actor,p_minutes_before,start_at-make_interval(mins=>p_minutes_before),array['in_app'],'scheduled') on conflict(event_id,user_id) do update set minutes_before=excluded.minutes_before,scheduled_for=excluded.scheduled_for,channels=excluded.channels,status='scheduled'; else delete from public.event_reminders where event_id=p_event_id and user_id=actor; end if;
  return jsonb_build_object('enabled',p_enabled,'eventId',p_event_id);
end; $$;

create or replace function public.set_chat_mute_mobile(p_conversation_id uuid,p_muted boolean)
returns public.conversation_members language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); result public.conversation_members;
begin update public.conversation_members set notification_mode=case when p_muted then 'muted' else 'all' end where conversation_id=p_conversation_id and user_id=actor and left_at is null returning * into result; if result.user_id is null then raise exception 'conversation unavailable' using errcode='42501'; end if; return result; end; $$;

create or replace function public.create_report_mobile(p_target_type text,p_target_id uuid,p_reason text,p_details text default null)
returns public.reports language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); result public.reports;
begin
  if p_target_type not in ('user','post','comment','message','team_request','team_application','event') then raise exception 'invalid report target' using errcode='22023'; end if;
  insert into public.reports(reporter_id,target_type,target_id,reason_code,details) values(actor,p_target_type,p_target_id,coalesce(nullif(trim(p_reason),''),'other'),nullif(trim(p_details),'')) returning * into result; return result;
end; $$;

create or replace function public.set_block_mobile(p_target_user_id uuid,p_blocked boolean)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id();
begin
  if actor is null or actor=p_target_user_id then raise exception 'invalid block target' using errcode='22023'; end if;
  if p_blocked then insert into public.user_blocks(blocker_id,blocked_id) values(actor,p_target_user_id) on conflict do nothing; else delete from public.user_blocks where blocker_id=actor and blocked_id=p_target_user_id; end if;
  return jsonb_build_object('blocked',p_blocked,'blockedUserId',p_target_user_id);
end; $$;

create or replace function public.withdraw_team_application_mobile(p_application_id uuid)
returns public.team_applications language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); result public.team_applications;
begin
  if actor is null then raise exception 'authentication required' using errcode='28000'; end if;
  update public.team_applications
  set status='withdrawn', decided_by=actor, decided_at=timezone('utc',now()), updated_at=timezone('utc',now())
  where id=p_application_id and applicant_id=actor and application_kind='application' and status='pending'
  returning * into result;
  if result.id is null then raise exception 'application unavailable' using errcode='42501'; end if;
  return result;
end; $$;

create or replace function public.disable_device_mobile(p_device_label text)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare actor uuid:=public.current_user_id(); affected integer;
begin update public.user_devices set disabled_at=timezone('utc',now()),updated_at=timezone('utc',now()) where user_id=actor and device_label=p_device_label; get diagnostics affected=row_count; return jsonb_build_object('disabled',affected>0,'deviceLabel',p_device_label); end; $$;

revoke execute on function public.update_my_profile_mobile(text,text,text,text,integer,integer,text,text,jsonb,text,boolean,text,boolean,boolean,boolean,text[],text[],text,text), public.create_team_request_mobile_v2(text,text,text,integer,text[],text[],text[],text,jsonb,timestamptz,timestamptz,jsonb), public.create_post_mobile(text,text,text,text,uuid,uuid,jsonb,jsonb), public.post_poll_state_mobile(uuid), public.set_post_poll_vote_mobile(uuid,boolean), public.create_comment_mobile(uuid,text,uuid), public.set_post_reaction_mobile(uuid,boolean), public.set_bookmark_mobile(text,uuid,boolean), public.apply_to_team_mobile(uuid,text,jsonb,jsonb), public.set_follow_mobile(uuid,boolean), public.register_device_mobile(text,text,text), public.mark_notification_read_mobile(uuid), public.update_post_mobile(uuid,text,text), public.delete_post_mobile(uuid), public.set_event_reminder_mobile(uuid,boolean,integer), public.set_chat_mute_mobile(uuid,boolean), public.create_report_mobile(text,uuid,text,text), public.set_block_mobile(uuid,boolean), public.withdraw_team_application_mobile(uuid), public.disable_device_mobile(text) from public,anon;
grant execute on function public.update_my_profile_mobile(text,text,text,text,integer,integer,text,text,jsonb,text,boolean,text,boolean,boolean,boolean,text[],text[],text,text), public.create_team_request_mobile_v2(text,text,text,integer,text[],text[],text[],text,jsonb,timestamptz,timestamptz,jsonb), public.create_post_mobile(text,text,text,text,uuid,uuid,jsonb,jsonb), public.post_poll_state_mobile(uuid), public.set_post_poll_vote_mobile(uuid,boolean), public.create_comment_mobile(uuid,text,uuid), public.set_post_reaction_mobile(uuid,boolean), public.set_bookmark_mobile(text,uuid,boolean), public.apply_to_team_mobile(uuid,text,jsonb,jsonb), public.set_follow_mobile(uuid,boolean), public.register_device_mobile(text,text,text), public.mark_notification_read_mobile(uuid), public.update_post_mobile(uuid,text,text), public.delete_post_mobile(uuid), public.set_event_reminder_mobile(uuid,boolean,integer), public.set_chat_mute_mobile(uuid,boolean), public.create_report_mobile(text,uuid,text,text), public.set_block_mobile(uuid,boolean), public.withdraw_team_application_mobile(uuid), public.disable_device_mobile(text) to authenticated;
