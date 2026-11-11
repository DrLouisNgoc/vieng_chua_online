import type { IncomingMessage } from "node:http";

// The real visitor's ip. Behind Caddy every request's socket address is
// Caddy's own loopback address; Caddy's reverse_proxy sets X-Forwarded-For
// (and drops a client-sent one, since no trusted_proxies are configured),
// so its first entry is the visitor. Without a proxy (local dev) there is
// no header and the socket address is already the visitor's.
// Port 8787 is closed by the VPS firewall (ufw allows only 22/80/443), so
// nobody can reach the server directly with a forged header.
export function clientIp(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (typeof first === "string" && first.length > 0) {
    const head = first.split(",", 1)[0]?.trim() ?? "";
    return head === "" ? first : head;
  }
  return request.socket.remoteAddress ?? "unknown";
}
