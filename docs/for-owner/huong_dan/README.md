# Hướng dẫn deploy lên VPS — mục lục

Domain đã chọn: **chua.io.vn**. VPS khuyến nghị: **2GB RAM, KVM,
Ubuntu 24.04**. Đọc theo đúng thứ tự file dưới đây, đừng nhảy cóc —
đặc biệt là file 00 và 06, hai cái này **chặn mọi thứ** cho tới khi xong.

| File | Nội dung |
|---|---|
| [00-dieu-kien-tai-nguyen.md](00-dieu-kien-tai-nguyen.md) | Điều kiện bắt buộc trước khi công khai (chặn mọi bước sau) |
| [01-tao-repo-github.md](01-tao-repo-github.md) | Tạo repo GitHub Private, đẩy code lên |
| [02-mua-vps-va-domain.md](02-mua-vps-va-domain.md) | Mua VPS + domain |
| [03-noi-ten-mien.md](03-noi-ten-mien.md) | Nối domain vào VPS (cấu hình DNS) |
| [04-gia-co-vps.md](04-gia-co-vps.md) | Gia cố bảo mật VPS cơ bản |
| [05-cai-nodejs-caddy.md](05-cai-nodejs-caddy.md) | Cài Node.js và Caddy |
| [06-gia-co-server.md](06-gia-co-server.md) | Gia cố server WebSocket (chặn mọi thứ, chưa làm) |
| [07-dua-code-len-build.md](07-dua-code-len-build.md) | Đưa code lên VPS, cài và build |
| [08-chay-server-systemd.md](08-chay-server-systemd.md) | Chạy server như dịch vụ nền |
| [09-cau-hinh-caddy.md](09-cau-hinh-caddy.md) | Cấu hình Caddy: web + WebSocket + HTTPS |
| [10-kiem-tra.md](10-kiem-tra.md) | Kiểm tra trước khi gửi link cho mọi người |
| [11-cap-nhat-deploy-lai.md](11-cap-nhat-deploy-lai.md) | Cập nhật code sau này, CI/CD |
| [12-duy-tri-lau-dai.md](12-duy-tri-lau-dai.md) | Duy trì lâu dài |
| [13-lam-viec-2-nguoi.md](13-lam-viec-2-nguoi.md) | Hai người, hai máy, hai Claude: quy trình làm chung |

## Tóm tắt tình trạng (cập nhật 2026-11-09)

| Việc | Ai làm | Xong chưa |
|---|---|---|
| Thay tài nguyên bản quyền (file 00) | Claude | ❌ Chưa |
| Gia cố server (file 06) | Claude | ❌ Chưa |
| Tạo repo GitHub Private (file 01) | Chủ dự án | ⏳ Đang làm |
| Mua VPS + domain (file 02) | Chủ dự án | ✅ Đã có `chua.io.vn` + VPS |
| Nối domain + các bước trên VPS (file 03-11) | Chủ dự án (theo hướng dẫn) | ❌ Chưa bắt đầu |

**Lưu ý quan trọng:** code mới nhất có thể đang nằm ở máy khác (máy chạy
thử localtunnel trước đó) với vài tính năng lạ chưa rõ nội dung ("Cốc &
Bài giảng", "Trò chuyện" — không có trong bản gốc Claude biết). Cần đẩy
code đó lên GitHub (file 01) và để Claude xem qua trước khi bắt đầu file 00.
