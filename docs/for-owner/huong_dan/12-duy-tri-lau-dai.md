# 12 — Duy trì lâu dài

← [11 — Cập nhật code sau này](11-cap-nhat-deploy-lai.md) | [Mục lục](README.md)

---

- **Gia hạn domain + VPS đúng hạn** — ghi lịch nhắc riêng (Google Calendar
  hoặc tương tự), không có gì tự động nhắc bạn.
- **Theo dõi RAM/CPU** nếu đông người chơi hơn dự kiến:
  ```bash
  htop
  ```
  (cài bằng `apt install -y htop` nếu chưa có)
- **Không có database** — dữ liệu người chơi (vị trí, ai đang ngồi đâu)
  chỉ nằm trong RAM lúc server đang chạy, **mất khi server restart**. Số
  hạt/số câu kinh đã tụng của từng người nằm trong trình duyệt của họ
  (`localStorage`), **không mất** khi server restart.
- **Sao lưu:** không bắt buộc, vì không có dữ liệu quan trọng lưu trên
  VPS ngoài chính code (đã có trên GitHub rồi).

---

← [11 — Cập nhật code sau này](11-cap-nhat-deploy-lai.md) | [Mục lục](README.md)
