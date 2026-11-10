import { createServer } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { createAdminAuth } from "./adminAuth.js";
import { BOARD_SEEDS, createBoardStore, mergeWithSeed } from "./boards.js";
import { createBoardsRequestListener } from "./boardsHttp.js";
import { readBoardsFile, writeBoardsFile } from "./boardsFile.js";
import { clientIp } from "./clientIp.js";
import { createChatRoom } from "./chatRoom.js";
import { createPresenceRoom } from "./presenceRoom.js";
import { parseClientMessage, type ServerMessage } from "./protocol.js";
import { createVisitorRoom } from "./visitorRoom.js";
import { createVisitorNameStore, isDefaultName } from "./visitorNames.js";

const DEFAULT_PORT = 8787;
const DEFAULT_BOARDS_FILE = (): string => join(process.cwd(), "data", "boards.json");
const DEFAULT_VISITOR_NAMES_FILE = (): string => join(process.cwd(), "data", "visitor-names.json");

// A join or state message is ~250 bytes; anything far bigger is not ours.
const MAX_PAYLOAD_BYTES = 2048;
const TICK_MS = 100;
const MAX_MESSAGES_PER_SECOND = 30;
const MAX_CONNECTIONS_PER_IP = 8;
// The temple bell also tolls on its own, once an hour, independent of
// anyone joining (owner, 2026-11-10: "âm thanh chuông tự động đánh...
// cứ 1 tiếng đánh 1 lần").
const DEFAULT_BELL_INTERVAL_MS = 60 * 60 * 1000;
// WebSocket close code 1001 "going away" (RFC 6455 §7.4.1).
const GOING_AWAY = 1001;
const SHUTDOWN_GRACE_MS = 3000;

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

