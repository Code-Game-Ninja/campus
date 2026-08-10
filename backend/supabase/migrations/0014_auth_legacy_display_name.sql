-- Keep Supabase Auth user creation compatible with the legacy public.users shape.
-- New CampusSphere profile names live in public.profiles, but the existing cloud
-- table may still require public.users.display_name to be non-null.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'display_name'
  ) then
    alter table public.users alter column display_name set default 'Student';
  end if;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  fallback_display_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(split_part(coalesce(new.email, ''), '@', 1)), ''),
    'Student'
  );
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'display_name'
  ) then
    execute $statement$
      insert into public.users (id, email, status, email_verified_at, display_name)
      values ($1, $2, 'pending', $3, $4)
      on conflict (id) do update
      set email = excluded.email,
          email_verified_at = excluded.email_verified_at,
          display_name = coalesce(nullif(public.users.display_name, ''), excluded.display_name)
    $statement$
    using new.id, new.email, new.email_confirmed_at, fallback_display_name;
  else
    insert into public.users (id, email, status, email_verified_at)
    values (new.id, new.email, 'pending', new.email_confirmed_at)
    on conflict (id) do update
    set email = excluded.email,
        email_verified_at = excluded.email_verified_at;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, email_confirmed_at on auth.users
for each row execute function public.handle_new_auth_user();
