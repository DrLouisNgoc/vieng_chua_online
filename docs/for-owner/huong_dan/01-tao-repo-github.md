# 01 — Tạo repo GitHub (Private), đẩy code lên

← [00 — Điều kiện tài nguyên](00-dieu-kien-tai-nguyen.md) | [Mục lục](README.md) | Tiếp theo: [02 — Mua VPS + domain](02-mua-vps-va-domain.md)

---

## 1. Tạo repo trống

1. Vào https://github.com/new
2. Đặt tên (ví dụ `vieng-chua-online`), chọn **Private**.
3. Không tick "Add README" — để trống hoàn toàn.

**Vì sao Private:** lịch sử git hiện tại có thể còn nhắc tới nguồn gốc
sansatemple.com/chuasen.com trong code hoặc tài liệu cũ. Không đổi sang
Public sau này trừ khi đã dọn sạch.

## 2. Tạo Personal Access Token (để đẩy code lên)

GitHub không cho dùng mật khẩu thường để `git push` qua HTTPS nữa.

1. Vào https://github.com/settings/tokens → **Generate new token (classic)**
2. Tick quyền `repo`
3. Generate → **copy lại ngay**, chỉ hiện một lần, lưu ở nơi an toàn
   (trình quản lý mật khẩu).

## 3. Đẩy code lên

**Trên máy đang giữ code mới nhất**, mở terminal tại thư mục dự án:

```powershell
git remote add origin https://github.com/ten-ban/vieng-chua-online.git
git branch -M main
git push -u origin main
```

Khi hỏi đăng nhập:
- **Username** = tên tài khoản GitHub của bạn
- **Password** = dán Personal Access Token vừa tạo (không phải mật khẩu
  GitHub thật)

## 4. Xong

Gửi link repo (`https://github.com/ten-ban/vieng-chua-online`) cho Claude
xem qua trước khi làm file [00](00-dieu-kien-tai-nguyen.md), để biết chính
xác code hiện có gì.

---

← [00 — Điều kiện tài nguyên](00-dieu-kien-tai-nguyen.md) | [Mục lục](README.md) | Tiếp theo: [02 — Mua VPS + domain](02-mua-vps-va-domain.md)
