export type PhoenixMessage = [string | null, string | null, string, string, unknown];

export type RealtimeFrame =
  | { kind: 'connected' }
  | { kind: 'message-insert'; eventId: string }
  | { kind: 'error' }
  | { kind: 'ignore' };

interface ChangePayload {
  data?: {
    table?: unknown;
    type?: unknown;
    record?: Record<string, unknown>;
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

  const record = payload?.data?.record;
  if (
    payload?.data?.table !== 'chat_message_events'
    || payload.data.type !== 'INSERT'
    || record?.room_id !== roomId
    || typeof record.id !== 'string'
  ) {
    return { kind: 'ignore' };
  }

  return { kind: 'message-insert', eventId: record.id };
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
