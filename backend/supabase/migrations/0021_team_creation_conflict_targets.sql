-- Make team creation compatible with legacy/partially provisioned schemas.
--
-- Some projects already have partial indexes using the original index names.
-- `CREATE INDEX IF NOT EXISTS` then skips them, but a partial index cannot
-- arbitrate an unqualified `ON CONFLICT (column)` clause. Independently named,
-- non-partial indexes guarantee the RPC and its team-chat trigger have valid
-- conflict targets without dropping or rewriting existing indexes or data.

create unique index if not exists conversations_team_request_conflict_uidx
  on public.conversations (team_request_id);

create unique index if not exists conversation_members_conflict_uidx
  on public.conversation_members (conversation_id, user_id);

create unique index if not exists skills_name_conflict_uidx
  on public.skills (name);

create unique index if not exists interests_name_conflict_uidx
  on public.interests (name);
