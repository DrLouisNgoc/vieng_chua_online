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
RestartSec=2
TimeoutStopSec=10
Environment=PORT=8787
Environment=ALLOWED_ORIGIN=https://chua.io.vn
User=chua
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now chua-server
sudo systemctl restart chua-server
```

Giải thích các dòng:
- `User=chua`: server chạy bằng user `chua`, không phải root (mặc định
  `systemd` chạy service bằng root nếu không ghi dòng này).
- `ALLOWED_ORIGIN`: chỉ cho trang `https://chua.io.vn` mở kết nối WebSocket
  (file [06](06-gia-co-server.md)). Thiếu dòng này thì trang web khác cũng
  nối vào được. **Bản cũ của file này thiếu dòng này** — kiểm tra máy đang
  chạy: `systemctl show chua-server -p Environment` phải thấy `ALLOWED_ORIGIN`.
- `NoNewPrivileges`, `PrivateTmp`, `ProtectSystem=full`: nếu server bị khai
  thác lỗi, nó không leo lên quyền root được và không sửa được `/usr`, `/etc`.
- `TimeoutStopSec=10`: lúc deploy, server có tối đa 10 giây để đóng kết nối
  cho khách (khách tự nối lại) trước khi bị tắt hẳn.

Đã cài bản cũ rồi thì chỉ cần dán lại cả khối trên. Sau đó kiểm tra
`https://chua.io.vn` vẫn vào được, đi lại thấy người khác bình thường.

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
