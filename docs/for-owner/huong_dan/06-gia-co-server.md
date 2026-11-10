# 06 — Gia cố server WebSocket trước khi public

← [05 — Cài Node.js và Caddy](05-cai-nodejs-caddy.md) | [Mục lục](README.md) | Tiếp theo: [07 — Đưa code lên VPS và build](07-dua-code-len-build.md)

---

Cần xong trước khi tới file [09](09-cau-hinh-caddy.md) (bật domain thật).

## Việc cần làm

- [x] Giới hạn số kết nối WebSocket theo mỗi IP (tối đa 8 kết nối cùng lúc
  mỗi IP, `server/src/server.ts`).
- [x] Chỉ nhận kết nối có header `Origin` khớp đúng `https://chuaonline.io.vn`
  khi biến môi trường `ALLOWED_ORIGIN` được đặt (xem file
  [07](07-dua-code-len-build.md)/[09](09-cau-hinh-caddy.md) để đặt biến này
  trên VPS thật; không đặt thì server vẫn nhận mọi origin, dùng cho máy dev).
- [x] Lọc tên hiển thị chặt hơn: ngoài giới hạn độ dài 24 ký tự, chỉ cho
  chữ (có dấu), số, khoảng trắng, gạch ngang và dấu nháy đơn —
  chặn `<`, `>`, `&`, `"`, `/` và các ký tự khác (`server/src/protocol.ts`).
- [x] Trong `server/package.json`, đã chuyển `tsx` từ `devDependencies` sang
  `dependencies`.

## Trạng thái

**Đã làm xong trong code** (107 test server pass, `tsc` sạch). Khi deploy
lên VPS thật, nhớ đặt biến môi trường `ALLOWED_ORIGIN=https://chuaonline.io.vn`
cho tiến trình server, nếu không server vẫn nhận kết nối từ mọi origin.

---

← [05 — Cài Node.js và Caddy](05-cai-nodejs-caddy.md) | [Mục lục](README.md) | Tiếp theo: [07 — Đưa code lên VPS và build](07-dua-code-len-build.md)
