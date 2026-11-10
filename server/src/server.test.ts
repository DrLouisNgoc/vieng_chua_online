import { describe, it, expect, afterEach } from "vitest";
import { WebSocket, type WebSocketServer } from "ws";
import type { AddressInfo } from "node:net";
import { startPresenceServer } from "./server.js";

interface Client {
  socket: WebSocket;
  messages: Array<Record<string, unknown>>;
  send: (value: unknown) => void;
  waitFor: (match: (message: Record<string, unknown>) => boolean) => Promise<Record<string, unknown>>;
}

let server: WebSocketServer | undefined;
const sockets: WebSocket[] = [];

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.close();
  await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  server = undefined;
});

async function connect(options?: { origin?: string }): Promise<Client> {
  if (!server) throw new Error("server not started");
  const { port } = server.address() as AddressInfo;
  const socket = new WebSocket(`ws://127.0.0.1:${port}`, options?.origin ? { origin: options.origin } : undefined);
  sockets.push(socket);
  const messages: Array<Record<string, unknown>> = [];
  const waiters: Array<() => void> = [];
  socket.on("message", (data) => {
    messages.push(JSON.parse(String(data)) as Record<string, unknown>);
    for (const wake of waiters.splice(0)) wake();
  });
  await new Promise((resolve) => socket.once("open", resolve));
  return {
    socket,
    messages,
    send: (value) => socket.send(typeof value === "string" ? value : JSON.stringify(value)),
    async waitFor(match) {
      const deadline = Date.now() + 2000;
      for (;;) {
        const found = messages.find(match);
        if (found) return found;
        if (Date.now() > deadline) throw new Error(`timed out; got ${JSON.stringify(messages)}`);
        await new Promise<void>((resolve) => {
          waiters.push(resolve);
          setTimeout(resolve, 50);
        });
      }
    },
  };
}

const seatedState = {
  type: "state",
  x: 2.1,
  z: -5,
  heading: Math.PI,
  activity: "seated",
  seatIndex: 7,
  holdingBroom: false,
  beadsVisible: false,
  beadTotal: 0,
};

type Visitors = { visitors: Array<Record<string, unknown>> };

describe("presence server with visitors", () => {
  it("welcomes a joined visitor and broadcasts everyone's state", async () => {
    server = startPresenceServer(0);
    const a = await connect();
    const b = await connect();
    a.send({ type: "join", name: "An", colorIndex: 1 });
    b.send({ type: "join", name: "Bình", colorIndex: 2 });
    const welcome = await a.waitFor((m) => m.type === "welcome");
    expect(typeof welcome.id).toBe("string");

    a.send(seatedState);
    const seen = await b.waitFor(
      (m) =>
        m.type === "visitors" &&
        (m as unknown as Visitors).visitors.some((v) => v.name === "An" && v.seatIndex === 7),
    );
    expect((seen as unknown as Visitors).visitors).toHaveLength(2);
  });

  it("refuses a cushion that is taken", async () => {
    server = startPresenceServer(0);
    const a = await connect();
    const b = await connect();
    a.send({ type: "join", name: "An", colorIndex: 1 });
    b.send({ type: "join", name: "Bình", colorIndex: 2 });
    await b.waitFor((m) => m.type === "welcome");
    a.send(seatedState);
    await b.waitFor(
      (m) => m.type === "visitors" && (m as unknown as Visitors).visitors.some((v) => v.seatIndex === 7),
    );
    b.send(seatedState);
    expect(await b.waitFor((m) => m.type === "seat-refused")).toEqual({ type: "seat-refused", seatIndex: 7 });
  });

  it("drops a visitor who disconnects", async () => {
    server = startPresenceServer(0);
    const a = await connect();
    const b = await connect();
    a.send({ type: "join", name: "An", colorIndex: 1 });
    b.send({ type: "join", name: "Bình", colorIndex: 2 });
    await a.waitFor((m) => m.type === "visitors" && (m as unknown as Visitors).visitors.length === 2);
    b.socket.close();
    await a.waitFor((m) => m.type === "visitors" && (m as unknown as Visitors).visitors.length === 1);
    await a.waitFor((m) => m.type === "presence" && m.count === 1);
  });

  it("survives malformed messages and keeps serving", async () => {
    server = startPresenceServer(0);
    const a = await connect();
    a.send("{not json");
    a.send({ type: "state", x: "nope" });
    a.send({ type: "join", name: "An", colorIndex: 1 });
    expect(await a.waitFor((m) => m.type === "welcome")).toBeTruthy();
  });

  it("closes a socket that sends an oversized message", async () => {
    server = startPresenceServer(0);
    const a = await connect();
    const closed = new Promise((resolve) => a.socket.once("close", resolve));
    a.send({ type: "join", name: "x".repeat(5000), colorIndex: 0 });
    await closed;
    expect(a.socket.readyState).toBe(WebSocket.CLOSED);
  });

  it("rejects a connection from a page whose Origin isn't the allowed one", async () => {
    process.env.ALLOWED_ORIGIN = "https://chuaonline.io.vn";
    try {
      server = startPresenceServer(0);
      const { port } = server.address() as AddressInfo;
      const socket = new WebSocket(`ws://127.0.0.1:${port}`, { origin: "https://evil.example" });
      sockets.push(socket);
      socket.on("error", () => {}); // rejecting the upgrade surfaces as a connection error, not a close
      const rejected = new Promise((resolve) => socket.once("unexpected-response", resolve));
      await rejected;
      expect(socket.readyState).not.toBe(WebSocket.OPEN);
    } finally {
      delete process.env.ALLOWED_ORIGIN;
    }
  });

  it("accepts a connection from the allowed Origin", async () => {
    process.env.ALLOWED_ORIGIN = "https://chuaonline.io.vn";
    try {
      server = startPresenceServer(0);
      const a = await connect({ origin: "https://chuaonline.io.vn" });
      expect(a.socket.readyState).toBe(WebSocket.OPEN);
    } finally {
      delete process.env.ALLOWED_ORIGIN;
    }
  });

  it("closes a connection once an IP has too many at once", async () => {
    server = startPresenceServer(0);
    const clientsForIp = await Promise.all(Array.from({ length: 8 }, () => connect()));
    expect(clientsForIp.every((c) => c.socket.readyState === WebSocket.OPEN)).toBe(true);

    const { port } = server.address() as AddressInfo;
    const extra = new WebSocket(`ws://127.0.0.1:${port}`);
    sockets.push(extra);
    const closed = new Promise((resolve) => extra.once("close", resolve));
    await closed;
    expect(extra.readyState).toBe(WebSocket.CLOSED);
  });
});
