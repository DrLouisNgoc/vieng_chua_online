const DEFAULT_RECONNECT_DELAY_MS = 2000;

export type PresenceStatus =
  | { kind: "connecting" }
  | { kind: "online"; count: number }
  | { kind: "offline" };

export interface PresenceClientOptions {
  url: string;
  onStatus: (status: PresenceStatus) => void;
  reconnectDelayMs?: number;
}

export interface PresenceClient {
  dispose: () => void;
}

interface PresenceMessage {
  type: "presence";
  count: number;
}

function isPresenceMessage(value: unknown): value is PresenceMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "presence" &&
    typeof (value as { count?: unknown }).count === "number"
  );
}

export function createPresenceClient(
  options: PresenceClientOptions,
): PresenceClient {
  const reconnectDelayMs =
    options.reconnectDelayMs ?? DEFAULT_RECONNECT_DELAY_MS;
  let disposed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let socket: WebSocket | undefined;

  function connect(): void {
    options.onStatus({ kind: "connecting" });
    socket = new WebSocket(options.url);

    socket.onmessage = (event: MessageEvent<string>) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }
      if (isPresenceMessage(parsed)) {
        options.onStatus({ kind: "online", count: parsed.count });
      }
    };

    socket.onclose = () => {
      options.onStatus({ kind: "offline" });
      if (!disposed) {
        reconnectTimer = setTimeout(connect, reconnectDelayMs);
      }
    };

    socket.onerror = () => {
      socket?.close();
    };
  }

  connect();

  function dispose(): void {
    disposed = true;
    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
    }
    socket?.close();
  }

  return { dispose };
}
