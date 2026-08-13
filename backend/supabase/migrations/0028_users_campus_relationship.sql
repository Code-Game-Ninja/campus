-- Restore PostgREST's users -> campuses relationship on legacy cloud schemas.
-- Some existing projects added campus_id without its foreign-key metadata.

do $$
begin
  if not exists (
    select 1
      from pg_constraint constraint_row
      join pg_class table_row on table_row.oid = constraint_row.conrelid
      join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
      join pg_class target_table_row on target_table_row.oid = constraint_row.confrelid
      join pg_namespace target_schema_row on target_schema_row.oid = target_table_row.relnamespace
     where constraint_row.contype = 'f'
       and schema_row.nspname = 'public'
       and table_row.relname = 'users'
       and target_schema_row.nspname = 'public'
       and target_table_row.relname = 'campuses'
       and pg_get_constraintdef(constraint_row.oid) like '%(campus_id)%'
       and pg_get_constraintdef(constraint_row.oid) like '%campuses(id)%'
  ) then
    alter table public.users
      add constraint users_campus_id_fkey
      foreign key (campus_id) references public.campuses(id)
      on delete restrict not valid;
  end if;
end;
$$;

notify pgrst, 'reload schema';
