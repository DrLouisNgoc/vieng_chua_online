import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPresenceClient } from "./presence";

class FakeWebSocket {
  static readonly OPEN = 1;

  static readonly instances: FakeWebSocket[] = [];

  readyState = 0;

  onopen: (() => void) | null = null;

  onclose: (() => void) | null = null;

  onmessage: ((event: { data: string }) => void) | null = null;

  onerror: (() => void) | null = null;

  closed = false;

  sent: string[] = [];

  url: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  message(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.readyState = 3;
    this.onclose?.();
  }
}

describe("createPresenceClient", () => {
  beforeEach(() => {
    FakeWebSocket.instances.length = 0;
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reports connecting, then the count from a presence message", () => {
    const onStatus = vi.fn();
    createPresenceClient({ url: "ws://localhost:8787", onStatus });

    expect(onStatus).toHaveBeenCalledWith({ kind: "connecting" });

    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.message({ type: "presence", count: 3 });

    expect(onStatus).toHaveBeenCalledWith({ kind: "online", count: 3 });
  });

  it("reports offline on close and reconnects after a backoff", () => {
    const onStatus = vi.fn();
    createPresenceClient({
      url: "ws://localhost:8787",
      onStatus,
      reconnectDelayMs: 1000,
    });

    const first = FakeWebSocket.instances[0];
    first.open();
    first.close();

    expect(onStatus).toHaveBeenCalledWith({ kind: "offline" });
    expect(FakeWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("dispose() closes the socket and stops reconnecting", () => {
    const onStatus = vi.fn();
    const client = createPresenceClient({
      url: "ws://localhost:8787",
      onStatus,
      reconnectDelayMs: 1000,
    });

    const first = FakeWebSocket.instances[0];
    first.open();
    client.dispose();

    expect(first.closed).toBe(true);

    vi.advanceTimersByTime(5000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("ignores malformed messages instead of throwing", () => {
    const onStatus = vi.fn();
    createPresenceClient({ url: "ws://localhost:8787", onStatus });

    const socket = FakeWebSocket.instances[0];
    socket.open();
    expect(() => socket.onmessage?.({ data: "not json" })).not.toThrow();
  });
});

const state = {
  x: 1,
  z: 2,
  heading: 0,
  activity: "idle" as const,
  seatIndex: null,
  holdingBroom: false,
  beadsVisible: false,
  beadTotal: 0,
};

function sentTypes(socket: FakeWebSocket): string[] {
  return socket.sent.map((data) => (JSON.parse(data) as { type: string }).type);
}

describe("visitor messages", () => {
  let now = 0;
  beforeEach(() => {
    FakeWebSocket.instances.length = 0;
    now = 0;
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function client(extra: Record<string, unknown> = {}) {
    return createPresenceClient({
      url: "ws://localhost",
      onStatus: vi.fn(),
      reconnectDelayMs: 1000,
      now: () => now,
      ...extra,
    });
  }

  it("sends join once open, and states only after joining", () => {
    const c = client();
    const socket = FakeWebSocket.instances[0];
    c.sendState(state);
    c.join("An", 2);
    expect(socket.sent).toEqual([]);
    socket.open();
    c.sendState(state);
    expect(sentTypes(socket)).toEqual(["join", "state"]);
    expect(JSON.parse(socket.sent[0])).toEqual({ type: "join", name: "An", colorIndex: 2 });
  });

  it("throttles states and skips unchanged ones", () => {
    const c = client();
    const socket = FakeWebSocket.instances[0];
    socket.open();
    c.join("An", 0);
    c.sendState(state);
    now = 50;
    c.sendState({ ...state, x: 5 });
    now = 200;
    c.sendState({ ...state, x: 5 });
    now = 400;
    c.sendState({ ...state, x: 5 });
    expect(sentTypes(socket)).toEqual(["join", "state", "state"]);
  });

  it("re-joins and re-sends the state after a reconnect", () => {
    const c = client();
    const first = FakeWebSocket.instances[0];
    first.open();
    c.join("An", 0);
    c.sendState(state);
    first.close();
    vi.advanceTimersByTime(1000);
    const second = FakeWebSocket.instances[1];
    second.open();
    c.sendState(state);
    expect(sentTypes(second)).toEqual(["join", "state"]);
  });

  it("reports other visitors without itself, and seat refusals", () => {
    const onVisitors = vi.fn();
    const onSeatRefused = vi.fn();
    client({ onVisitors, onSeatRefused });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    const view = { name: "A", colorIndex: 0, ...state };
    socket.message({ type: "welcome", id: "me" });
    socket.message({
      type: "visitors",
      visitors: [
        { id: "me", ...view },
        { id: "other", ...view },
      ],
    });
    expect(onVisitors).toHaveBeenLastCalledWith([{ id: "other", ...view }]);
    socket.message({ type: "seat-refused", seatIndex: 4 });
    expect(onSeatRefused).toHaveBeenCalledWith(4);
  });

  it("forgets other visitors when the connection drops", () => {
    const onVisitors = vi.fn();
    client({ onVisitors });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.close();
    expect(onVisitors).toHaveBeenLastCalledWith([]);
  });

  it("delivers chat history and new chat messages", () => {
    const onChat = vi.fn();
    const onChatHistory = vi.fn();
    client({ onChat, onChatHistory });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    const entry = { id: "m1", name: "An", text: "Xin chào", ts: 1 };
    socket.message({ type: "chat-history", messages: [entry] });
    expect(onChatHistory).toHaveBeenCalledWith([entry]);
    socket.message({ type: "chat", message: entry });
    expect(onChat).toHaveBeenCalledWith(entry);
  });

  it("calls onBell when the server tolls the bell", () => {
    const onBell = vi.fn();
    client({ onBell });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.message({ type: "bell" });
    expect(onBell).toHaveBeenCalledTimes(1);
  });

  it("calls onNameLock with the locked pháp danh, or null for a first-time ip", () => {
    const onNameLock = vi.fn();
    client({ onNameLock });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.message({ type: "name-lock", name: "Diệu Tâm" });
    expect(onNameLock).toHaveBeenCalledWith("Diệu Tâm");
    socket.message({ type: "name-lock", name: null });
    expect(onNameLock).toHaveBeenCalledWith(null);
  });

  it("calls onWelcome once joined, and onJoinRefused when the server refuses the name", () => {
    const onWelcome = vi.fn();
    const onJoinRefused = vi.fn();
    const c = client({ onWelcome, onJoinRefused });
    const socket = FakeWebSocket.instances[0];
    socket.open();
    c.join("Thiện Tâm", 0);
    socket.message({ type: "join-refused", reason: "default-name" });
    expect(onJoinRefused).toHaveBeenCalledWith("default-name");
    expect(onWelcome).not.toHaveBeenCalled();
    socket.message({ type: "welcome", id: "v1" });
    expect(onWelcome).toHaveBeenCalledTimes(1);
  });

  it("sends chat only once joined", () => {
    const c = client();
    const socket = FakeWebSocket.instances[0];
    c.sendChat("quá sớm");
    socket.open();
    c.join("An", 0);
    c.sendChat("Xin chào");
    expect(sentTypes(socket)).toEqual(["join", "chat"]);
    expect(JSON.parse(socket.sent[1])).toEqual({ type: "chat", text: "Xin chào" });
  });
});
