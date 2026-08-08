-- CampusSphere database foundation.
-- User-facing tables and their RLS policies are added in later migrations.

create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;

create schema if not exists private;

create or replace function public.current_user_id()
returns uuid
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select auth.uid();
$$;

create or replace function public.is_service_role()
returns boolean
language sql
stable
security invoker
set search_path = public, auth, pg_temp
as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role';
$$;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.current_user_id() is 'RLS helper: returns the authenticated Supabase user id.';
comment on function public.is_service_role() is 'RLS helper: identifies backend service-role requests.';
comment on function private.set_updated_at() is 'Trigger helper for UTC updated_at columns.';
