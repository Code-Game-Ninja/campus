-- Add uniquely named, non-partial arbiters. Legacy index names may already
-- exist with incompatible columns/partial predicates, causing ON CONFLICT
-- inference to fail even when an IF NOT EXISTS migration reports success.
create unique index if not exists campusphere_connections_pair_uidx
  on public.connections ((least(requester_id, addressee_id)), (greatest(requester_id, addressee_id)));

create unique index if not exists campusphere_conversations_direct_uidx
  on public.conversations (direct_connection_id);

create unique index if not exists campusphere_conversations_team_uidx
  on public.conversations (team_request_id);

create unique index if not exists campusphere_conversations_event_uidx
  on public.conversations (event_id);

create unique index if not exists campusphere_conversation_members_pair_uidx
  on public.conversation_members (conversation_id, user_id);

create unique index if not exists campusphere_messages_sender_client_uidx
  on public.messages (sender_id, client_message_id);

