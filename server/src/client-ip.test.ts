import type { IncomingMessage } from "node:http";

import { describe, expect, it } from "vitest";

import { clientIp } from "./client-ip.js";

function request(headers: Record<string, string | string[]>, remoteAddress = "127.0.0.1"): IncomingMessage {
  return { headers, socket: { remoteAddress } } as unknown as IncomingMessage;
}

describe("clientIp", () => {
  it("uses the first X-Forwarded-For entry, the visitor behind the proxy", () => {
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to the socket address when there is no proxy header", () => {
    expect(clientIp(request({}, "198.51.100.4"))).toBe("198.51.100.4");
  });
});
