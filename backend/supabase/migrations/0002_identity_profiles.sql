-- Identity, campus, profile, discovery, and consent foundation.
-- Auth identities are owned by Supabase Auth; public user rows mirror auth.users.

create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  country_code text not null default 'IN' check (country_code ~ '^[A-Z]{2}$'),
  timezone text not null default 'Asia/Kolkata',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campus_email_domains (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses(id) on delete cascade,
  domain citext not null unique,
  verification_required boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  check (domain::text ~ '^[^@[:space:]]+\.[^@[:space:]]+$')
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext not null unique,
  campus_id uuid references public.campuses(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'deleted')),
  email_verified_at timestamptz,
  onboarding_completed_at timestamptz,
  age_confirmed_at timestamptz,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  username citext not null unique check (username::text ~ '^[a-z0-9_]{3,32}$'),
  bio text not null default '' check (char_length(bio) <= 2000),
  avatar_key text,
  course text,
  department text,
  graduation_year integer check (graduation_year between 2000 and 2200),
  location_text text,
  availability jsonb not null default '{}'::jsonb,
  profile_visibility text not null default 'private' check (profile_visibility in ('campus', 'connections', 'private')),
  discoverable boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.users (id, email, status, email_verified_at)
  values (new.id, new.email, 'pending', new.email_confirmed_at)
  on conflict (id) do update set email = excluded.email, email_verified_at = excluded.email_verified_at;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email, email_confirmed_at on auth.users
for each row execute function public.handle_new_auth_user();

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.interests (
  id uuid primary key default gen_random_uuid(),
  name citext not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_skills (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  proficiency text check (proficiency is null or proficiency in ('beginner', 'intermediate', 'advanced', 'expert')),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, skill_id)
);

create table if not exists public.profile_interests (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, interest_id)
);

create table if not exists public.profile_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  link_type text not null check (link_type in ('github', 'linkedin', 'portfolio', 'instagram', 'other')),
  url text not null check (url ~* '^https?://'),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, link_type, url)
);

create index if not exists profiles_campus_discovery_idx on public.profiles (discoverable, user_id);
create index if not exists profile_skills_skill_idx on public.profile_skills (skill_id, user_id);
create index if not exists profile_interests_interest_idx on public.profile_interests (interest_id, user_id);

drop trigger if exists campuses_set_updated_at on public.campuses;
create trigger campuses_set_updated_at before update on public.campuses for each row execute function private.set_updated_at();
drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at before update on public.users for each row execute function private.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function private.set_updated_at();

alter table public.campuses enable row level security;
alter table public.campus_email_domains enable row level security;
alter table public.users enable row level security;
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.interests enable row level security;
alter table public.profile_skills enable row level security;
alter table public.profile_interests enable row level security;
alter table public.profile_links enable row level security;

create policy campuses_read_authenticated on public.campuses for select to authenticated using (status = 'active');
create policy campus_domains_read_authenticated on public.campus_email_domains for select to authenticated using (true);
create policy users_read_self on public.users for select to authenticated using (id = public.current_user_id());
create policy users_update_self on public.users for update to authenticated using (id = public.current_user_id()) with check (id = public.current_user_id());
create policy profiles_read_permitted on public.profiles for select to authenticated using (
  user_id = public.current_user_id()
  or (discoverable and profile_visibility = 'campus' and exists (
    select 1 from public.users viewer join public.users target on target.id = profiles.user_id
    where viewer.id = public.current_user_id() and viewer.campus_id = target.campus_id
  ))
);
create policy profiles_update_self on public.profiles for update to authenticated using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());
create policy profiles_insert_self on public.profiles for insert to authenticated with check (user_id = public.current_user_id());
create policy skills_read_authenticated on public.skills for select to authenticated using (true);
create policy interests_read_authenticated on public.interests for select to authenticated using (true);
create policy profile_skills_read_self on public.profile_skills for select to authenticated using (user_id = public.current_user_id());
create policy profile_skills_write_self on public.profile_skills for all to authenticated using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());
create policy profile_interests_read_self on public.profile_interests for select to authenticated using (user_id = public.current_user_id());
create policy profile_interests_write_self on public.profile_interests for all to authenticated using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());
create policy profile_links_read_self on public.profile_links for select to authenticated using (user_id = public.current_user_id());
create policy profile_links_write_self on public.profile_links for all to authenticated using (user_id = public.current_user_id()) with check (user_id = public.current_user_id());

revoke all on table public.users, public.campus_email_domains from anon;
revoke all on table public.users, public.campus_email_domains from authenticated;
grant select, update (onboarding_completed_at, age_confirmed_at, terms_accepted_at, privacy_accepted_at) on table public.users to authenticated;
grant select on table public.campus_email_domains to authenticated;
