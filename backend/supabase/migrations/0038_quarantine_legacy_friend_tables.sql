-- Quarantine the legacy friend tables.
--
-- public.friend_requests and public.friendships exist only on the linked cloud
-- project. No migration creates them, and a repo-wide search finds no reference
-- in backend, admin-backend, admin-web, prototype, or docs. The social graph the
-- app actually uses is public.connections and public.following from
-- 0004_social_team_safety. Both tables hold a single row dated 2026-08-07,
-- predating the current auth flow: leftovers from the prototype round that
-- connections replaced.
--
-- Their policies were created with the Supabase dashboard templates, same as
-- those dropped in 0036 and 0037, and permit unilateral writes:
--
--   friendships     insert with check (auth.uid() = user1_id or auth.uid() = user2_id)
--     lets a caller create a friendship naming any other user, with no consent step.
--   friend_requests update using  (auth.uid() = sender_id or auth.uid() = receiver_id)
--     lets a sender mark their own request accepted.
--
-- Revoking the grants closes that without deleting anything: the policies become
-- unreachable, the rows stay on disk, and service_role can still read them for
-- inspection or export. Dropping all policies means a future re-grant lands on
-- RLS-enabled tables with no policy, which denies by default. Drop the tables in
-- a separate migration once you no longer want the rows, with a backup.
--
-- Every statement is guarded by to_regclass, because these tables are absent
-- from any environment built from this migration history. Unguarded DDL would
-- fail the push on a fresh project instead of no-opping.

do $$
declare
  target text;
  policy_name text;
begin
  for target in select unnest(array['friend_requests', 'friendships']) loop
    if to_regclass(format('public.%I', target)) is null then
      raise notice 'skipping public.%: not present on this project', target;
      continue;
    end if;

    for policy_name in
      select policyname from pg_policies where schemaname = 'public' and tablename = target
    loop
      execute format('drop policy %I on public.%I', policy_name, target);
    end loop;

    execute format('alter table public.%I enable row level security', target);
    execute format('revoke all on public.%I from anon, authenticated', target);
  end loop;
end;
$$;

-- Fail the push rather than reporting success if either boundary is incomplete.
do $$
declare
  target text;
  leftover text;
begin
  for target in select unnest(array['friend_requests', 'friendships']) loop
    if to_regclass(format('public.%I', target)) is null then
      continue;
    end if;

    select string_agg(policyname, ', ' order by policyname) into leftover
      from pg_policies where schemaname = 'public' and tablename = target;
    if leftover is not null then
      raise exception 'public.% still has policies: %', target, leftover;
    end if;

    select string_agg(distinct grantee || ':' || privilege_type, ', ') into leftover
      from information_schema.role_table_grants
     where table_schema = 'public' and table_name = target
       and grantee in ('anon', 'authenticated');
    if leftover is not null then
      raise exception 'public.% still grants %', target, leftover;
    end if;

    if not (select relrowsecurity from pg_class where oid = format('public.%I', target)::regclass) then
      raise exception 'public.% still has row level security disabled', target;
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
