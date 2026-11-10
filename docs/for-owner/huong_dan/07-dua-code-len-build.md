# 07 — Đưa code lên VPS, cài và build

← [06 — Gia cố server WebSocket](06-gia-co-server.md) | [Mục lục](README.md) | Tiếp theo: [08 — Chạy server như dịch vụ nền](08-chay-server-systemd.md)

---

**Chỉ làm bước này sau khi file [00](00-dieu-kien-tai-nguyen.md) và
[06](06-gia-co-server.md) đã xong.**

```bash
cd /opt
git clone https://github.com/ten-ban/vieng-chua-online.git chua
cd chua/server && npm ci
cd ../app && npm ci
```

## Các file bị `.gitignore` — `git clone` sẽ KHÔNG mang theo

Codebase có mấy thư mục cố ý không commit lên GitHub (ảnh/model có bản
quyền, dữ liệu thật của khách...). `git clone` ở trên xong là app **thiếu**
những thứ này, cần làm thủ công **trước khi `npm run build`**:

1. **`app/public/sansatemple/`** — model 3D + texture gốc (quyết định 0006,
   ~20MB). Chạy ngay trên VPS để tự tải lại, không cần tải từ máy bạn:
   ```bash
   cd /opt/chua
   bash scripts/fetch-sansatemple-assets.sh
   ```

2. **`app/public/thirdparty/`** — ảnh/âm thanh có giấy phép, liệt kê ở
   [`docs/assets/third-party-assets.md`](../../assets/third-party-assets.md).
   Thiếu file nào thì tính năng đó chỉ hiện placeholder (không lỗi), nhưng
   nên copy từ máy bạn lên cho đủ, ví dụ:
   ```powershell
   scp -r app\public\thirdparty ten-dang-nhap@dia-chi-vps:/opt/chua/app/public/
   ```
   Mở lại file đó để kiểm tra đã đủ chưa — mỗi lần thêm tài nguyên mới nhớ
   cập nhật cả bảng đó.

3. **`server/data/`** — dữ liệu thật của cốc/chat (`boards.json`, mật khẩu
   admin đã hash). Nếu đã có nội dung thật từ lúc test ở máy bạn và muốn
   giữ lại, copy sang; nếu để server tự tạo mới từ đầu trên VPS (không
   cũng được), thì bỏ qua bước này. **Việc này còn phải lặp lại mỗi lần
   deploy lại** (xem file [11](11-cap-nhat-deploy-lai.md)) — không xoá nhầm
   dữ liệu khách đã có trên VPS khi cập nhật code.

Sau khi đủ 3 bước trên mới build:

```bash
cd /opt/chua/app
VITE_PRESENCE_URL="wss://chuaonline.io.vn/ws" npm run build
```

## Nếu repo Private hỏi đăng nhập

Lệnh `git clone` sẽ hỏi đăng nhập — dùng **Personal Access Token** đã tạo
ở file [01](01-tao-repo-github.md) làm mật khẩu.

Để khỏi phải nhập lại mỗi lần, có hai cách (không bắt buộc cho lần đầu,
làm sau cũng được):
- Đổi URL repo để git nhớ token.
- Tạo SSH deploy key riêng cho VPS (an toàn hơn token) — hỏi Claude khi
  cần, sẽ hướng dẫn chi tiết riêng.

## Nếu VPS chỉ có 1GB RAM và build bị lỗi

`npm run build` cần đóng gói toàn bộ code 3D (Three.js), có thể cần tới
500MB-1GB RAM tạm thời. Nếu VPS ít RAM và lệnh build báo lỗi (thường có
chữ "JavaScript heap out of memory" hoặc tiến trình tự bị giết), cách khắc
phục: build ngay trên máy tính của bạn trước (`npm run build` ở thư mục
`app`), rồi chỉ tải riêng thư mục `app/dist` đã build xong lên VPS, thay vì
build trực tiếp trên VPS.

---

← [06 — Gia cố server WebSocket](06-gia-co-server.md) | [Mục lục](README.md) | Tiếp theo: [08 — Chạy server như dịch vụ nền](08-chay-server-systemd.md)
