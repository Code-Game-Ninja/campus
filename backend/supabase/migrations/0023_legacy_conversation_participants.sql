-- Keep cloud projects with a legacy conversations.participants column
-- compatible with normalized conversation_members writes.
do $$
declare
  participants_type text;
  empty_value text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
  into participants_type
  from pg_attribute attribute
  join pg_class relation on relation.oid = attribute.attrelid
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname = 'conversations'
    and attribute.attname = 'participants'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if participants_type is null then
    return;
  end if;

  if participants_type = 'jsonb' then
    empty_value := '''[]''::jsonb';
  elsif participants_type = 'json' then
    empty_value := '''[]''::json';
  elsif participants_type = 'text' then
    empty_value := '''[]''::text';
  elsif participants_type like '%[]' then
    empty_value := format('''{}''::%s', participants_type);
  else
    raise exception 'unsupported legacy conversations.participants type: %', participants_type;
  end if;

  execute format(
    'update public.conversations set participants = %s where participants is null',
    empty_value
  );
  execute format(
    'alter table public.conversations alter column participants set default %s',
    empty_value
  );
end;
$$;

