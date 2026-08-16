-- Additive admin control-plane schema for the separate admin-backend service.
-- Existing mobile tables, RLS policies, and public RPC contracts are preserved.

create table if not exists public.admin_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('campus_admin', 'event_manager', 'super_admin')),
  campus_id uuid references public.campuses(id) on delete cascade,
  organizer_id uuid references public.event_organizers(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_by uuid references public.users(id) on delete set null,
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((role = 'super_admin' and campus_id is null) or (role <> 'super_admin' and campus_id is not null))
);

create unique index if not exists admin_assignments_active_unique
  on public.admin_assignments (user_id, role, coalesce(campus_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'active';
create index if not exists admin_assignments_scope_idx on public.admin_assignments (campus_id, role, status);

create table if not exists public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  role text not null check (role in ('campus_admin', 'event_manager', 'super_admin')),
  campus_id uuid references public.campuses(id) on delete cascade,
  organizer_id uuid references public.event_organizers(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_by uuid references public.users(id) on delete set null,
  accepted_user_id uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default timezone('utc', now()) + interval '14 days',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((role = 'super_admin' and campus_id is null) or (role <> 'super_admin' and campus_id is not null))
);

create unique index if not exists admin_invitations_pending_unique
  on public.admin_invitations (email, role, coalesce(campus_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status = 'pending';

create table if not exists public.event_admin_owners (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  granted_by uuid references public.users(id) on delete set null,
  granted_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  primary key (event_id, user_id)
);

create index if not exists event_admin_owners_user_idx on public.event_admin_owners (user_id, status, event_id);

create table if not exists public.admin_workspace_settings (
  scope_key text primary key check (scope_key = 'global' or scope_key ~ '^campus:[0-9a-f-]{36}$'),
  display_name text not null default '',
  support_email citext,
  admin_notice text not null default '' check (char_length(admin_notice) <= 4000),
  digest_enabled boolean not null default true,
  moderation_alerts boolean not null default true,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists admin_assignments_set_updated_at on public.admin_assignments;
create trigger admin_assignments_set_updated_at before update on public.admin_assignments for each row execute function private.set_updated_at();
drop trigger if exists admin_invitations_set_updated_at on public.admin_invitations;
create trigger admin_invitations_set_updated_at before update on public.admin_invitations for each row execute function private.set_updated_at();
drop trigger if exists admin_workspace_settings_set_updated_at on public.admin_workspace_settings;
create trigger admin_workspace_settings_set_updated_at before update on public.admin_workspace_settings for each row execute function private.set_updated_at();

alter table public.admin_assignments enable row level security;
alter table public.admin_invitations enable row level security;
alter table public.event_admin_owners enable row level security;
alter table public.admin_workspace_settings enable row level security;

revoke all on public.admin_assignments, public.admin_invitations, public.event_admin_owners, public.admin_workspace_settings from anon, authenticated;
grant all on public.admin_assignments, public.admin_invitations, public.event_admin_owners, public.admin_workspace_settings to service_role;

-- Preserve existing global staff access during rollout. Re-running is safe.
insert into public.admin_assignments (user_id, role, campus_id, status, granted_by)
select staff.user_id, 'super_admin', null, 'active', staff.granted_by
from public.staff_roles staff
where staff.role = 'admin' and staff.revoked_at is null
on conflict do nothing;

create or replace function public.admin_apply_moderation_action_as(
  p_actor_id uuid,
  p_report_id uuid,
  p_action text,
  p_reason text default null
)
returns public.reports
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare target public.reports; result public.reports;
begin
  if not public.is_service_role() then raise exception 'service role required' using errcode = '42501'; end if;
  if not exists (select 1 from public.admin_assignments where user_id = p_actor_id and role in ('campus_admin', 'super_admin') and status = 'active') then
    raise exception 'admin assignment required' using errcode = '42501';
  end if;
  if p_action not in ('dismiss', 'hide', 'remove', 'warn', 'suspend', 'ban', 'restrict_posting', 'restrict_chat', 'escalate', 'restore') then
    raise exception 'invalid moderation action' using errcode = '22023';
  end if;
  select * into target from public.reports where id = p_report_id for update;
  if not found then raise exception 'report not found' using errcode = 'P0002'; end if;

  if p_action = 'hide' and target.target_type = 'post' then update public.posts set status = 'hidden' where id = target.target_id; end if;
  if p_action = 'remove' and target.target_type = 'post' then update public.posts set status = 'removed', deleted_at = timezone('utc', now()) where id = target.target_id; end if;
  if p_action = 'remove' and target.target_type = 'comment' then update public.comments set status = 'removed', deleted_at = timezone('utc', now()) where id = target.target_id; end if;
  if p_action = 'remove' and target.target_type = 'message' then update public.messages set status = 'removed', deleted_at = timezone('utc', now()), text = null where id = target.target_id; end if;
  if p_action in ('suspend', 'ban') and target.target_type = 'user' then update public.users set status = 'suspended' where id = target.target_id; end if;
  if p_action = 'restore' and target.target_type = 'user' then update public.users set status = 'active' where id = target.target_id and status = 'suspended'; end if;
  if p_action = 'restore' and target.target_type = 'post' then update public.posts set status = 'published', deleted_at = null where id = target.target_id; end if;
  if p_action = 'restore' and target.target_type = 'comment' then update public.comments set status = 'published', deleted_at = null where id = target.target_id; end if;

  insert into public.moderation_actions (actor_id, target_type, target_id, action, reason, metadata)
  values (p_actor_id, target.target_type, target.target_id, p_action, nullif(trim(p_reason), ''), jsonb_build_object('report_id', target.id, 'source', 'admin-backend'));
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values (p_actor_id, 'moderation.' || p_action, target.target_type, target.target_id, jsonb_build_object('report_id', target.id, 'source', 'admin-backend'));
  update public.reports
  set status = case when p_action = 'dismiss' then 'dismissed' when p_action = 'escalate' then 'reviewing' else 'resolved' end,
      resolution = coalesce(nullif(trim(p_reason), ''), p_action), resolved_by = p_actor_id,
      resolved_at = case when p_action = 'escalate' then null else timezone('utc', now()) end
  where id = target.id returning * into result;
  return result;
end;
$$;

revoke execute on function public.admin_apply_moderation_action_as(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_apply_moderation_action_as(uuid, uuid, text, text) to service_role;
