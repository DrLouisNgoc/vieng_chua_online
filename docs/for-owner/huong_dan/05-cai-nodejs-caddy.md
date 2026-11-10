# 05 — Cài Node.js và Caddy

← [04 — Gia cố VPS](04-gia-co-vps.md) | [Mục lục](README.md) | Tiếp theo: [06 — Gia cố server WebSocket](06-gia-co-server.md)

---

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs git
```

```bash
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

**Caddy là gì:** một phần mềm vừa phục vụ trang web vừa tự xin và gia hạn
chứng chỉ HTTPS miễn phí (Let's Encrypt), không cần tự cấu hình chứng chỉ
như Nginx truyền thống.

Kiểm tra đã cài xong:
```bash
node --version
caddy version
```

---

← [04 — Gia cố VPS](04-gia-co-vps.md) | [Mục lục](README.md) | Tiếp theo: [06 — Gia cố server WebSocket](06-gia-co-server.md)
