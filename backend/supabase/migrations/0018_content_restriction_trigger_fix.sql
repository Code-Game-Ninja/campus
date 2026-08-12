-- Fix polymorphic content restriction trigger field access.
-- PL/pgSQL validates every NEW.field reference against the trigger row type,
-- so one function cannot directly reference both author_id and owner_id.

create or replace function private.enforce_content_restriction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor uuid;
  row_data jsonb;
begin
  row_data := to_jsonb(new);

  if row_data ? 'author_id' then
    actor := nullif(row_data ->> 'author_id', '')::uuid;
  elsif row_data ? 'owner_id' then
    actor := nullif(row_data ->> 'owner_id', '')::uuid;
  else
    raise exception 'unsupported restricted content table: %', tg_table_name using errcode = '55000';
  end if;

  if actor is null or (not public.is_service_role() and actor <> public.current_user_id()) then
    raise exception 'content owner mismatch' using errcode = '42501';
  end if;
  if public.has_active_restriction(actor, 'posting') then
    raise exception 'posting restricted' using errcode = '42501';
  end if;
  return new;
end;
$$;

