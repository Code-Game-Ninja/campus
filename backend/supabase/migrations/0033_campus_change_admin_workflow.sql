alter table public.account_requests add column if not exists decision_reason text check (decision_reason is null or char_length(decision_reason) <= 2000);
alter table public.account_requests add column if not exists decided_by uuid references public.users(id) on delete set null;

create or replace function public.admin_decide_account_request_as(p_actor_id uuid, p_request_id uuid, p_decision text, p_reason text)
returns public.account_requests language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.admin_assignments; r public.account_requests; u public.users; c public.campuses; out_row public.account_requests;
begin
  if not public.is_service_role() then raise exception 'service role required' using errcode = '42501'; end if;
  if p_decision not in ('approve','reject') then raise exception 'invalid account request decision' using errcode = '22023'; end if;
  if nullif(trim(p_reason),'') is null then raise exception 'decision reason is required' using errcode = '22023'; end if;
  select * into a from public.admin_assignments where user_id=p_actor_id and status='active' and role in ('super_admin','campus_admin') order by case when role='super_admin' then 0 else 1 end limit 1;
  if a.id is null then raise exception 'admin assignment required' using errcode = '42501'; end if;
  select * into r from public.account_requests where id=p_request_id for update;
  if r.id is null then raise exception 'account request not found' using errcode = 'P0002'; end if;
  if r.request_type <> 'campus_change' or r.status not in ('pending','processing') then raise exception 'account request is not pending' using errcode = '40900'; end if;
  select * into u from public.users where id=r.user_id;
  if u.id is null then raise exception 'request user not found' using errcode = 'P0002'; end if;
  select * into c from public.campuses where id=r.target_campus_id and status='active';
  if c.id is null then raise exception 'requested campus is unavailable' using errcode = '22023'; end if;
  if a.role='campus_admin' and a.campus_id is distinct from c.id and a.campus_id is distinct from u.campus_id then raise exception 'request is outside the assigned campus' using errcode = '42501'; end if;
  if p_decision='approve' then update public.users set campus_id=c.id, updated_at=timezone('utc',now()) where id=u.id; end if;
  update public.account_requests set status=case when p_decision='approve' then 'completed' else 'rejected' end, decision_reason=trim(p_reason), decided_by=p_actor_id, completed_at=timezone('utc',now()), updated_at=timezone('utc',now()) where id=r.id returning * into out_row;
  insert into public.notifications(user_id,type,actor_id,subject_type,subject_id,payload)
  values (u.id,'campus_change_decided',p_actor_id,'account_request',r.id,jsonb_build_object('title',case when p_decision='approve' then 'Campus change approved' else 'Campus change rejected' end,'detail',trim(p_reason),'targetCampusId',c.id,'decision',p_decision));
  insert into public.audit_logs(actor_id,action,target_type,target_id,metadata) values (p_actor_id,'account_request.'||p_decision,'account_request',r.id,jsonb_build_object('user_id',u.id,'target_campus_id',c.id,'reason',trim(p_reason)));
  return out_row;
end; $$;
revoke execute on function public.admin_decide_account_request_as(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function public.admin_decide_account_request_as(uuid,uuid,text,text) to service_role;
