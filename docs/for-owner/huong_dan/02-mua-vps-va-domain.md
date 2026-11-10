# 02 — Mua VPS + domain

← [01 — Tạo repo GitHub](01-tao-repo-github.md) | [Mục lục](README.md) | Tiếp theo: [03 — Nối domain vào VPS](03-noi-ten-mien.md)

---

## VPS

- Loại **KVM** (toàn quyền cài đặt, SSH vào được) — **không chọn** hosting
  chia sẻ/cPanel, vì loại đó không chạy được tiến trình Node.js riêng,
  không mở được cổng WebSocket.
- Hệ điều hành **Ubuntu 24.04**.
- Tối thiểu **1GB RAM** để chạy; khuyến nghị **2GB RAM** để build code
  ngay trên VPS không bị lỗi hết bộ nhớ (xem thêm ở file
  [07](07-dua-code-len-build.md)).
- Nhà cung cấp Việt Nam: AZDIGI (Pro VPS), Vietnix, hoặc tương đương — tự
  kiểm tra giá hiện tại trên trang chính thức.

Sau khi tạo xong, bạn sẽ có:
- Một **địa chỉ IP** (ví dụ `123.45.67.89`)
- Thông tin đăng nhập SSH (user `root` + mật khẩu, hoặc SSH key tuỳ nhà
  cung cấp)

**Ghi lại IP này**, cần dùng ở file [03](03-noi-ten-mien.md).

## Domain

Đã chọn: **chuaonline.io.vn**

- `.io.vn` là tên miền cấp hai thuộc `.vn`, do VNNIC quản lý, mở cho cả cá
  nhân lẫn tổ chức đăng ký.
- Mua qua một nhà đăng ký trong nước (Mắt Bão, P.A Vietnam, Nhân Hoà,
  iNET...).
- Tên miền `.vn` thường yêu cầu **xác minh giấy tờ tuỳ thân** (ảnh
  CMND/CCCD) khi đăng ký — chuẩn bị sẵn để khỏi mất thời gian chờ duyệt.

---

← [01 — Tạo repo GitHub](01-tao-repo-github.md) | [Mục lục](README.md) | Tiếp theo: [03 — Nối domain vào VPS](03-noi-ten-mien.md)
