# 11 — Cập nhật code sau này (deploy lại), CI/CD

← [10 — Kiểm tra](10-kiem-tra.md) | [Mục lục](README.md) | Tiếp theo: [12 — Duy trì lâu dài](12-duy-tri-lau-dai.md)

---

`git pull` chỉ đụng tới code có commit trên GitHub — không đụng tới
`server/data/` (dữ liệu cốc/chat thật) hay `app/public/thirdparty|sansatemple`
(ảnh/model gitignored, xem file [07](07-dua-code-len-build.md)), nên deploy
lại không làm mất dữ liệu khách hay phải tải lại asset. Chỉ cần làm lại các
bước đó nếu đổi sang VPS khác.

## Script deploy (bản an toàn, 2026-11-10)

Bản cũ có 3 chỗ làm sập site: build xoá `dist/` trước nên trong lúc build
site trắng trang (build lỗi là chết hẳn); `git pull` kẹt khi trên VPS có
file bị sửa tay; server mới không lên thì không ai biết. Bản dưới đây:
build ra thư mục tạm rồi mới đổi chỗ; sau khi khởi động lại thì **tự kiểm
tra site**, hỏng thì **tự quay về bản cũ** và báo đỏ trên GitHub.

SSH vào VPS bằng user `chua`, dán nguyên khối này (ghi đè bản cũ):

```bash
cat > /opt/chua/deploy.sh << 'EOF'
#!/bin/bash
# deploy.sh [commit] — CI truyền đúng commit đã qua test; chạy tay thì bỏ trống (= origin/main).
set -uo pipefail
cd /opt/chua
TARGET="${1:-origin/main}"
HEALTH_BASE="${HEALTH_BASE:-https://chua.io.vn}"
PREV=$(git rev-parse HEAD)
SWAPPED=0

healthy() {
  for _ in $(seq 1 15); do
    curl -fsS -o /dev/null "$HEALTH_BASE/boards" && curl -fsS -o /dev/null "$HEALTH_BASE/" && return 0
    sleep 2
  done
  return 1
}

deploy() {
  git fetch --quiet origin &&
  git reset --hard "$TARGET" &&
  (cd server && npm ci) &&
  (cd app && npm ci && rm -rf dist-new &&
    VITE_PRESENCE_URL="wss://chua.io.vn/ws" VITE_BOARDS_URL="https://chua.io.vn" \
    npm run build -- --outDir dist-new) &&
  rm -rf app/dist-prev &&
  { [ ! -d app/dist ] || mv app/dist app/dist-prev; } &&
  mv app/dist-new app/dist && SWAPPED=1 &&
  sudo systemctl restart chua-server &&
  healthy
}

if deploy; then
  git rev-parse HEAD > DEPLOYED
  echo "Deploy xong: $(cat DEPLOYED)"
  exit 0
fi

echo "DEPLOY HỎNG — quay về bản cũ $PREV" >&2
git reset --hard "$PREV"
(cd server && npm ci)
if [ "$SWAPPED" = 1 ] && [ -d app/dist-prev ]; then rm -rf app/dist && mv app/dist-prev app/dist; fi
sudo systemctl restart chua-server
if healthy; then
  echo "Đã quay về $PREV, site chạy lại bình thường." >&2
else
  echo "Bản cũ cũng không lên — xem: journalctl -u chua-server -n 50" >&2
fi
exit 1
EOF
chmod +x /opt/chua/deploy.sh
```

Lưu ý: `git reset --hard` **xoá mọi sửa tay trên file có trong git** ở VPS
(đừng sửa code trực tiếp trên VPS nữa — sửa qua GitHub). Không đụng tới
`server/data/`, ảnh/model gitignored hay `app/dist` hiện tại.

**Thử tính năng tự quay về (làm 1 lần sau khi dán script):**
```bash
HEALTH_BASE=https://chua.io.vn/khong-co-trang-nay /opt/chua/deploy.sh
```
Phải thấy "DEPLOY HỎNG — quay về bản cũ" rồi "Bản cũ cũng không lên" (vì
URL kiểm tra cố tình sai), nhưng mở `https://chua.io.vn` vẫn vào bình thường.
Sau đó chạy lại bình thường: `/opt/chua/deploy.sh` → "Deploy xong".

Site đang chạy bản nào: `cat /opt/chua/DEPLOYED`.

## CI/CD tự động (cập nhật 2026-11-10, quyết định 0012, 0014)

Không ai push thẳng `main` nữa. Mỗi thay đổi là một PR; **CI** (tab
Actions, workflow "CI") chạy typecheck + test + build. Theo quy tắc trong
`CLAUDE.md`, PR chỉ được merge khi CI xanh hết (`main` không khoá trên
GitHub, nên quy tắc này do Claude giữ, xem file 13). Sau khi merge, CI chạy lại trên `main`; **xanh thì** workflow
"Deploy to VPS" mới SSH vào VPS chạy `/opt/chua/deploy.sh <commit>`. CI đỏ
thì không deploy gì cả, site giữ bản cũ.

Deploy lại bằng tay không cần SSH: tab **Actions → Deploy to VPS → Run
workflow**.

Lỡ merge một thay đổi hỏng mà CI không bắt được: mở PR đó trên GitHub →
nút **Revert** → merge PR revert → CI → deploy bản cũ.

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
merge kế tiếp, xem job "Deploy to VPS" chạy xanh hay đỏ.

---

← [10 — Kiểm tra](10-kiem-tra.md) | [Mục lục](README.md) | Tiếp theo: [12 — Duy trì lâu dài](12-duy-tri-lau-dai.md)
