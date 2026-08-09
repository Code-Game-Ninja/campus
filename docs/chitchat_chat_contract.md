# ChitChat Chat Reuse Contract

Reviewed source, read-only: `E:\projects\ChitChat`

ChitChat and CampusSphere use separate backends. No ChitChat files or database objects are modified or migrated. CampusSphere only reuses selected contract ideas.

## Existing contract retained

- Supabase Auth session is the identity source.
- Browser/web client uses `@supabase/ssr` and `@supabase/supabase-js`.
- Direct room compatibility names remain `conversations` and `messages`.
- Existing message fields are mapped as follows:

| ChitChat | CampusSphere | Notes |
|---|---|---|
| `conversation_id` | `conversation_id` | Same direct lookup concept; normalized membership is authoritative. |
| `sender_id` | `sender_id` | Must be the authenticated user. |
| `text` | `text` | Text remains supported up to 4,000 characters. |
| `read`, `read_at` | `message_receipts`, `conversation_members.last_read_*` | Per-user receipts replace one shared boolean. |
| `edited`, `edited_at` | `status`, `edited_at`, `deleted_at` | Server RPC enforces a 15-minute edit/delete window. |
| `created_at` | `created_at` | UTC ordering uses `(created_at, id)`. |

## Realtime compatibility

- Existing typing broadcast channel: `typing:<conversationId>`.
- CampusSphere keeps this channel convention for typing/presence UI.
- Persisted message updates are emitted through `chat_message_events`.
- Mobile subscribes to `realtime:chat-message-events:<roomId>` with Postgres Changes and refetches authorized messages after an event.
- Reconnect uses the existing Phoenix heartbeat/backoff behavior in `prototype/src/lib/realtime-chat.ts`.

## CampusSphere safety additions

- Direct rooms require an accepted connection and no block in either direction.
- Team rooms are created for Team Finder requests and synchronized with `team_members`.
- Event rooms can only be created by the service role for registered attendees.
- All message writes use RPCs; clients do not insert/update message rows directly.
- `client_message_id` provides idempotent optimistic sends.
- Room membership is checked on history, send, read, reaction, search, and realtime access.
- Attachments use private `chat-attachments` storage with a 20 MB limit and scan status.
- Reports target messages without copying private message bodies into audit logs.

## Supported MVP message types

`text`, `file`, `link`, `gif`, `sticker`, and `system`.

## RPC surface

- `create_direct_conversation(uuid)`
- `ensure_team_conversation(uuid)`
- `create_group_conversation(text, uuid[])`
- `send_message(uuid, text, text, text, text, uuid, jsonb)`
- `edit_message(uuid, text)`
- `delete_message(uuid)`
- `mark_conversation_read(uuid, uuid)`
- `set_message_reaction(uuid, text, boolean)`
- `attach_message_file(uuid, text, text, text, bigint, jsonb)`
- `search_messages(text, integer)`

`ensure_event_conversation(uuid)` is service-role-only and is intentionally not exposed to mobile students.
