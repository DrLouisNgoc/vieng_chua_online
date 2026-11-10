# 03 — Nối domain vào VPS (cấu hình DNS)

← [02 — Mua VPS + domain](02-mua-vps-va-domain.md) | [Mục lục](README.md) | Tiếp theo: [04 — Gia cố VPS](04-gia-co-vps.md)

---

## Khái niệm cần biết trước

- **Nơi bán domain** (registrar — Mắt Bão, P.A Vietnam, Nhân Hoà, iNET...)
  là nơi bạn **quản lý DNS** của domain.
- **VPS** là nơi app thật sự chạy, có một địa chỉ IP cố định.
- "Nối domain vào VPS" nghĩa là: tạo một **bản ghi DNS (A record)** ở nơi
  bán domain, nói rằng "khi ai gõ `chuaonline.io.vn`, hãy dẫn họ tới địa
  chỉ IP này".

## Bước 1: Lấy địa chỉ IP của VPS

Xem trong email xác nhận lúc mua VPS, hoặc trang quản lý (dashboard) của
nhà cung cấp VPS — thường ghi rõ "IP Address" hoặc "Địa chỉ IP". Dạng
`123.45.67.89`.

## Bước 2: Vào trang quản lý DNS của domain

Đăng nhập vào tài khoản ở nơi bạn mua `chuaonline.io.vn`, tìm mục thường
tên là một trong các cụm sau (tuỳ nhà đăng ký):
- "Quản lý DNS" / "DNS Management"
- "Quản lý tên miền" → chọn domain → "Cấu hình DNS"
- "Bản ghi DNS" / "DNS Records"

## Bước 3: Tạo bản ghi A

Tạo (hoặc sửa nếu đã có sẵn) một bản ghi:

| Trường | Giá trị |
|---|---|
| Loại (Type) | **A** |
| Tên (Host/Name) | **@** (nghĩa là chính domain gốc, không có tiền tố) |
| Giá trị (Value/Points to) | **địa chỉ IP VPS**, ví dụ `123.45.67.89` |
| TTL | để mặc định (thường 3600 hoặc "Auto") |

**Muốn có cả `www.chuaonline.io.vn`** (tuỳ chọn, không bắt buộc): tạo thêm
một bản ghi A khác, Tên = `www`, Giá trị = IP VPS (giống hệt bản ghi trên).

## Bước 4: Đợi DNS cập nhật (propagation)

Sau khi lưu, DNS cần một khoảng thời gian để lan ra khắp nơi trên internet
— thường **10 phút tới vài giờ**, hiếm khi tới 24-48 giờ.

**Kiểm tra đã cập nhật chưa:**

Cách 1 — dùng PowerShell:
```powershell
nslookup chuaonline.io.vn
```
Nếu ra đúng IP VPS bạn đã nhập → đã cập nhật xong.

Cách 2 — dùng trang web: vào https://www.whatsmydns.net, gõ
`chuaonline.io.vn`, chọn loại **A**, xem có hiện đúng IP VPS ở hầu hết các
địa điểm trên bản đồ không.

## Lưu ý quan trọng

**Phải đợi bước này xong (DNS đã trỏ đúng) trước khi chạy Caddy ở file
[09](09-cau-hinh-caddy.md).** Caddy cần tự xin chứng chỉ HTTPS miễn phí từ
Let's Encrypt, và Let's Encrypt cần DNS đã trỏ đúng IP thì mới xác minh và
cấp chứng chỉ được. Nếu Caddy báo lỗi xin chứng chỉ, quay lại kiểm tra
bước này trước tiên.

---

← [02 — Mua VPS + domain](02-mua-vps-va-domain.md) | [Mục lục](README.md) | Tiếp theo: [04 — Gia cố VPS](04-gia-co-vps.md)
