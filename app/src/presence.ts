import {
  encodeChat,
  encodeJoin,
  encodeState,
  parseServerMessage,
  shouldSendState,
  type ChatEntry,
  type OutgoingState,
  type VisitorView,
} from "./visitor-protocol";

const DEFAULT_RECONNECT_DELAY_MS = 2000;

export type PresenceStatus =
  | { kind: "connecting" }
  | { kind: "online"; count: number }
  | { kind: "offline" };

export interface PresenceClientOptions {
  url: string;
  onStatus: (status: PresenceStatus) => void;
  // Everyone else in the temple (Milestone 6); [] while disconnected.
  onVisitors?: (visitors: VisitorView[]) => void;
  onSeatRefused?: (seatIndex: number) => void;
  // A new chat message, in arrival order; onChatHistory first, for anyone
  // already chatting before this client connected.
  onChat?: (message: ChatEntry) => void;
  onChatHistory?: (messages: ChatEntry[]) => void;
  // One bell toll for everyone present, when any visitor (including this
  // one) joins.
  onBell?: () => void;
  reconnectDelayMs?: number;
  now?: () => number;
}

export interface PresenceClient {
  // Enter the temple as a visitor; repeated automatically after reconnects.
  join: (name: string, colorIndex: number) => void;
  // Throttled: only sent after joining, when changed, every 100 ms at most.
  sendState: (state: OutgoingState) => void;
  sendChat: (text: string) => void;
  dispose: () => void;
}

export function createPresenceClient(
  options: PresenceClientOptions,
): PresenceClient {
  const reconnectDelayMs =
    options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS;
  const now = options.now ?? (() => performance.now());
  let disposed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let socket: WebSocket | undefined;
  let identity: { name: string; colorIndex: number } | null = null;
  let ownId: string | null = null;
  let lastSent: OutgoingState | null = null;
  let lastSentAt = 0;

  function isOpen(): boolean {
    return socket?.readyState === WebSocket.OPEN;
  }

  function sendJoin(): void {
    if (identity && isOpen()) {
      socket?.send(encodeJoin(identity.name, identity.colorIndex));
      // the server may have forgotten us; the next state must go out
      lastSent = null;
    }
  }

  function connect(): void {
    options.onStatus({ kind: "connecting" });
    socket = new WebSocket(options.url);

    socket.onopen = () => {
      sendJoin();
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      const message = parseServerMessage(event.data);
      if (!message) return;
      switch (message.type) {
        case "presence":
          options.onStatus({ kind: "online", count: message.count });
          break;
        case "welcome":
          ownId = message.id;
          break;
        case "visitors":
          options.onVisitors?.(message.visitors.filter((visitor) => visitor.id !== ownId));
          break;
        case "seat-refused":
          options.onSeatRefused?.(message.seatIndex);
          break;
        case "chat":
          options.onChat?.(message.message);
          break;
        case "chat-history":
          options.onChatHistory?.(message.messages);
          break;
        case "bell":
          options.onBell?.();
          break;
      }
    };

    socket.onclose = () => {
      options.onStatus({ kind: "offline" });
      options.onVisitors?.([]);
      ownId = null;
      if (!disposed) {
        reconnectTimer = setTimeout(connect, reconnectDelayMs);
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
  }

  connect();

  return {
    join(name, colorIndex) {
      identity = { name, colorIndex };
      sendJoin();
    },
    sendState(state) {
      if (!identity || !isOpen()) return;
      const at = now();
      if (!shouldSendState(lastSent, state, at - lastSentAt)) return;
      socket?.send(encodeState(state));
      lastSent = state;
      lastSentAt = at;
    },
    sendChat(text) {
      if (!identity || !isOpen()) return;
      socket?.send(encodeChat(text));
    },
    dispose() {
      disposed = true;
      if (reconnectTimer !== undefined) {
        clearTimeout(reconnectTimer);
      }
      socket?.close();
    },
  };
}
