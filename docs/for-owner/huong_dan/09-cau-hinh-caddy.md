# 09 — Cấu hình Caddy: phục vụ web + chuyển tiếp WebSocket + HTTPS

← [08 — Chạy server như dịch vụ nền](08-chay-server-systemd.md) | [Mục lục](README.md) | Tiếp theo: [10 — Kiểm tra](10-kiem-tra.md)

---

**Trước khi làm bước này**, xác nhận file [03](03-noi-ten-mien.md) (DNS)
đã trỏ đúng — chạy `nslookup chua.io.vn` thấy ra đúng IP VPS. Caddy
cần DNS đúng để xin chứng chỉ HTTPS.

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null << 'EOF'
chua.io.vn {
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

sudo systemctl reload caddy
```

## Giải thích ngắn

- `handle /ws*` — mọi request tới `/ws` được chuyển vào server Node.js
  đang chạy ở cổng 8787 (phần người chơi nối với nhau).
- `handle /boards*` và `handle /admin*` — API đọc/sửa cốc, chat board và
  duyệt admin (`server/src/boardsHttp.ts`) cũng chạy trên cùng server
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
