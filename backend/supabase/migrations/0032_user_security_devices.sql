-- Additive account and device security controls.
-- Existing push registrations remain in public.user_devices; this table stores
-- the account-binding identity separately and never stores access tokens.

alter table public.users add column if not exists phone_e164 text;
alter table public.users add column if not exists phone_verified_at timestamptz;

create table if not exists public.user_device_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null check (platform in ('android', 'ios', 'web', 'other')),
  device_fingerprint_hash text not null check (char_length(device_fingerprint_hash) between 32 and 128),
  device_public_key text,
  installation_id_hash text,
  device_label text,
  model text,
  app_version text,
  integrity_verdict text,
  last_ip inet,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  disabled_at timestamptz,
  blocked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists user_device_identities_active_fingerprint_uidx
  on public.user_device_identities(device_fingerprint_hash)
  where disabled_at is null and blocked_at is null;
create unique index if not exists user_device_identities_active_user_uidx
  on public.user_device_identities(user_id)
  where disabled_at is null and blocked_at is null;
create index if not exists user_device_identities_user_idx
  on public.user_device_identities(user_id, disabled_at, blocked_at, last_seen_at desc);

create table if not exists public.account_enforcements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  enforcement text not null check (enforcement in ('suspend', 'ban', 'recreate_required', 'deleted')),
  reason text not null check (char_length(trim(reason)) between 1 and 4000),
  imposed_by uuid references public.users(id) on delete set null,
  imposed_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists account_enforcements_active_uidx
  on public.account_enforcements(user_id, enforcement)
  where revoked_at is null;
create index if not exists account_enforcements_user_idx
  on public.account_enforcements(user_id, imposed_at desc);

create table if not exists public.user_login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  device_id uuid references public.user_device_identities(id) on delete set null,
  email citext,
  ip_address inet,
  outcome text not null check (outcome in ('otp_requested', 'otp_verified', 'device_claimed', 'rejected')),
  failure_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists user_login_events_user_idx
  on public.user_login_events(user_id, created_at desc);
create index if not exists user_login_events_ip_idx
  on public.user_login_events(ip_address, created_at desc);

alter table public.user_device_identities enable row level security;
alter table public.account_enforcements enable row level security;
alter table public.user_login_events enable row level security;
revoke all on public.user_device_identities, public.account_enforcements, public.user_login_events from anon, authenticated;
grant all on public.user_device_identities, public.account_enforcements, public.user_login_events to service_role;

drop trigger if exists user_device_identities_set_updated_at on public.user_device_identities;
create trigger user_device_identities_set_updated_at before update on public.user_device_identities
for each row execute function private.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.users (id, email, phone_e164, status, email_verified_at, phone_verified_at)
  values (new.id, new.email, new.phone, 'pending', new.email_confirmed_at, new.phone_confirmed_at)
  on conflict (id) do update set
    email = excluded.email,
    phone_e164 = excluded.phone_e164,
    email_verified_at = excluded.email_verified_at,
    phone_verified_at = excluded.phone_verified_at;
  return new;
end;
$$;

update public.users u
set phone_e164 = a.phone,
    phone_verified_at = a.phone_confirmed_at
from auth.users a
where a.id = u.id and (u.phone_e164 is distinct from a.phone or u.phone_verified_at is distinct from a.phone_confirmed_at);

-- Keep the first active account for a duplicated legacy phone number. New
-- verified accounts then fail atomically instead of sharing a phone identity.
with duplicates as (
  select id, row_number() over (partition by phone_e164 order by created_at, id) as position
  from public.users
  where phone_verified_at is not null
    and status <> 'deleted'
    and phone_e164 is not null
)
update public.users u
set phone_e164 = null, phone_verified_at = null
from duplicates d
where u.id = d.id and d.position > 1;

create unique index if not exists users_active_verified_phone_uidx
  on public.users(phone_e164)
  where phone_verified_at is not null and status <> 'deleted';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email, email_confirmed_at, phone, phone_confirmed_at on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.account_access_allowed(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.users u
    where u.id = p_user_id
      and u.status in ('pending', 'active')
      and not exists (
        select 1 from public.account_enforcements e
        where e.user_id = p_user_id
          and e.revoked_at is null
          and (e.expires_at is null or e.expires_at > timezone('utc', now()))
          and e.enforcement in ('suspend', 'ban', 'recreate_required', 'deleted')
      )
      and (
        not exists (select 1 from public.user_device_identities d where d.user_id = p_user_id)
        or exists (select 1 from public.user_device_identities d where d.user_id = p_user_id and d.disabled_at is null and d.blocked_at is null)
      )
  );
