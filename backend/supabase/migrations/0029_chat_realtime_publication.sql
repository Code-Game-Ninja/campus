-- Reassert chat Realtime publication on legacy/cloud projects.
-- Mobile subscribes to messages directly and to small invalidation events.

alter table public.messages replica identity full;
alter table public.chat_message_events replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_message_events'
  ) then
    alter publication supabase_realtime add table public.chat_message_events;
  end if;
end;
$$;