export function startPresenceServer(
  port: number = DEFAULT_PORT,
  boardsFilePath: string = DEFAULT_BOARDS_FILE(),
  visitorNamesFilePath: string = DEFAULT_VISITOR_NAMES_FILE(),
  bellIntervalMs: number = DEFAULT_BELL_INTERVAL_MS,
): WebSocketServer {
  const presence = createPresenceRoom();
  const visitors = createVisitorRoom();
  const chat = createChatRoom();
  const clients = new Set<WebSocket>();

  const persistedFile = readBoardsFile(boardsFilePath);
  const persistedFileRecord =
    typeof persistedFile === "object" && persistedFile !== null ? (persistedFile as Record<string, unknown>) : {};
  const boardStore = createBoardStore(mergeWithSeed(persistedFileRecord.boards, BOARD_SEEDS));
  const adminAuth = createAdminAuth(
    typeof persistedFileRecord.adminPasswordHash === "string" ? persistedFileRecord.adminPasswordHash : null,
  );
  const persistBoards = (): void =>
    writeBoardsFile(boardsFilePath, {
      adminPasswordHash: adminAuth.snapshotHash(),
      boards: boardStore.snapshot(),
    });
  // Pháp danh locked per ip (owner, 2026-11-10); persisted so the lock
  // survives a server restart/redeploy, same reasoning as boards.json.
  const visitorNames = createVisitorNameStore(readBoardsFile(visitorNamesFilePath));
  const persistVisitorNames = (): void => writeBoardsFile(visitorNamesFilePath, visitorNames.snapshot());
  const httpServer = createServer(createBoardsRequestListener(boardStore, adminAuth, persistBoards));
  // Without this, a bind failure (e.g. the port not yet freed by a just-
  // restarted process) is an unhandled 'error' event, which Node re-throws
  // and crashes the process with a raw stack trace.
  httpServer.on("error", (error: NodeJS.ErrnoException) => {
    console.error(`Could not listen on port ${port}:`, error.message);
    process.exitCode = 1;
  });
  const connectionsByIp = new Map<string, number>();
  // Unset in dev/tests (no browser Origin to check against); set in
  // production to the real site so other pages can't open a WS connection
  // to this server.
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  const wss = new WebSocketServer({
    server: httpServer,
    maxPayload: MAX_PAYLOAD_BYTES,
    verifyClient: allowedOrigin ? (info, callback) => callback(info.origin === allowedOrigin) : undefined,
  });
  // ws re-emits the server's 'error' on itself too; an unhandled 'error'
  // event throws, so this needs its own listener as well as httpServer's.
  wss.on("error", () => {});
  httpServer.listen(port);
  // `server` option: ws does not close the HTTP server on its own (see ws
  // docs) — close it ourselves so the port is freed with the WS server.
  wss.on("close", () => httpServer.close());

  const tick = setInterval(() => {
    if (visitors.takeDirty()) {
      broadcast(clients, { type: "visitors", visitors: visitors.snapshot() });
    }
  }, TICK_MS);
  wss.on("close", () => clearInterval(tick));

  const hourlyBell = setInterval(() => broadcast(clients, { type: "bell" }), bellIntervalMs);
  wss.on("close", () => clearInterval(hourlyBell));

  wss.on("connection", (socket, request) => {
    const ip = clientIp(request);
    const connectionCount = (connectionsByIp.get(ip) ?? 0) + 1;
    if (connectionCount > MAX_CONNECTIONS_PER_IP) {
      socket.close(1008, "too many connections from this address");
      return;
    }
    connectionsByIp.set(ip, connectionCount);

    clients.add(socket);
    const visitorId = presence.join();
    const allowed = createRateLimit();
    send(socket, { type: "name-lock", name: visitorNames.nameFor(ip) });
    broadcast(clients, { type: "presence", count: presence.count });

    socket.on("message", (data) => {
      if (!allowed()) return;
      const message = parseClientMessage(String(data));
      if (!message) return;
      if (message.type === "join") {
        const lockedName = visitorNames.nameFor(ip);
        if (lockedName === null) {
          if (isDefaultName(message.name)) {
            send(socket, { type: "join-refused", reason: "default-name" });
            return;
          }
          visitorNames.register(ip, message.name);
          persistVisitorNames();
        }
        visitors.join(visitorId, lockedName ?? message.name, message.colorIndex);
        send(socket, { type: "welcome", id: visitorId });
        send(socket, { type: "chat-history", messages: chat.recent() });
        broadcast(clients, { type: "bell" });
        return;
      }
      if (message.type === "chat") {
        const name = visitors.nameOf(visitorId);
        if (name === undefined) return; // chat before join is dropped
        const entry = chat.add(name, message.text);
        broadcast(clients, { type: "chat", message: entry });
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
      const remaining = (connectionsByIp.get(ip) ?? 1) - 1;
      if (remaining <= 0) connectionsByIp.delete(ip);
      else connectionsByIp.set(ip, remaining);

      clients.delete(socket);
      presence.leave(visitorId);
      visitors.leave(visitorId);
      broadcast(clients, { type: "presence", count: presence.count });
    });
  });

  return wss;
}

// systemd sends SIGTERM on every stop/restart, i.e. on every deploy. Close
// each visitor with 1001 "going away" (the client reconnects on close)
// rather than letting the process die under them, then free the port.
export function stopPresenceServer(wss: WebSocketServer): Promise<void> {
  for (const client of wss.clients) client.close(GOING_AWAY, "server restarting");
  return new Promise((resolve) => wss.close(() => resolve()));
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const port = process.env.PORT ? Number(process.env.PORT) : DEFAULT_PORT;
  const wss = startPresenceServer(port);
  console.error(`Presence server listening on ws://localhost:${port}`);
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, () => {
      // A visitor socket that never finishes its close handshake must not
      // hold up the restart.
      setTimeout(() => process.exit(0), SHUTDOWN_GRACE_MS).unref();
      void stopPresenceServer(wss).then(() => process.exit(0));
    });
  }
}
