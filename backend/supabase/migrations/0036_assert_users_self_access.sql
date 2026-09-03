-- Restore the self-scoped boundary on public.users.
--
-- Three policies were created on the linked cloud project outside this
-- migration history, using the Supabase dashboard policy templates:
--
--   "Users can read all users"          select  using (true)
--   "Users can update their own profile" update  using (auth.uid() = id)
--   "Users can insert their own profile" insert  with check (auth.uid() = id)
--
-- Permissive policies are OR'd, so the first one made `users_read_self`
-- meaningless: any authenticated caller could read every row, including email
-- and phone_e164. It also broke onboarding, because the mobile client's
-- identity read returned an arbitrary row and new accounts inherited a
-- stranger's campus and onboarding_completed_at, skipping setup entirely.
--
-- The two update/insert templates test auth.uid() directly instead of
-- public.current_user_id(), which bypasses the account_access_allowed gate that
-- 0032_user_security_devices relies on to lock out suspended, banned, and
-- device-blocked accounts. The insert template is inert regardless: the
-- authenticated role holds no INSERT grant on this table (0002:189-190).
--
-- Every statement is idempotent.

drop policy if exists "Users can read all users" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Users can insert their own profile" on public.users;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'users' and policyname = 'users_read_self'
  ) then
    create policy users_read_self on public.users
      for select to authenticated
      using (id = public.current_user_id());
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'users' and policyname = 'users_update_self'
  ) then
    create policy users_update_self on public.users
      for update to authenticated
      using (id = public.current_user_id())
      with check (id = public.current_user_id());
  end if;
end;
$$;

alter table public.users enable row level security;

-- Fail the push rather than reporting success if any boundary is still wrong.
do $$
declare
  unexpected text;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.users'::regclass) then
    raise exception 'public.users still has row level security disabled';
  end if;

  select string_agg(policyname, ', ' order by policyname) into unexpected
    from pg_policies
   where schemaname = 'public' and tablename = 'users'
     and policyname not in ('users_read_self', 'users_update_self');
  if unexpected is not null then
    raise exception 'public.users has unexpected policies: %', unexpected;
  end if;

  if (
    select count(*) from pg_policies
     where schemaname = 'public' and tablename = 'users'
       and policyname in ('users_read_self', 'users_update_self')
  ) <> 2 then
    raise exception 'public.users is missing users_read_self or users_update_self';
  end if;
end;
$$;

notify pgrst, 'reload schema';
