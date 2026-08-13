import { getAccessToken, subscribeAccessToken } from './api';
import { encodePhoenixMessage, parseRealtimeFrame } from './realtime-chat-protocol';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected' | 'error';
export interface RealtimeChatSubscription {
  setEnabled(enabled: boolean): void;
  unsubscribe(): void;
}

const HEARTBEAT_MS = 25_000;
const CONNECT_TIMEOUT_MS = 10_000;
const MAX_RECONNECT_MS = 30_000;

/**
 * Subscribe to authorized chat event rows as cache invalidation signals.
 * The persisted message body remains fetched through the authorized app API.
 */
export function subscribeToRoomMessages(
  roomId: string,
  onInvalidate: () => void,
  onStatus?: (status: RealtimeStatus) => void,
): RealtimeChatSubscription {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !getAccessToken() || typeof WebSocket === 'undefined') {
    onStatus?.('error');
    return { setEnabled() {}, unsubscribe() {} };
  }

  const websocketUrl = `${SUPABASE_URL.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(SUPABASE_ANON_KEY)}&vsn=1.0.0`;
  const topic = `realtime:chat-message-events:${roomId}`;
  let ref = 1;
  let stopped = false;
  let enabled = true;
  let reconnectAttempt = 0;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let connectTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  type WS = { onopen: ((e: Event) => void) | null; onclose: ((e: Event) => void) | null; onmessage: ((e: MessageEvent) => void) | null; onerror: ((e: Event) => void) | null; send(data: string): void; close(): void; readyState: number };
  let socket: WS | null = null;
  const seenEventIds = new Set<string>();

  const clearConnectionTimers = (): void => {
    if (heartbeat) clearInterval(heartbeat);
    if (connectTimeout) clearTimeout(connectTimeout);
    heartbeat = null;
    connectTimeout = null;
  };

  const closeSocket = (): void => {
    clearConnectionTimers();
    const current = socket;
    socket = null;
    if (!current) return;
    if (current.readyState === WebSocket.OPEN) {
      const leaveRef = String(ref++);
      current.send(encodePhoenixMessage(leaveRef, leaveRef, topic, 'phx_leave', {}));
    }
    current.close();
  };

  const scheduleReconnect = (delay?: number): void => {
    if (stopped || !enabled || reconnectTimer) return;
    const wait = delay ?? Math.min(1_000 * (2 ** reconnectAttempt), MAX_RECONNECT_MS);
    reconnectAttempt += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, wait);
  };

  const connect = (): void => {
    if (stopped || !enabled || socket) return;
    const token = getAccessToken();
    if (!token) {
      onStatus?.('error');
      return;
    }

    onStatus?.('connecting');
    const current = new WebSocket(websocketUrl) as unknown as { onopen: ((e: Event) => void) | null; onclose: ((e: Event) => void) | null; onmessage: ((e: MessageEvent) => void) | null; onerror: ((e: Event) => void) | null; send(data: string): void; close(): void; readyState: number };
    socket = current;
    const joinRef = String(ref++);

    current.onopen = () => {
      if (socket !== current || stopped || !enabled) return;
      current.send(encodePhoenixMessage(joinRef, joinRef, topic, 'phx_join', {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
          postgres_changes: [{
            event: 'INSERT',
            schema: 'public',
            table: 'chat_message_events',
            filter: `room_id=eq.${roomId}`,
          }, {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${roomId}`,
          }],
        },
        access_token: token,
      }));
      heartbeat = setInterval(() => {
        if (current.readyState !== WebSocket.OPEN) return;
        const heartbeatRef = String(ref++);
        current.send(encodePhoenixMessage(null, heartbeatRef, 'phoenix', 'heartbeat', {}));
      }, HEARTBEAT_MS);
    };

    connectTimeout = setTimeout(() => {
      if (socket !== current) return;
      onStatus?.('error');
      closeSocket();
      scheduleReconnect();
    }, CONNECT_TIMEOUT_MS);

    current.onmessage = (event) => {
      if (socket !== current) return;
      const frame = parseRealtimeFrame(String(event.data), topic, roomId);
      if (frame.kind === 'connected') {
        if (connectTimeout) clearTimeout(connectTimeout);
        connectTimeout = null;
        reconnectAttempt = 0;
        onStatus?.('connected');
      } else if (frame.kind === 'message-event') {
        if (seenEventIds.has(frame.eventId)) return;
        seenEventIds.add(frame.eventId);
        if (seenEventIds.size > 100) seenEventIds.delete(seenEventIds.values().next().value as string);
        onInvalidate();
      } else if (frame.kind === 'error') {
        onStatus?.('error');
        closeSocket();
        scheduleReconnect();
      }
    };

    current.onerror = () => {
      if (socket !== current) return;
      onStatus?.('error');
      closeSocket();
      scheduleReconnect();
    };
    current.onclose = () => {
      if (socket !== current) return;
      socket = null;
      clearConnectionTimers();
      if (!stopped && enabled) {
        onStatus?.('disconnected');
        scheduleReconnect();
      }
    };
  };

  const unsubscribeToken = subscribeAccessToken(() => {
    if (stopped) return;
    closeSocket();
    scheduleReconnect(0);
  });

  connect();

  return {
    setEnabled(nextEnabled: boolean): void {
      if (stopped || enabled === nextEnabled) return;
      enabled = nextEnabled;
      if (!enabled) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = null;
        closeSocket();
        onStatus?.('disconnected');
      } else {
        scheduleReconnect(0);
      }
    },
    unsubscribe(): void {
      if (stopped) return;
      stopped = true;
      unsubscribeToken();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      closeSocket();
    },
  };
}
