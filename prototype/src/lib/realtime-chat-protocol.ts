export type PhoenixMessage = [string | null, string | null, string, string, unknown];

export type RealtimeFrame =
  | { kind: 'connected' }
  | { kind: 'message-event'; eventId: string; eventType: string }
  | { kind: 'error' }
  | { kind: 'ignore' };

interface ChangePayload {
  data?: {
    table?: unknown;
    type?: unknown;
    record?: Record<string, unknown>;
    old_record?: Record<string, unknown>;
  };
  response?: { status?: unknown };
  status?: unknown;
}

export function parseRealtimeFrame(
  raw: unknown,
  expectedTopic: string,
  roomId: string,
): RealtimeFrame {
  let message: unknown = raw;
  if (typeof raw === 'string') {
    try {
      message = JSON.parse(raw);
    } catch {
      return { kind: 'ignore' };
    }
  }

  if (!Array.isArray(message) || message.length !== 5) return { kind: 'ignore' };
  const [, , topic, event, rawPayload] = message as PhoenixMessage;
  if (topic !== expectedTopic) return { kind: 'ignore' };

  const payload = rawPayload && typeof rawPayload === 'object'
    ? rawPayload as ChangePayload
    : undefined;

  if (event === 'phx_reply') {
    return payload?.status === 'ok' || payload?.response?.status === 'ok'
      ? { kind: 'connected' }
      : { kind: 'ignore' };
  }
  if (event === 'phx_error' || event === 'phx_close') return { kind: 'error' };
  if (event !== 'postgres_changes') return { kind: 'ignore' };

  const table = payload?.data?.table;
  const changeType = String(payload?.data?.type ?? '');
  const record = payload?.data?.record ?? payload?.data?.old_record;
  if (!record || typeof record.id !== 'string') return { kind: 'ignore' };
  if (table === 'chat_message_events' && record.room_id === roomId) {
    return { kind: 'message-event', eventId: `event:${record.id}`, eventType: String(record.event_type ?? 'message_created') };
  }
  if (table === 'messages' && record.conversation_id === roomId) {
    const version = String(record.updated_at ?? record.created_at ?? record.status ?? '');
    return { kind: 'message-event', eventId: `message:${changeType}:${record.id}:${version}`, eventType: changeType.toLowerCase() };
  }
  return { kind: 'ignore' };
}

export function encodePhoenixMessage(
  joinRef: string | null,
  ref: string,
  topic: string,
  event: string,
  payload: unknown,
): string {
  return JSON.stringify([joinRef, ref, topic, event, payload] satisfies PhoenixMessage);
}
