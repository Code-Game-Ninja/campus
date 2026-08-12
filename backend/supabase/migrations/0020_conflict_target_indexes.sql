-- Restore unique conflict targets for legacy/partially provisioned cloud schemas.
-- RPCs use these exact targets for idempotent connections and chat rooms.

create unique index if not exists connections_pair_unique
  on public.connections ((least(requester_id, addressee_id)), (greatest(requester_id, addressee_id)));

create unique index if not exists conversations_direct_connection_uidx
  on public.conversations (direct_connection_id);

create unique index if not exists conversations_team_request_uidx
  on public.conversations (team_request_id);

create unique index if not exists conversations_event_uidx
  on public.conversations (event_id);

create unique index if not exists conversation_members_pair_uidx
  on public.conversation_members (conversation_id, user_id);
