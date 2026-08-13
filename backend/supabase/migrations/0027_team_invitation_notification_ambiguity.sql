-- Fix team application/invitation notification trigger on PostgreSQL.
-- The old trigger declared owner_id and selected an unqualified owner_id,
-- which is ambiguous between the PL/pgSQL variable and team_requests column.

create or replace function private.notify_team_application_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  team_owner_id uuid;
  team_title text;
begin
  select team.owner_id, team.title
    into team_owner_id, team_title
    from public.team_requests as team
   where team.id = new.team_request_id;

  if tg_op = 'INSERT' and new.status = 'pending' and new.application_kind = 'application' then
    perform private.enqueue_notification(
      team_owner_id,
      'team_application',
      new.applicant_id,
      'team_request',
      new.team_request_id,
      jsonb_build_object('application_id', new.id, 'team_title', team_title),
      'team-application:' || new.id::text
    );
  elsif tg_op = 'INSERT' and new.status = 'pending' and new.application_kind = 'invitation' then
    perform private.enqueue_notification(
      new.applicant_id,
      'team_invitation',
      new.invited_by,
      'team_request',
      new.team_request_id,
      jsonb_build_object('application_id', new.id, 'team_title', team_title),
      'team-invitation:' || new.id::text
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status in ('accepted', 'rejected') then
    perform private.enqueue_notification(
      new.applicant_id,
      'team_application_' || new.status,
      new.decided_by,
      'team_request',
      new.team_request_id,
      jsonb_build_object('application_id', new.id, 'team_title', team_title),
      'team-decision:' || new.id::text || ':' || new.status
    );
  end if;

  return new;
end;
$$;

drop trigger if exists team_applications_notify on public.team_applications;
create trigger team_applications_notify
  after insert or update of status on public.team_applications
  for each row execute function private.notify_team_application_change();
