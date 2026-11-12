import type { ChatEntry, OutgoingState, ServerMessage, VisitorView } from "./visitor-protocol";
import { encodeChat, encodeJoin, encodeState, parseServerMessage, shouldSendState } from "./visitor-protocol";

const DEFAULT_RECONNECT_DELAY_MS = 2000;

export type PresenceStatus = { kind: "connecting" } | { kind: "online"; count: number } | { kind: "offline" };

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
  // Sent once right after connecting, before join: the pháp danh already
  // locked to this visitor's ip, or null for a first-time ip (owner,
  // 2026-11-10: "mỗi người sẽ phải để 1 pháp danh... trùng với ip của họ").
  onNameLock?: (name: string | null) => void;
  // join() was accepted — the server sent "welcome".
  onWelcome?: () => void;
  // join() was rejected: the submitted name was the forbidden default.
  onJoinRefused?: (reason: "default-name") => void;
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

type Callbacks = Required<Omit<PresenceClientOptions, "url" | "reconnectDelayMs" | "now">>;

function ignore(): void {
  // a callback the caller did not ask for
}

function withDefaults(options: PresenceClientOptions): Callbacks {
  return {
    onStatus: options.onStatus,
    onVisitors: options.onVisitors ?? ignore,
    onSeatRefused: options.onSeatRefused ?? ignore,
    onChat: options.onChat ?? ignore,
    onChatHistory: options.onChatHistory ?? ignore,
    onBell: options.onBell ?? ignore,
    onNameLock: options.onNameLock ?? ignore,
    onWelcome: options.onWelcome ?? ignore,
    onJoinRefused: options.onJoinRefused ?? ignore,
  };
}

// Hands one server message to its callback. Returns this visitor's own id,
// which "welcome" sets and "visitors" uses to leave this visitor out.
function deliver(message: ServerMessage, on: Callbacks, ownId: string | null): string | null {
  switch (message.type) {
    case "presence": {
      on.onStatus({ kind: "online", count: message.count });
      return ownId;
    }
    case "welcome": {
      on.onWelcome();
      return message.id;
    }
    case "visitors": {
      on.onVisitors(message.visitors.filter((visitor) => visitor.id !== ownId));
      return ownId;
    }
    case "seat-refused": {
      on.onSeatRefused(message.seatIndex);
      return ownId;
    }
    case "chat": {
      on.onChat(message.message);
      return ownId;
    }
    case "chat-history": {
      on.onChatHistory(message.messages);
      return ownId;
    }
    case "bell": {
      on.onBell();
      return ownId;
    }
    case "name-lock": {
      on.onNameLock(message.name);
      return ownId;
    }
    case "join-refused": {
      on.onJoinRefused(message.reason);
      return ownId;
    }
    default: {
      return ownId;
    }
  }
}

interface SocketEvents {
  onOpen: () => void;
  onMessage: (data: string) => void;
  onClose: () => void;
}

function openSocket(url: string, events: SocketEvents): WebSocket {
  const socket = new WebSocket(url);
  socket.addEventListener("open", events.onOpen);
  socket.addEventListener("message", (event: MessageEvent<string>) => {
    events.onMessage(event.data);
  });
  socket.addEventListener("close", events.onClose);
  socket.addEventListener("error", () => {
    socket.close();
  });
  return socket;
}

export function createPresenceClient(options: PresenceClientOptions): PresenceClient {
  const reconnectDelayMs = options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS;
  const now = options.now ?? (() => performance.now());
  const on = withDefaults(options);
  let isDisposed = false;
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
    if (!identity || !isOpen()) return;
    socket?.send(encodeJoin(identity.name, identity.colorIndex));
    // the server may have forgotten us; the next state must go out
    lastSent = null;
  }

  function connect(): void {
    on.onStatus({ kind: "connecting" });
    socket = openSocket(options.url, {
      onOpen: sendJoin,
      onMessage(data) {
        const message = parseServerMessage(data);
        if (message) ownId = deliver(message, on, ownId);
      },
      onClose() {
        on.onStatus({ kind: "offline" });
        on.onVisitors([]);
        ownId = null;
        if (!isDisposed) reconnectTimer = setTimeout(connect, reconnectDelayMs);
      },
    });
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
      isDisposed = true;
      if (reconnectTimer !== undefined) clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}
