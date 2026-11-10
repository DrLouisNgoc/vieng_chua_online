# 11 — Cập nhật code sau này (deploy lại), CI/CD

← [10 — Kiểm tra](10-kiem-tra.md) | [Mục lục](README.md) | Tiếp theo: [12 — Duy trì lâu dài](12-duy-tri-lau-dai.md)

---

`git pull` chỉ đụng tới code có commit trên GitHub — không đụng tới
`server/data/` (dữ liệu cốc/chat thật) hay `app/public/thirdparty|sansatemple`
(ảnh/model gitignored, xem file [07](07-dua-code-len-build.md)), nên deploy
lại không làm mất dữ liệu khách hay phải tải lại asset. Chỉ cần làm lại các
bước đó nếu đổi sang VPS khác.

## Cách thủ công: một script, một lệnh

```bash
cat > /opt/chua/deploy.sh << 'EOF'
#!/bin/bash
set -e
cd /opt/chua
git pull
cd server && npm ci
cd ../app && npm ci
VITE_PRESENCE_URL="wss://chuaonline.io.vn/ws" npm run build
sudo systemctl restart chua-server
echo "Deploy xong."
EOF
chmod +x /opt/chua/deploy.sh
```

Từ sau, mỗi lần có code mới: SSH vào VPS, gõ:
```bash
/opt/chua/deploy.sh
```

## CI/CD tự động (không bắt buộc)

Nếu muốn mỗi lần `git push` lên GitHub là tự động deploy, không cần tự SSH
vào mỗi lần — dùng **GitHub Actions** gọi script ở trên qua SSH.

Đổi lại: cần lưu **private key SSH của VPS vào GitHub Secrets** — thứ nhạy
cảm, lộ ra là ai cũng vào được VPS của bạn.

**Khuyến nghị:** với dự án quy mô vài người chơi, cách thủ công
(`deploy.sh`, một lệnh) đã đủ nhanh. Chỉ nên làm CI/CD nếu sau này sửa code
rất thường xuyên (vài lần/ngày) và thấy việc SSH tay vẫn phiền. Hỏi Claude
khi tới lúc cần, sẽ hướng dẫn chi tiết riêng (tạo deploy key, cấu hình
GitHub Actions workflow).

---

← [10 — Kiểm tra](10-kiem-tra.md) | [Mục lục](README.md) | Tiếp theo: [12 — Duy trì lâu dài](12-duy-tri-lau-dai.md)