$$;

-- All mobile RPCs and RLS policies already use this helper. Returning NULL for
-- blocked accounts makes existing database boundaries deny access uniformly.
create or replace function public.current_user_id()
returns uuid
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select case when public.account_access_allowed(auth.uid()) then auth.uid() else null end;
$$;

create or replace function public.claim_device_mobile(
  p_platform text,
  p_device_fingerprint_hash text,
  p_device_public_key text default null,
  p_installation_id_hash text default null,
  p_device_label text default null,
  p_integrity_verdict text default null,
  p_app_version text default null,
  p_model text default null,
  p_ip_address inet default null
)
returns public.user_device_identities
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor uuid := auth.uid();
  existing public.user_device_identities;
  result public.user_device_identities;
begin
  if actor is null then raise exception 'authentication required' using errcode = '28000'; end if;
  if not exists (
    select 1 from public.users u where u.id = actor and u.status in ('pending', 'active')
      and not exists (
        select 1 from public.account_enforcements e where e.user_id = actor and e.revoked_at is null
          and (e.expires_at is null or e.expires_at > timezone('utc', now()))
          and e.enforcement in ('suspend', 'ban', 'recreate_required', 'deleted')
      )
  ) then raise exception 'account access is blocked' using errcode = '42501'; end if;
  if p_platform not in ('android', 'ios', 'web', 'other')
     or nullif(trim(p_device_fingerprint_hash), '') is null then
    raise exception 'invalid device identity' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.user_device_identities
    where device_fingerprint_hash = trim(p_device_fingerprint_hash) and blocked_at is not null
  ) then raise exception 'device is blocked' using errcode = '42501'; end if;

  select * into existing
  from public.user_device_identities
  where device_fingerprint_hash = trim(p_device_fingerprint_hash)
    and disabled_at is null and blocked_at is null
  for update;
  if existing.id is not null and existing.user_id <> actor then
    raise exception 'device is already linked to another account' using errcode = '23505';
  end if;

  insert into public.user_device_identities(
    user_id, platform, device_fingerprint_hash, device_public_key,
    installation_id_hash, device_label, model, app_version,
    integrity_verdict, last_ip, last_seen_at, disabled_at, blocked_at
  ) values (
    actor, p_platform, trim(p_device_fingerprint_hash), p_device_public_key,
    p_installation_id_hash, nullif(trim(p_device_label), ''),
    nullif(trim(p_model), ''), nullif(trim(p_app_version), ''),
    nullif(trim(p_integrity_verdict), ''), p_ip_address,
    timezone('utc', now()), null, null
  )
  on conflict (device_fingerprint_hash) where disabled_at is null and blocked_at is null
  do update set
    platform = excluded.platform,
    device_public_key = coalesce(excluded.device_public_key, public.user_device_identities.device_public_key),
    installation_id_hash = coalesce(excluded.installation_id_hash, public.user_device_identities.installation_id_hash),
    device_label = coalesce(excluded.device_label, public.user_device_identities.device_label),
    model = coalesce(excluded.model, public.user_device_identities.model),
    app_version = coalesce(excluded.app_version, public.user_device_identities.app_version),
    integrity_verdict = coalesce(excluded.integrity_verdict, public.user_device_identities.integrity_verdict),
    last_ip = coalesce(excluded.last_ip, public.user_device_identities.last_ip),
    last_seen_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  returning * into result;

  insert into public.user_login_events(user_id, device_id, ip_address, outcome, metadata)
  values (actor, result.id, p_ip_address, 'device_claimed', jsonb_build_object('platform', p_platform));
  return result;
end;
$$;

