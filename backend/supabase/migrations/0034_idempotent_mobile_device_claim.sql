-- Allow an authenticated user to move their single active device binding to a
-- newly generated app/device fingerprint (for example after reinstalling the
-- APK), while continuing to reject a fingerprint owned by another account.
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
  previous_device_id uuid;
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

  -- Serialize claims for the same account so concurrent session restoration
  -- cannot create two competing active bindings.
  perform 1 from public.users where id = actor for update;

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

  -- The product policy is one active phone/device binding per user. Release
  -- the old binding before inserting the new fingerprint so the partial
  -- unique index on user_id cannot reject a legitimate reinstall/rebind.
  if existing.id is null then
    update public.user_device_identities
       set disabled_at = timezone('utc', now()), updated_at = timezone('utc', now())
     where user_id = actor
       and disabled_at is null
       and blocked_at is null
     returning id into previous_device_id;
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
  values (
    actor,
    result.id,
    p_ip_address,
    case when previous_device_id is null then 'device_claimed' else 'device_rebound' end,
    jsonb_build_object('platform', p_platform, 'previousDeviceId', previous_device_id)
  );
  return result;
end;
$$;

revoke execute on function public.claim_device_mobile(text,text,text,text,text,text,text,text,inet) from public, anon;
grant execute on function public.claim_device_mobile(text,text,text,text,text,text,text,text,inet) to authenticated;
