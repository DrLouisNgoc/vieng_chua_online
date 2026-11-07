import { pathToFileURL } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { createPresenceRoom } from "./presenceRoom.js";
import { parseClientMessage, type ServerMessage } from "./protocol.js";
import { createVisitorRoom } from "./visitorRoom.js";

const DEFAULT_PORT = 8787;
// A join or state message is ~250 bytes; anything far bigger is not ours.
const MAX_PAYLOAD_BYTES = 2048;
const TICK_MS = 100;
const MAX_MESSAGES_PER_SECOND = 30;

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function broadcast(clients: Iterable<WebSocket>, message: ServerMessage): void {
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === client.OPEN) client.send(payload);
  }
}

// Drops a socket's messages beyond MAX_MESSAGES_PER_SECOND in each second.
function createRateLimit(): () => boolean {
  let windowStart = Date.now();
  let count = 0;
  return () => {
    const now = Date.now();
    if (now - windowStart >= 1000) {
      windowStart = now;
      count = 0;
    }
    count += 1;
    return count <= MAX_MESSAGES_PER_SECOND;
  };
}

export function startPresenceServer(port: number = DEFAULT_PORT): WebSocketServer {
  const presence = createPresenceRoom();
  const visitors = createVisitorRoom();
  const clients = new Set<WebSocket>();
  const wss = new WebSocketServer({ port, maxPayload: MAX_PAYLOAD_BYTES });

  const tick = setInterval(() => {
    if (visitors.takeDirty()) {
      broadcast(clients, { type: "visitors", visitors: visitors.snapshot() });
    }
  }, TICK_MS);
  wss.on("close", () => clearInterval(tick));

  wss.on("connection", (socket) => {
    clients.add(socket);
    const visitorId = presence.join();
    const allowed = createRateLimit();
    broadcast(clients, { type: "presence", count: presence.count });

    socket.on("message", (data) => {
      if (!allowed()) return;
      const message = parseClientMessage(String(data));
      if (!message) return;
      if (message.type === "join") {
        visitors.join(visitorId, message.name, message.colorIndex);
        send(socket, { type: "welcome", id: visitorId });
        return;
      }
      const { type: _type, ...state } = message;
      if (visitors.updateState(visitorId, state) === "seat-refused" && state.seatIndex !== null) {
        send(socket, { type: "seat-refused", seatIndex: state.seatIndex });
      }
    });

    socket.on("error", (error) => {
      // oversized frames and protocol errors land here; ws then closes the socket
      console.warn(`Socket error from visitor ${visitorId}:`, error.message);
    });

    socket.on("close", () => {
      clients.delete(socket);
      presence.leave(visitorId);
      visitors.leave(visitorId);
      broadcast(clients, { type: "presence", count: presence.count });
    });
  });

  return wss;
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;
  startPresenceServer(port);
  console.error(`Presence server listening on ws://localhost:${port}`);
}
