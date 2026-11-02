import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPresenceClient } from "./presence";

class FakeWebSocket {
  static OPEN = 1;
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
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

  close(): void {
    this.closed = true;
    this.onclose?.();
  }
}

describe("createPresenceClient", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
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
