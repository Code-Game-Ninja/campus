-- Blast-radius audit for the missing users RLS boundary.
--
-- Run in Supabase Dashboard > SQL Editor against the linked project. Read-only.
--
-- A public table is exposed when the anon or authenticated role holds a SELECT
-- grant AND row security is off: policies are ignored, so every row is
-- readable. A table with RLS on but zero policies is the opposite failure —
-- reads return nothing and features silently break.

with grants as (
  select table_name, string_agg(distinct grantee, ',' order by grantee) as select_roles
    from information_schema.role_table_grants
   where table_schema = 'public'
     and privilege_type = 'SELECT'
     and grantee in ('anon', 'authenticated')
   group by table_name
),
policies as (
  select tablename, count(*) as policy_count
    from pg_policies
   where schemaname = 'public'
   group by tablename
)
select
  c.relname                                as table_name,
  c.relrowsecurity                         as rls_enabled,
  coalesce(p.policy_count, 0)              as policies,
  coalesce(g.select_roles, '(none)')       as select_granted_to,
  case
    when not c.relrowsecurity and g.select_roles is not null then 'EXPOSED - every row readable'
    when c.relrowsecurity and coalesce(p.policy_count, 0) = 0 and g.select_roles is not null then 'BLOCKED - rls on, no policy'
    when c.relrowsecurity and coalesce(p.policy_count, 0) = 0 then 'service-role only'
    else 'ok'
  end                                      as verdict
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join grants   g on g.table_name = c.relname
left join policies p on p.tablename  = c.relname
where n.nspname = 'public'
  and c.relkind = 'r'
order by
  case
    when not c.relrowsecurity and g.select_roles is not null then 0
    when c.relrowsecurity and coalesce(p.policy_count, 0) = 0 and g.select_roles is not null then 1
    else 2
  end,
  c.relname;
