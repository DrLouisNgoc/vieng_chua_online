import { mkdtempSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import nodePath from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import type { WebSocketServer } from "ws";
import { WebSocket } from "ws";

import { startPresenceServer, stopPresenceServer } from "./server.js";

type Message = Record<string, unknown>;

interface Client {
  socket: WebSocket;
  messages: Message[];
  send: (value: unknown) => void;
  waitFor: (isWanted: (message: Message) => boolean) => Promise<Message>;
}

const servers: WebSocketServer[] = [];
const sockets: WebSocket[] = [];

async function nextEvent(emitter: NodeJS.EventEmitter, event: string): Promise<unknown[]> {
  return new Promise((resolve) => {
    emitter.once(event, (...args: unknown[]) => {
      resolve(args);
    });
  });
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

afterEach(async () => {
  for (const socket of sockets.splice(0)) socket.close();
  const closing = servers.splice(0).map(
    async (server) =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
  );
  await Promise.all(closing);
});

// Each test gets its own fresh pháp-danh-lock file, never the owner's real
// data/visitor-names.json, so one test's registered ip/name can't leak
// into another's expectations.
function freshVisitorNamesPath(): string {
  const directory = mkdtempSync(nodePath.join(tmpdir(), "vieng-chua-names-"));
  return nodePath.join(directory, "visitor-names.json");
}

// Distinct per connect() call by default, so two sockets in the same test
// are still treated as two different visitors (matching every pre-existing
// test's assumption) — pass an explicit `ip` to simulate the SAME visitor
// reconnecting, for the pháp-danh-lock tests below.
const fakeIpCounter = { last: 0 };

async function connectTo(server: WebSocketServer, options?: { origin?: string; ip?: string }): Promise<Client> {
  const { port } = server.address() as AddressInfo;
  fakeIpCounter.last += 1;
  const ip = options?.ip ?? `10.0.${String(fakeIpCounter.last)}.1`;
  const socket = new WebSocket(
    `ws://127.0.0.1:${String(port)}`,
    options?.origin === undefined
      ? { headers: { "x-forwarded-for": ip } }
      : { origin: options.origin, headers: { "x-forwarded-for": ip } },
  );
  sockets.push(socket);
  const messages: Message[] = [];
  const waiters: (() => void)[] = [];
  socket.on("message", (data) => {
    messages.push(JSON.parse((data as Buffer).toString("utf8")) as Message);
    for (const wake of waiters.splice(0)) wake();
  });
  await nextEvent(socket, "open");
  const poll = async (isWanted: (message: Message) => boolean, deadline: number): Promise<Message> => {
    const found = messages.find((message) => isWanted(message));
    if (found) return found;
    if (Date.now() > deadline) throw new Error(`timed out; got ${JSON.stringify(messages)}`);
    await new Promise<void>((resolve) => {
      waiters.push(resolve);
      setTimeout(resolve, 50);
    });
    return poll(isWanted, deadline);
  };
  return {
    socket,
    messages,
    send: (value) => {
      socket.send(typeof value === "string" ? value : JSON.stringify(value));
    },
    waitFor: async (isWanted) => poll(isWanted, Date.now() + 2000),
  };
}

// A server on a free port, closed after the test, and a connect() to it.
function start(bellIntervalMs?: number): {
  server: WebSocketServer;
  connect: (options?: { origin?: string; ip?: string }) => Promise<Client>;
} {
  const server = startPresenceServer(0, undefined, freshVisitorNamesPath(), bellIntervalMs);
  servers.push(server);
  return { server, connect: async (options) => connectTo(server, options) };
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

interface Visitors {
  visitors: Record<string, unknown>[];
}

describe("presence server with visitors", () => {
  it("welcomes a joined visitor and broadcasts everyone's state", async () => {
    const { connect } = start();
    const a = await connect();
    const b = await connect();
    a.send({ type: "join", name: "An", colorIndex: 1 });
    b.send({ type: "join", name: "Bình", colorIndex: 2 });
    const welcome = await a.waitFor((m) => m.type === "welcome");
    expect(typeof welcome.id).toBe("string");

    a.send(seatedState);
    const seen = await b.waitFor(
      (m) =>
        m.type === "visitors" && (m as unknown as Visitors).visitors.some((v) => v.name === "An" && v.seatIndex === 7),
    );
    expect((seen as unknown as Visitors).visitors).toHaveLength(2);
  });

  it("does not toll the bell just because a visitor joins", async () => {
    // Owner, 2026-11-13: "bạn chỉnh làm sao để tiếng chuông này 30p 1 lần
    // thôi" — a join-triggered bell also fires on every reconnect (a
    // flaky connection retries every 2s, presence.ts), so it tolled far
    // more often than the schedule meant. Only scheduleBell()'s own timer
    // (next test) tolls the bell now.
    const { connect } = start();
    const a = await connect();
    const b = await connect();
    a.send({ type: "join", name: "An", colorIndex: 1 });
    await a.waitFor((m) => m.type === "welcome");
    await sleep(20);
    expect(a.messages.some((m) => m.type === "bell")).toBe(false);
    expect(b.messages.some((m) => m.type === "bell")).toBe(false);
  });

  it("tolls the bell on its own on a timer, even with no one joining", async () => {
    const { connect } = start(50);
    const a = await connect();
    await sleep(230);
    const bellCount = a.messages.filter((m) => m.type === "bell").length;
    expect(bellCount).toBeGreaterThanOrEqual(2);
  });

  it("refuses a cushion that is taken", async () => {
    const { connect } = start();
    const a = await connect();
    const b = await connect();
    a.send({ type: "join", name: "An", colorIndex: 1 });
    b.send({ type: "join", name: "Bình", colorIndex: 2 });
    await b.waitFor((m) => m.type === "welcome");
    a.send(seatedState);
    await b.waitFor((m) => m.type === "visitors" && (m as unknown as Visitors).visitors.some((v) => v.seatIndex === 7));
    b.send(seatedState);
    expect(await b.waitFor((m) => m.type === "seat-refused")).toEqual({ type: "seat-refused", seatIndex: 7 });
  });

  it("drops a visitor who disconnects", async () => {
    const { connect } = start();
    const a = await connect();
    const b = await connect();
    a.send({ type: "join", name: "An", colorIndex: 1 });
    b.send({ type: "join", name: "Bình", colorIndex: 2 });
    await a.waitFor((m) => m.type === "visitors" && (m as unknown as Visitors).visitors.length === 2);
    b.socket.close();
    await a.waitFor((m) => m.type === "visitors" && (m as unknown as Visitors).visitors.length === 1);
    expect(await a.waitFor((m) => m.type === "presence" && m.count === 1)).toEqual({ type: "presence", count: 1 });
  });

  it("survives malformed messages and keeps serving", async () => {
    const { connect } = start();
    const a = await connect();
    a.send("{not json");
    a.send({ type: "state", x: "nope" });
    a.send({ type: "join", name: "An", colorIndex: 1 });
    expect(await a.waitFor((m) => m.type === "welcome")).toBeTruthy();
  });

  it("closes a socket that sends an oversized message", async () => {
    const { connect } = start();
    const a = await connect();
    const closed = nextEvent(a.socket, "close");
    a.send({ type: "join", name: "x".repeat(5000), colorIndex: 0 });
    await closed;
    expect(a.socket.readyState).toBe(WebSocket.CLOSED);
  });

  it("rejects a connection from a page whose Origin isn't the allowed one", async () => {
    process.env.ALLOWED_ORIGIN = "https://chuaonline.io.vn";
    try {
      const { server } = start();
      const { port } = server.address() as AddressInfo;
      const socket = new WebSocket(`ws://127.0.0.1:${String(port)}`, { origin: "https://evil.example" });
      sockets.push(socket);
      socket.on("error", () => {}); // rejecting the upgrade surfaces as a connection error, not a close
      await nextEvent(socket, "unexpected-response");
      expect(socket.readyState).not.toBe(WebSocket.OPEN);
    } finally {
      delete process.env.ALLOWED_ORIGIN;
    }
  });

  it("accepts a connection from the allowed Origin", async () => {
    process.env.ALLOWED_ORIGIN = "https://chuaonline.io.vn";
    try {
      const { connect } = start();
      const a = await connect({ origin: "https://chuaonline.io.vn" });
      expect(a.socket.readyState).toBe(WebSocket.OPEN);
    } finally {
      delete process.env.ALLOWED_ORIGIN;
    }
  });

  it("on shutdown, tells connected visitors it is going away so their clients reconnect", async () => {
    const { server, connect } = start();
    const a = await connect();
    const closed = nextEvent(a.socket, "close");
    await stopPresenceServer(server);
    servers.splice(servers.indexOf(server), 1); // already closed
    const [code] = await closed;
    expect(code).toBe(1001);
  });

  it("closes a connection once one visitor ip has too many at once", async () => {
    const { connect } = start();
    const ip = "203.0.113.20";
    const clientsForIp = await Promise.all(Array.from({ length: 8 }, async () => connect({ ip })));
    expect(clientsForIp.every((c) => c.socket.readyState === WebSocket.OPEN)).toBe(true);

    const extra = await connect({ ip });
    await nextEvent(extra.socket, "close");
    expect(extra.socket.readyState).toBe(WebSocket.CLOSED);
  });

  it("counts the cap per real visitor behind the proxy, not per proxy address", async () => {
    // Behind Caddy every socket comes from the same loopback address; the
    // cap must not turn into one shared cap for the whole site.
    const { connect } = start();
    await Promise.all(Array.from({ length: 8 }, async () => connect({ ip: "203.0.113.21" })));
    const otherVisitor = await connect({ ip: "203.0.113.22" });
    await sleep(100);
    expect(otherVisitor.socket.readyState).toBe(WebSocket.OPEN);
  });
});

describe("presence server: pháp danh locked to ip", () => {
  it("tells a first-time visitor there is no locked pháp danh yet", async () => {
    const { connect } = start();
    const a = await connect();
    expect(await a.waitFor((m) => m.type === "name-lock")).toEqual({ type: "name-lock", name: null });
  });

  it("refuses to join with the forbidden default pháp danh", async () => {
    const { connect } = start();
    const a = await connect();
    a.send({ type: "join", name: "Thiện Tâm", colorIndex: 0 });
    expect(await a.waitFor((m) => m.type === "join-refused")).toEqual({
      type: "join-refused",
      reason: "default-name",
    });
    expect(a.messages.some((m) => m.type === "welcome")).toBe(false);
  });

  it("refuses the default name without diacritics or in another case too", async () => {
    const { connect } = start();
    const a = await connect();
    a.send({ type: "join", name: "thien tam", colorIndex: 0 });
    expect(await a.waitFor((m) => m.type === "join-refused")).toBeTruthy();
  });

  it("registers a visitor's first real pháp danh and recalls it on the next connection from the same ip", async () => {
    const { connect } = start();
    const ip = "203.0.113.5";
    const a = await connect({ ip });
    a.send({ type: "join", name: "Diệu Tâm", colorIndex: 0 });
    await a.waitFor((m) => m.type === "welcome");
    a.socket.close();

    const b = await connect({ ip });
    expect(await b.waitFor((m) => m.type === "name-lock")).toEqual({ type: "name-lock", name: "Diệu Tâm" });
  });

  it("keeps a visitor to their locked pháp danh even if they later join with a different one", async () => {
    const { connect } = start();
    const ip = "203.0.113.9";
    const a = await connect({ ip });
    a.send({ type: "join", name: "Diệu Tâm", colorIndex: 0 });
    await a.waitFor((m) => m.type === "welcome");
    a.socket.close();

    const b = await connect({ ip });
    b.send({ type: "join", name: "Tên Khác", colorIndex: 1 });
    await b.waitFor((m) => m.type === "welcome");
    const seen = await b.waitFor(
      (m) => m.type === "visitors" && (m as unknown as Visitors).visitors.some((v) => v.colorIndex === 1),
    );
    const mine = (seen as unknown as Visitors).visitors.find((v) => v.colorIndex === 1);
    expect(mine?.name).toBe("Diệu Tâm");
  });

  it("lets two different ips each register their own pháp danh independently", async () => {
    const { connect } = start();
    const a = await connect({ ip: "198.51.100.1" });
    const b = await connect({ ip: "198.51.100.2" });
    a.send({ type: "join", name: "An", colorIndex: 0 });
    b.send({ type: "join", name: "Bình", colorIndex: 1 });
    await a.waitFor((m) => m.type === "welcome");
    await b.waitFor((m) => m.type === "welcome");
    const seen = await a.waitFor((m) => m.type === "visitors" && (m as unknown as Visitors).visitors.length === 2);
    const names = (seen as unknown as Visitors).visitors.map((v) => v.name);
    expect(new Set(names)).toEqual(new Set(["An", "Bình"]));
  });
});
