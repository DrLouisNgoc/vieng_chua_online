# 04 — Gia cố bảo mật VPS cơ bản

← [03 — Nối domain vào VPS](03-noi-ten-mien.md) | [Mục lục](README.md) | Tiếp theo: [05 — Cài Node.js và Caddy](05-cai-nodejs-caddy.md)

---

SSH vào VPS bằng tài khoản root nhà cung cấp đã cấp:
```bash
ssh root@<IP VPS>
```

## Tạo user riêng, không dùng root cho việc hàng ngày

```bash
adduser chua
usermod -aG sudo chua
```

## Bật tường lửa, chỉ mở 3 cổng cần thiết

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

## Tự động vá lỗi bảo mật hệ điều hành

```bash
apt install -y unattended-upgrades
dpkg-reconfigure --priority=low unattended-upgrades
```

## Khuyến nghị thêm (không bắt buộc ngay, làm khi rảnh)

Tắt đăng nhập root qua SSH và tắt đăng nhập bằng mật khẩu, chỉ cho SSH
key:

1. Sửa file `/etc/ssh/sshd_config`:
   - `PermitRootLogin no`
   - `PasswordAuthentication no`
2. Chạy: `systemctl restart ssh`

**Quan trọng:** trước khi đóng cửa sổ SSH đang mở, mở một cửa sổ SSH khác
thử đăng nhập bằng SSH key xem có vào được không. Nếu làm sai thứ tự, bạn
có thể tự khoá mình ra ngoài VPS.

---

← [03 — Nối domain vào VPS](03-noi-ten-mien.md) | [Mục lục](README.md) | Tiếp theo: [05 — Cài Node.js và Caddy](05-cai-nodejs-caddy.md)
