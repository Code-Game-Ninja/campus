-- Deterministic local-only CampusSphere fixtures.
-- Never run against cloud/production. Seed contains no organizer account or mobile role.

do $$
declare
  environment text := current_setting('app.environment', true);
begin
  if coalesce(environment, 'development') not in ('local', 'development', 'test') then
    raise exception 'CampusSphere seed is restricted to local/development/test environments';
  end if;
end;
$$;

-- Stable IDs make reset, screenshots, and smoke tests repeatable.
insert into public.campuses (id, name, slug, country_code, timezone, status)
values ('00000000-0000-0000-0000-000000000101', 'CampusSphere Demo University', 'campussphere-demo', 'IN', 'Asia/Kolkata', 'active')
on conflict (id) do update set name = excluded.name, slug = excluded.slug, status = excluded.status;

insert into public.campus_email_domains (campus_id, domain, verification_required)
values ('00000000-0000-0000-0000-000000000101', 'campussphere.local', false)
on conflict (domain) do update set campus_id = excluded.campus_id, verification_required = excluded.verification_required;

-- Local auth users. Password is intentionally local-only; use OTP in cloud.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000201', 'authenticated', 'authenticated', 'student-a@campussphere.local', crypt('campussphere-local-only', gen_salt('bf')), timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000202', 'authenticated', 'authenticated', 'student-b@campussphere.local', crypt('campussphere-local-only', gen_salt('bf')), timezone('utc', now()), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, timezone('utc', now()), timezone('utc', now()), '', '', '', '')
on conflict (id) do update set email = excluded.email, email_confirmed_at = excluded.email_confirmed_at;

update public.users
set campus_id = '00000000-0000-0000-0000-000000000101', status = 'active',
    email_verified_at = timezone('utc', now()), onboarding_completed_at = timezone('utc', now()),
    age_confirmed_at = timezone('utc', now()), terms_accepted_at = timezone('utc', now()),
    privacy_accepted_at = timezone('utc', now())
where id in ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000202');

insert into public.profiles (user_id, display_name, username, bio, course, department, graduation_year, profile_visibility, discoverable)
values
  ('00000000-0000-0000-0000-000000000201', 'Student A', 'student_a', 'Local development student account.', 'Computer Science', 'Engineering', 2027, 'campus', true),
  ('00000000-0000-0000-0000-000000000202', 'Student B', 'student_b', 'Second local account for privacy tests.', 'Design', 'Arts', 2028, 'campus', true)
on conflict (user_id) do update set display_name = excluded.display_name, username = excluded.username,
  bio = excluded.bio, course = excluded.course, department = excluded.department,
  graduation_year = excluded.graduation_year, profile_visibility = excluded.profile_visibility, discoverable = excluded.discoverable;

insert into public.skills (id, name) values
  ('00000000-0000-0000-0000-000000000301', 'TypeScript'),
  ('00000000-0000-0000-0000-000000000302', 'UX research')
on conflict (id) do update set name = excluded.name;
insert into public.interests (id, name) values
  ('00000000-0000-0000-0000-000000000311', 'Open source'),
  ('00000000-0000-0000-0000-000000000312', 'Design systems')
on conflict (id) do update set name = excluded.name;
insert into public.profile_skills (user_id, skill_id) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000301'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000302')
on conflict do nothing;
insert into public.profile_interests (user_id, interest_id) values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000311'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000312')
on conflict do nothing;

insert into public.event_organizers (id, campus_id, display_name, website_url, status)
values ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000101', 'CampusSphere Student Life', 'https://campussphere.local', 'active')
on conflict (id) do update set display_name = excluded.display_name, website_url = excluded.website_url, status = excluded.status;

insert into public.events (
  id, organizer_id, campus_id, title, summary, description, category, tags, venue_name,
  address_text, timezone, starts_at, ends_at, registration_deadline, capacity, public_url, status, published_at
)
values (
  '00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000101',
  'CampusSphere MVP Demo Event', 'Demo event for attendee flows.', 'Use this event to verify discovery, save, registration, waitlist, sharing, and reminders.',
  'community', array['demo','mvp'], 'Main Auditorium', 'CampusSphere Demo University', 'Asia/Kolkata',
  timezone('utc', now()) + interval '14 days', timezone('utc', now()) + interval '14 days 2 hours',
  timezone('utc', now()) + interval '13 days', 100, 'https://campussphere.local/events/demo', 'published', timezone('utc', now())
)
on conflict (id) do update set title = excluded.title, status = excluded.status, published_at = excluded.published_at;

insert into public.posts (id, author_id, campus_id, body, visibility, event_id, status)
values ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101', 'Welcome to CampusSphere MVP.', 'campus', '00000000-0000-0000-0000-000000000402', 'published')
on conflict (id) do update set body = excluded.body, status = excluded.status, event_id = excluded.event_id;

insert into public.team_requests (
  id, owner_id, campus_id, title, description, team_type, desired_member_count,
  commitment_level, availability, application_deadline, target_completion_date, status
)
values (
  '00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101',
  'Build a campus accessibility audit', 'Find students to audit key campus journeys and publish recommendations.',
  'project', 4, 'moderate', '{"days":["sat"],"hours":"2"}'::jsonb,
  timezone('utc', now()) + interval '30 days', timezone('utc', now()) + interval '45 days', 'open'
)
on conflict (id) do update set title = excluded.title, description = excluded.description, status = excluded.status;
insert into public.team_request_skills (team_request_id, skill_id, requirement)
values ('00000000-0000-0000-0000-000000000601', '00000000-0000-0000-0000-000000000301', 'required')
on conflict do nothing;

select 1 as seed_ready;
