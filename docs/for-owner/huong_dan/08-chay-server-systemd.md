# 08 — Chạy server như một dịch vụ nền

← [07 — Đưa code lên VPS và build](07-dua-code-len-build.md) | [Mục lục](README.md) | Tiếp theo: [09 — Cấu hình Caddy](09-cau-hinh-caddy.md)

---

Dùng `systemd` để server tự khởi động lại nếu lỗi, và tự chạy lại mỗi khi
VPS khởi động lại.

Tạo file service cần quyền root — chạy bằng `sudo` (`cat` cũng phải qua `sudo tee`,
`cat > ...` không xin quyền được dù đứng trước có `sudo`):

```bash
sudo tee /etc/systemd/system/chua-server.service > /dev/null << 'EOF'
[Unit]
Description=Vieng Chua presence server
After=network.target

[Service]
WorkingDirectory=/opt/chua/server
ExecStart=/usr/bin/npm start
Restart=always
Environment=PORT=8787
User=chua

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now chua-server
```

`User=chua`: để server chạy bằng user `chua`, không phải root (mặc định
`systemd` chạy service bằng root nếu không ghi dòng này).

## Kiểm tra server đã chạy chưa

```bash
systemctl status chua-server
```
Phải thấy dòng `Active: active (running)` màu xanh.

Xem log trực tiếp (bấm Ctrl+C để thoát xem log, không tắt server):
```bash
journalctl -u chua-server -f
```

---

← [07 — Đưa code lên VPS và build](07-dua-code-len-build.md) | [Mục lục](README.md) | Tiếp theo: [09 — Cấu hình Caddy](09-cau-hinh-caddy.md)
