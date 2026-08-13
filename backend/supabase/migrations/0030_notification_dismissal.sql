-- Allow users to dismiss only notifications addressed to themselves.

create or replace function public.delete_notification_mobile(p_notification_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor uuid := public.current_user_id();
  deleted_id uuid;
begin
  if actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  delete from public.notifications notification
  where notification.id = p_notification_id
    and notification.user_id = actor
  returning notification.id into deleted_id;

  if deleted_id is null then
    raise exception 'notification unavailable' using errcode = '42501';
  end if;

  return deleted_id;
end;
$$;

revoke execute on function public.delete_notification_mobile(uuid) from public, anon;
grant execute on function public.delete_notification_mobile(uuid) to authenticated;
