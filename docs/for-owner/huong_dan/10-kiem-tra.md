# 10 — Kiểm tra trước khi gửi link cho mọi người

← [09 — Cấu hình Caddy](09-cau-hinh-caddy.md) | [Mục lục](README.md) | Tiếp theo: [11 — Cập nhật code sau này](11-cap-nhat-deploy-lai.md)

---

- [ ] Mở `https://chuaonline.io.vn` trên trình duyệt bất kỳ (không cần cài
  gì), có khoá HTTPS xanh cạnh địa chỉ.
- [ ] Thử 2 thiết bị cùng lúc (ví dụ máy tính + điện thoại), vào cùng lúc,
  xem có thấy nhau đi lại trong chùa không.
- [ ] Thử đặt tên có ký tự lạ/thẻ HTML (ví dụ `<script>`) xem server có
  chặn/lọc đúng không (kiểm chứng file [06](06-gia-co-server.md) đã làm
  đúng).
- [ ] Để chạy khoảng 1 ngày, theo dõi log
  (`journalctl -u chua-server -f`), xem có lỗi lặp lại không.

Tất cả đạt mới nên gửi link cho người khác.

---

← [09 — Cấu hình Caddy](09-cau-hinh-caddy.md) | [Mục lục](README.md) | Tiếp theo: [11 — Cập nhật code sau này](11-cap-nhat-deploy-lai.md)
