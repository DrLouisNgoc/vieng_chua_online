# 09 — Cấu hình Caddy: phục vụ web + chuyển tiếp WebSocket + HTTPS

← [08 — Chạy server như dịch vụ nền](08-chay-server-systemd.md) | [Mục lục](README.md) | Tiếp theo: [10 — Kiểm tra](10-kiem-tra.md)

---

**Trước khi làm bước này**, xác nhận file [03](03-noi-ten-mien.md) (DNS)
đã trỏ đúng — chạy `nslookup chua.io.vn` thấy ra đúng IP VPS. Caddy
cần DNS đúng để xin chứng chỉ HTTPS.

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null << 'EOF'
chua.io.vn {
    encode zstd gzip
    header {
        Strict-Transport-Security "max-age=31536000"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        -Server
    }
    # Vite puts a content hash in every file name under /assets/, so a
    # changed file always gets a new name: browsers may cache these forever.
    @hashed path /assets/*
    header @hashed Cache-Control "public, max-age=31536000, immutable"

    handle /ws* {
        reverse_proxy localhost:8787
    }
    handle /boards* {
        reverse_proxy localhost:8787
    }
    handle /admin* {
        reverse_proxy localhost:8787
    }
    handle {
        root * /opt/chua/app/dist
        file_server
        try_files {path} /index.html
    }
}
EOF

caddy validate --config /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

`caddy validate` kiểm tra cú pháp **trước khi** reload: báo lỗi thì không
reload, Caddy vẫn chạy cấu hình cũ, site không sập.

Kiểm tra sau khi reload (phải thấy `strict-transport-security` và `x-frame-options`):
```bash
curl -sI https://chua.io.vn | grep -iE 'strict-transport|x-frame|content-encoding|server'
```

## Giải thích ngắn

- `encode zstd gzip` — nén trang/JS/JSON trước khi gửi, khách tải nhanh hơn.
- `header { ... }` — các header bảo mật chuẩn: chỉ dùng HTTPS (HSTS), không
  cho trang khác nhúng chùa vào khung (`X-Frame-Options`), trình duyệt
  không đoán sai kiểu file, không xin camera/micro/vị trí. `-Server` giấu
  tên phần mềm máy chủ.
- `@hashed ... Cache-Control` — file JS/CSS đã build được trình duyệt giữ
  lại lâu dài; lần sau vào chùa không phải tải lại.

- `handle /ws*` — mọi request tới `/ws` được chuyển vào server Node.js
  đang chạy ở cổng 8787 (phần người chơi nối với nhau).
- `handle /boards*` và `handle /admin*` — API đọc/sửa cốc, chat board và
  duyệt admin (`server/src/boards-http.ts`) cũng chạy trên cùng server
  Node ở cổng 8787, cần chuyển tiếp y hệt `/ws*`. **Thiếu 2 khối này thì
  mọi bảng cốc/máy chiếu trên web sẽ báo "Không tìm thấy."** vì trình
  duyệt gọi API ra ngoài domain thật thay vì vào server.
- `handle` (còn lại) — phục vụ file tĩnh đã build trong `app/dist` (trang
  web, mô hình 3D, âm thanh).
- Caddy tự nhận ra domain hợp lệ và tự xin chứng chỉ HTTPS, không cần dòng
  lệnh nào thêm.

## Nếu Caddy báo lỗi xin chứng chỉ

Xem log:
```bash
sudo journalctl -u caddy -f
```
Nguyên nhân phổ biến nhất: DNS chưa trỏ đúng hoặc chưa kịp cập nhật — quay
lại file [03](03-noi-ten-mien.md) kiểm tra.

---

← [08 — Chạy server như dịch vụ nền](08-chay-server-systemd.md) | [Mục lục](README.md) | Tiếp theo: [10 — Kiểm tra](10-kiem-tra.md)