create or replace function public.admin_apply_account_enforcement_as(
  p_actor_id uuid,
  p_user_id uuid,
  p_action text,
  p_reason text,
  p_expires_at timestamptz default null,
  p_device_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target public.users;
  actor_assignment public.admin_assignments;
  campus_id uuid;
  enforcement_name text;
begin
  if not public.is_service_role() then raise exception 'service role required' using errcode = '42501'; end if;
  if nullif(trim(p_reason), '') is null then raise exception 'reason is required' using errcode = '22023'; end if;
  select * into target from public.users where id = p_user_id;
  if target.id is null then raise exception 'user not found' using errcode = 'P0002'; end if;
  select * into actor_assignment from public.admin_assignments
  where user_id = p_actor_id and status = 'active'
    and role in ('super_admin', 'campus_admin')
  order by case when role = 'super_admin' then 0 else 1 end limit 1;
  if actor_assignment.id is null then raise exception 'admin assignment required' using errcode = '42501'; end if;
  if actor_assignment.role = 'campus_admin' and actor_assignment.campus_id is distinct from target.campus_id then
    raise exception 'user is outside the assigned campus' using errcode = '42501';
  end if;
  if p_action in ('force_recreate', 'delete') and actor_assignment.role <> 'super_admin' then
    raise exception 'super admin required' using errcode = '42501';
  end if;

  if p_action in ('suspend', 'ban', 'force_recreate', 'delete', 'restore') then
    if p_action = 'restore' then
      update public.users set status = 'active' where id = p_user_id and status <> 'deleted';
      update public.account_enforcements set revoked_at = timezone('utc', now())
      where user_id = p_user_id and revoked_at is null;
    elsif p_action = 'force_recreate' then
      update public.account_enforcements set revoked_at = timezone('utc', now()) where user_id = p_user_id and revoked_at is null;
      update public.users set status = 'pending', onboarding_completed_at = null, age_confirmed_at = null,
        terms_accepted_at = null, privacy_accepted_at = null where id = p_user_id;
      delete from public.profiles where user_id = p_user_id;
      update public.user_device_identities set disabled_at = timezone('utc', now()) where user_id = p_user_id and disabled_at is null;
      update public.user_devices set disabled_at = timezone('utc', now()) where user_id = p_user_id and disabled_at is null;
    else
      enforcement_name := case p_action when 'force_recreate' then 'recreate_required' when 'delete' then 'deleted' else p_action end;
      update public.users set status = case when p_action = 'delete' then 'deleted' else 'suspended' end where id = p_user_id;
      update public.account_enforcements set revoked_at = timezone('utc', now())
      where user_id = p_user_id and enforcement = enforcement_name and revoked_at is null;
      insert into public.account_enforcements(user_id, enforcement, reason, imposed_by, expires_at)
      values (p_user_id, enforcement_name, trim(p_reason), p_actor_id, p_expires_at);
    end if;
  elsif p_action = 'block_device' then
    if p_device_id is null then raise exception 'device id is required' using errcode = '22023'; end if;
    select u.campus_id into campus_id from public.user_device_identities d join public.users u on u.id = d.user_id where d.id = p_device_id;
    if campus_id is null then raise exception 'device not found' using errcode = 'P0002'; end if;
    if actor_assignment.role = 'campus_admin' and actor_assignment.campus_id is distinct from campus_id then
      raise exception 'device is outside the assigned campus' using errcode = '42501';
    end if;
    update public.user_device_identities set blocked_at = timezone('utc', now()) where id = p_device_id;
  elsif p_action = 'unbind_device' then
    if actor_assignment.role <> 'super_admin' or p_device_id is null then raise exception 'super admin and device id required' using errcode = '42501'; end if;
    update public.user_device_identities set disabled_at = timezone('utc', now()) where id = p_device_id;
  else
    raise exception 'invalid account action' using errcode = '22023';
  end if;

  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values (p_actor_id, 'account.' || p_action, case when p_device_id is null then 'user' else 'device' end,
          coalesce(p_device_id, p_user_id), jsonb_build_object('reason', trim(p_reason), 'expires_at', p_expires_at));
  return jsonb_build_object('userId', p_user_id, 'action', p_action, 'deviceId', p_device_id);
end;
$$;

revoke execute on function public.claim_device_mobile(text,text,text,text,text,text,text,text,inet) from public, anon;
grant execute on function public.claim_device_mobile(text,text,text,text,text,text,text,text,inet) to authenticated;
revoke execute on function public.admin_apply_account_enforcement_as(uuid,uuid,text,text,timestamptz,uuid) from public, anon, authenticated;
grant execute on function public.admin_apply_account_enforcement_as(uuid,uuid,text,text,timestamptz,uuid) to service_role;
