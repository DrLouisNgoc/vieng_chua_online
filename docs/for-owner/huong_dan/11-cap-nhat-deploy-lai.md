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
VITE_PRESENCE_URL="wss://chua.io.vn/ws" VITE_BOARDS_URL="https://chua.io.vn" npm run build
sudo systemctl restart chua-server
echo "Deploy xong."
EOF
chmod +x /opt/chua/deploy.sh
```

Từ sau, mỗi lần có code mới: SSH vào VPS, gõ:
```bash
/opt/chua/deploy.sh
```

## CI/CD tự động (đã cấu hình, 2026-11-10)

Mỗi lần `git push` nhánh `main` lên GitHub, **GitHub Actions** tự SSH vào
VPS chạy `/opt/chua/deploy.sh` — không cần tự SSH vào mỗi lần.

Workflow: `.github/workflows/deploy.yml` trong repo (không có gì bí mật,
nằm trong code bình thường). Cần 3 secret trong GitHub (**Settings →
Secrets and variables → Actions**), chỉ làm 1 lần:

| Tên | Giá trị |
|---|---|
| `VPS_HOST` | IP hoặc domain VPS (`chua.io.vn`) |
| `VPS_USER` | `chua` |
| `VPS_SSH_KEY` | private key SSH **riêng cho CI** (khác khoá deploy key GitHub→VPS ở file 01/07) |

Tạo khoá CI trên VPS (bằng user `chua`):
```bash
ssh-keygen -t ed25519 -C "github-actions-ci" -f ~/.ssh/ci_deploy -N ""
cat ~/.ssh/ci_deploy.pub >> ~/.ssh/authorized_keys
cat ~/.ssh/ci_deploy   # copy nguyên dòng này vào secret VPS_SSH_KEY
```

`deploy.sh` cần `sudo systemctl restart chua-server`, nhưng phiên SSH tự
động của GitHub Actions không có terminal để gõ mật khẩu `sudo` — sẽ báo
lỗi "a terminal is required to read the password". Cho user `chua` quyền
chạy **đúng 1 lệnh đó** không cần mật khẩu (không mở toang `sudo`):
```bash
echo "chua ALL=(root) NOPASSWD: /usr/bin/systemctl restart chua-server" | sudo tee /etc/sudoers.d/chua-deploy
sudo chmod 440 /etc/sudoers.d/chua-deploy
sudo visudo -c   # kiểm tra cú pháp, tránh khoá nhầm sudo của cả máy
```

**Rủi ro cần biết:** secret này cho phép GitHub Actions chạy lệnh trên
VPS của bạn. Repo đang Private nên tạm chấp nhận được, nhưng nếu secret
bị lộ (ví dụ máy bạn bị chiếm quyền, hoặc vô tình để lộ trong log), kẻ
xấu SSH được vào VPS. Theo dõi tab **Actions** trên GitHub xem có lần
chạy lạ không.

Kiểm tra sau khi thêm secret: vào tab **Actions** trên GitHub sau lần
push kế tiếp, xem job "Deploy to VPS" chạy xanh hay đỏ.

---

← [10 — Kiểm tra](10-kiem-tra.md) | [Mục lục](README.md) | Tiếp theo: [12 — Duy trì lâu dài](12-duy-tri-lau-dai.md)
