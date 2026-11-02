import { pathToFileURL } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { createPresenceRoom } from "./presenceRoom.js";

const DEFAULT_PORT = 8787;

interface PresenceMessage {
  type: "presence";
  count: number;
}

function broadcastPresence(clients: Set<WebSocket>, count: number): void {
  const message: PresenceMessage = { type: "presence", count };
  const payload = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

export function startPresenceServer(port: number = DEFAULT_PORT): WebSocketServer {
  const room = createPresenceRoom();
  const clients = new Set<WebSocket>();
  const wss = new WebSocketServer({ port });

  wss.on("connection", (socket) => {
    clients.add(socket);
    const visitorId = room.join();
    broadcastPresence(clients, room.count);

    socket.on("close", () => {
      clients.delete(socket);
      room.leave(visitorId);
      broadcastPresence(clients, room.count);
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
