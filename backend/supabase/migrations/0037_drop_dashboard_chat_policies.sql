-- Remove dashboard-created policies from the chat tables.
--
-- Same out-of-band origin as the users policies dropped in 0036. On the linked
-- project, `conversations` and `messages` each carry three extra policies made
-- with the Supabase dashboard templates. Permissive policies are OR'd, so each
-- extra SELECT policy widens access past what 0005_chat_realtime intended:
--
--   conversations  "Users can view their conversations"
--     using (auth.uid() = ANY (participants))
--     Trusts the legacy participants array that 0023 only keeps alive for
--     compatibility. public.can_access_conversation() requires membership in
--     conversation_members and, for direct chats, an accepted connection with
--     no block between the two users. The array check skips all three.
--
--   messages  "Users can view messages in their conversations"
--     using (exists (select 1 from conversations c where c.id = conversation_id
--            and auth.uid() = any (c.participants)))
--     messages_read_member additionally requires
--     `not are_users_blocked(sender_id, current_user_id())`. OR'd together, the
--     block list stops hiding messages.
--
-- Both also test auth.uid() directly rather than public.current_user_id(),
-- which bypasses the account_access_allowed gate 0032 uses to lock out
-- suspended, banned, and device-blocked accounts.
--
-- The INSERT and UPDATE templates are unreachable today: 0005:646-647 revokes
-- everything from `authenticated` and re-grants SELECT only, so no write ever
-- reaches a policy check. They are dropped anyway, because they would become
-- live holes the moment anyone grants a write privilege. Note that
-- "Users can insert messages to their conversations" checks only
-- `auth.uid() = sender_id` and never the conversation, despite its name.
--
-- All chat writes go through the security-definer RPCs (send_message,
-- edit_message, delete_message, ...), so dropping these changes no app path.
-- Every statement is idempotent.

drop policy if exists "Users can view their conversations" on public.conversations;
drop policy if exists "Users can create conversations" on public.conversations;
drop policy if exists "Users can update their conversations" on public.conversations;

drop policy if exists "Users can view messages in their conversations" on public.messages;
drop policy if exists "Users can insert messages to their conversations" on public.messages;
drop policy if exists "Users can update their own messages" on public.messages;

do $$
declare
  unexpected text;
begin
  select string_agg(tablename || '.' || policyname, ', ' order by tablename, policyname)
    into unexpected
    from pg_policies
   where schemaname = 'public'
     and tablename in ('conversations', 'messages')
     and policyname not in ('conversations_read_member', 'messages_read_member');
  if unexpected is not null then
    raise exception 'unexpected chat policies remain: %', unexpected;
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'conversations'
       and policyname = 'conversations_read_member'
  ) then
    raise exception 'public.conversations is missing conversations_read_member';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'messages'
       and policyname = 'messages_read_member'
  ) then
    raise exception 'public.messages is missing messages_read_member';
  end if;
end;
$$;

notify pgrst, 'reload schema';
