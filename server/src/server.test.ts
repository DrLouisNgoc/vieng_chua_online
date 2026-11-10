import { describe, it, expect, afterEach } from "vitest";
import { WebSocket, type WebSocketServer } from "ws";
import type { AddressInfo } from "node:net";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startPresenceServer, stopPresenceServer } from "./server.js";

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

// Each test gets its own fresh pháp-danh-lock file, never the owner's real
// data/visitor-names.json, so one test's registered ip/name can't leak
// into another's expectations.
function freshVisitorNamesPath(): string {
  return join(mkdtempSync(join(tmpdir(), "vieng-chua-names-")), "visitor-names.json");
}

// Distinct per connect() call by default, so two sockets in the same test
// are still treated as two different visitors (matching every pre-existing
// test's assumption) — pass an explicit `ip` to simulate the SAME visitor
// reconnecting, for the pháp-danh-lock tests below.
let fakeIpCounter = 0;

async function connect(options?: { origin?: string; ip?: string }): Promise<Client> {
  if (!server) throw new Error("server not started");
  const { port } = server.address() as AddressInfo;
  const ip = options?.ip ?? `10.0.${++fakeIpCounter}.1`;
  const socket = new WebSocket(
    `ws://127.0.0.1:${port}`,
    options?.origin
      ? { origin: options.origin, headers: { "x-forwarded-for": ip } }
      : { headers: { "x-forwarded-for": ip } },
  );
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
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
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

  it("broadcasts a bell toll to everyone already present when a visitor joins", async () => {
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
    const a = await connect();
    const b = await connect();
    a.send({ type: "join", name: "An", colorIndex: 1 });
    await a.waitFor((m) => m.type === "welcome");
    expect(await a.waitFor((m) => m.type === "bell")).toEqual({ type: "bell" });
    expect(await b.waitFor((m) => m.type === "bell")).toEqual({ type: "bell" });
  });

  it("tolls the bell on its own on a timer, even with no one joining", async () => {
    server = startPresenceServer(0, undefined, freshVisitorNamesPath(), 50);
    const a = await connect();
    await new Promise((resolve) => setTimeout(resolve, 230));
    const bellCount = a.messages.filter((m) => m.type === "bell").length;
    expect(bellCount).toBeGreaterThanOrEqual(2);
  });

  it("refuses a cushion that is taken", async () => {
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
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
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
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
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
    const a = await connect();
    a.send("{not json");
    a.send({ type: "state", x: "nope" });
    a.send({ type: "join", name: "An", colorIndex: 1 });
    expect(await a.waitFor((m) => m.type === "welcome")).toBeTruthy();
  });

  it("closes a socket that sends an oversized message", async () => {
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
    const a = await connect();
    const closed = new Promise((resolve) => a.socket.once("close", resolve));
    a.send({ type: "join", name: "x".repeat(5000), colorIndex: 0 });
    await closed;
    expect(a.socket.readyState).toBe(WebSocket.CLOSED);
  });

  it("rejects a connection from a page whose Origin isn't the allowed one", async () => {
    process.env.ALLOWED_ORIGIN = "https://chuaonline.io.vn";
    try {
      server = startPresenceServer(0, undefined, freshVisitorNamesPath());
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
      server = startPresenceServer(0, undefined, freshVisitorNamesPath());
      const a = await connect({ origin: "https://chuaonline.io.vn" });
      expect(a.socket.readyState).toBe(WebSocket.OPEN);
    } finally {
      delete process.env.ALLOWED_ORIGIN;
    }
  });

  it("on shutdown, tells connected visitors it is going away so their clients reconnect", async () => {
    const running = startPresenceServer(0, undefined, freshVisitorNamesPath());
    server = running;
    const a = await connect();
    const closed = new Promise<number>((resolve) => a.socket.once("close", (code) => resolve(code)));
    await stopPresenceServer(running);
    server = undefined;
    expect(await closed).toBe(1001);
  });

  it("closes a connection once an IP has too many at once", async () => {
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
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

describe("presence server: pháp danh locked to ip", () => {
  it("tells a first-time visitor there is no locked pháp danh yet", async () => {
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
    const a = await connect();
    expect(await a.waitFor((m) => m.type === "name-lock")).toEqual({ type: "name-lock", name: null });
  });

  it("refuses to join with the forbidden default pháp danh", async () => {
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
    const a = await connect();
    a.send({ type: "join", name: "Thiện Tâm", colorIndex: 0 });
    expect(await a.waitFor((m) => m.type === "join-refused")).toEqual({
      type: "join-refused",
      reason: "default-name",
    });
    expect(a.messages.some((m) => m.type === "welcome")).toBe(false);
  });

  it("refuses the default name without diacritics or in another case too", async () => {
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
    const a = await connect();
    a.send({ type: "join", name: "thien tam", colorIndex: 0 });
    expect(await a.waitFor((m) => m.type === "join-refused")).toBeTruthy();
  });

  it("registers a visitor's first real pháp danh and recalls it on the next connection from the same ip", async () => {
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
    const ip = "203.0.113.5";
    const a = await connect({ ip });
    a.send({ type: "join", name: "Diệu Tâm", colorIndex: 0 });
    await a.waitFor((m) => m.type === "welcome");
    a.socket.close();

    const b = await connect({ ip });
    expect(await b.waitFor((m) => m.type === "name-lock")).toEqual({ type: "name-lock", name: "Diệu Tâm" });
  });

  it("keeps a visitor to their locked pháp danh even if they later join with a different one", async () => {
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
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
    server = startPresenceServer(0, undefined, freshVisitorNamesPath());
    const a = await connect({ ip: "198.51.100.1" });
    const b = await connect({ ip: "198.51.100.2" });
    a.send({ type: "join", name: "An", colorIndex: 0 });
    b.send({ type: "join", name: "Bình", colorIndex: 1 });
    await a.waitFor((m) => m.type === "welcome");
    await b.waitFor((m) => m.type === "welcome");
    const seen = await a.waitFor((m) => m.type === "visitors" && (m as unknown as Visitors).visitors.length === 2);
    const names = (seen as unknown as Visitors).visitors.map((v) => v.name).sort();
    expect(names).toEqual(["An", "Bình"]);
  });
});
