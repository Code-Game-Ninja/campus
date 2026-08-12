-- Searchable Indian college/university catalogue populated by backend sync jobs.
-- Mobile users can read active institutions but cannot create or edit tenants.

alter table public.campuses add column if not exists state_province text;
alter table public.campuses add column if not exists city text;
alter table public.campuses add column if not exists institution_type text;
alter table public.campuses add column if not exists domain citext;
alter table public.campuses add column if not exists website_url text;
alter table public.campuses add column if not exists catalog_source text not null default 'manual';
alter table public.campuses add column if not exists catalog_source_id text;
alter table public.campuses add column if not exists catalog_metadata jsonb not null default '{}'::jsonb;
alter table public.campuses add column if not exists catalog_synced_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.campuses'::regclass
      and conname = 'campuses_catalog_source_key'
  ) then
    alter table public.campuses
      add constraint campuses_catalog_source_key unique (catalog_source, catalog_source_id);
  end if;
end;
$$;

create index if not exists campuses_name_trgm_idx
  on public.campuses using gin (name gin_trgm_ops);
create index if not exists campuses_state_city_idx
  on public.campuses (country_code, state_province, city)
  where status = 'active';

create or replace function public.search_campuses_mobile(
  p_query text default '',
  p_limit integer default 25,
  p_offset integer default 0
)
returns table (
  id uuid,
  name text,
  country_code text,
  state_province text,
  city text,
  institution_type text,
  domain text,
  website_url text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    campus.id,
    campus.name,
    campus.country_code,
    campus.state_province,
    campus.city,
    campus.institution_type,
    campus.domain::text,
    campus.website_url,
    count(*) over() as total_count
  from public.campuses campus
  cross join lateral (select trim(coalesce(p_query, '')) as value) query
  where campus.status = 'active'
    and campus.country_code = 'IN'
    and (
      query.value = ''
      or campus.name ilike '%' || query.value || '%'
      or coalesce(campus.state_province, '') ilike '%' || query.value || '%'
      or coalesce(campus.city, '') ilike '%' || query.value || '%'
      or coalesce(campus.domain::text, '') ilike '%' || query.value || '%'
    )
  order by
    case
      when query.value = '' then 3
      when lower(campus.name) = lower(query.value) then 0
      when campus.name ilike query.value || '%' then 1
      else 2
    end,
    case when query.value = '' then 0 else similarity(campus.name, query.value) end desc,
    campus.name asc
  limit least(greatest(coalesce(p_limit, 25), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_campuses_mobile(text, integer, integer) from public;
grant execute on function public.search_campuses_mobile(text, integer, integer) to authenticated;

comment on function public.search_campuses_mobile(text, integer, integer) is
  'Searches active Indian colleges/universities imported by trusted backend catalogue jobs.';
