-- Deterministic local seed entrypoint.
-- Domain fixtures are added with their owning schema migrations (P2.3+).
-- This guard prevents accidental execution against a production-like database.

do $$
declare
  environment text := current_setting('app.environment', true);
begin
  if coalesce(environment, 'development') not in ('local', 'development', 'test') then
    raise exception 'CampusSphere seed is restricted to local/development/test environments';
  end if;
end;
$$;

select 1 as seed_ready;
