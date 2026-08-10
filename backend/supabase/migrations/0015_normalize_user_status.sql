-- Replace the legacy public.users status contract with CampusSphere account states.
-- Older cloud schemas used presence-style values that reject the Auth bootstrap
-- state `pending` and later onboarding state `active`.

do $$
declare
  check_name text;
begin
  for check_name in
    select constraint_row.conname
    from pg_constraint constraint_row
    where constraint_row.conrelid = 'public.users'::regclass
      and constraint_row.contype = 'c'
      and position('status' in lower(pg_get_constraintdef(constraint_row.oid))) > 0
  loop
    execute format('alter table public.users drop constraint %I', check_name);
  end loop;
end;
$$;

alter table public.users alter column status set default 'pending';

update public.users
set status = case
  when status in ('pending', 'active', 'suspended', 'deleted') then status
  else 'active'
end;

alter table public.users alter column status set not null;
alter table public.users
  add constraint users_status_check
  check (status in ('pending', 'active', 'suspended', 'deleted'));

-- Reinstall the Auth trigger after the status contract is normalized.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of email, email_confirmed_at on auth.users
for each row execute function public.handle_new_auth_user();
