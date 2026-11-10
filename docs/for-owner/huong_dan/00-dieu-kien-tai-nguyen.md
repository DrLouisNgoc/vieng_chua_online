# 00 — Điều kiện bắt buộc trước khi công khai

← [Mục lục](README.md) | Tiếp theo: [01 — Tạo repo GitHub](01-tao-repo-github.md)

---

Ứng dụng hiện dùng mô hình 3D, texture, âm thanh của sansatemple.com và
hình SVG nhân vật lấy ý tưởng từ chuasen.com (xem
`docs/memory/decisions/0001`, `0003`, `0007`). Quyết định 0001 ghi: không
bao giờ công khai/chia sẻ khi còn dùng tài nguyên đó.

## Phải thay xong trước khi deploy thật (file 07 trở đi)

- [x] Nhân vật (`monk.glb`) và 3 tượng Phật/Bồ Tát
- [x] Cây thông (`pine.glb`)
- [x] Texture đá, gỗ, mái, vải
- [x] Ảnh và tiếng mõ
- [x] Hình SVG onboarding (`app/src/avatar-svg.ts`)
- [ ] Chữ dịch từ giao diện gốc (nếu còn giữ nguyên câu gốc nào)

Thay bằng mô hình/texture/âm thanh tự dựng bằng code hoặc có giấy phép CC0
rõ ràng — kiểm tra giấy phép trước khi dùng, không đoán.

Việc này do Claude làm, trên đúng máy đang giữ bản code mới nhất.

## Trạng thái

**Chưa làm.** Đừng làm các file 07 trở đi (build + chạy thật trên VPS, trỏ
domain) cho tới khi mục này được tick hết.

Nhắn Claude **"bắt đầu"** trên đúng máy đang giữ code mới nhất để bắt đầu
việc này.

---

← [Mục lục](README.md) | Tiếp theo: [01 — Tạo repo GitHub](01-tao-repo-github.md)
