# 13 — Hai người, hai máy, hai Claude: cách làm chung không loạn

← [12 — Duy trì lâu dài](12-duy-tri-lau-dai.md) | [Mục lục](README.md)

---

Quyết định: `docs/memory/decisions/0012-two-owner-workflow.md`. Tóm tắt:
**mỗi việc = 1 Issue = 1 nhánh = 1 PR → CI xanh → tự merge → tự deploy.**
Không ai push thẳng `main`. Claude của cả hai máy đọc cùng một bộ luật
trong repo (`CLAUDE.md`), nên làm cùng một kiểu.

## Phần A — Chủ repo (Ngọc) bấm trên GitHub, làm 1 lần

Làm **sau khi** PR "two-person workflow" đã merge (lúc đó CI đã chạy ít
nhất 1 lần, GitHub mới biết tên các check).

1. **Mời anh trai:** repo → **Settings → Collaborators → Add people** →
   tài khoản GitHub của anh → quyền **Write**.
2. **Cho phép tự merge:** **Settings → General → Pull Requests**:
   - Bật **Allow auto-merge**.
   - Bật **Automatically delete head branches**.
   - Chỉ bật **Allow squash merging** (tắt merge commit và rebase merging) để lịch sử gọn.
3. **Khoá nhánh `main`:** **Settings → Rules → Rulesets → New branch ruleset**:
   - Tên: `main`. Enforcement: **Active**. Target: **Include default branch**.
   - Bật **Restrict deletions**, **Block force pushes**.
   - Bật **Require a pull request before merging**, số người duyệt (approvals) = **0**.
   - Bật **Require status checks to pass**. Thêm các check: `server`, `app`, `docs`.
     Bật **Require branches to be up to date before merging**.
   - **Bypass list: để trống**, kể cả admin. Thế thì chính Claude của bạn cũng không push thẳng `main` được.
4. **Tạo 2 nhãn:** **Issues → Labels → New label**: `tech-debt` và `needs-visual-check`.
5. Trên VPS: dán `deploy.sh` bản mới theo [file 11](11-cap-nhat-deploy-lai.md), rồi chạy thử tính năng tự quay về.

## Phần B — Máy anh trai, cài 1 lần

1. Cài **Git**, **Node.js 22**, **GitHub CLI** (`gh`), **Claude Code**.
2. Mở terminal:
   ```bash
   gh auth login                 # chọn GitHub.com → HTTPS → đăng nhập bằng trình duyệt
   gh repo clone DrLouisNgoc/vieng_chua_online
   cd vieng_chua_online
   git config user.name "Anh"    # tên hiện trên commit
   npm --prefix server ci && npm --prefix app ci
   npm run check                 # phải thấy toàn chữ xanh / "check-docs: ok"
   ```
3. **Ảnh/model không có trong git**: Ngọc nén thư mục `app/public/sansatemple/` và `app/public/thirdparty/` ở
   máy mình, gửi qua (Drive/USB), anh giải nén vào đúng chỗ đó trong thư mục repo. Không có thì vẫn sửa được code,
   chỉ có `npm run dev` là thiếu hình.
4. Mở Claude Code **trong thư mục repo**. Claude tự đọc `CLAUDE.md`.

## Phần C — Mỗi ngày, cả hai người làm giống nhau

1. Mở Claude trong thư mục repo, gõ:
   `/bat-dau sửa nút Nhạc nền bị che trên điện thoại` (tả việc bằng lời thường).
   Claude sẽ: lấy code mới nhất → tìm hoặc tạo Issue → tạo nhánh → viết test → sửa.
2. Xem Claude làm; nó hỏi thì trả lời.
3. Xong việc, gõ: `/xong`. Claude kiểm tra → mở PR → bật tự merge → chờ CI.
4. CI xanh: PR tự merge, khoảng 1–3 phút sau site cập nhật. **Không cần làm gì thêm.**
5. Việc tiếp theo: gõ `/clear` trước, rồi lại `/bat-dau ...`. Một việc một phiên thì đỡ tốn limit.

**PR có nhãn `needs-visual-check`** (đổi giao diện hoặc 3D): không tự merge. Người làm chạy `npm run dev`, nhìn
tận mắt, thấy ổn thì vào GitHub bấm **Merge**.

**Xem ai đang làm gì:** tab **Issues** trên GitHub (người được assign là người đang làm). Đừng nhận việc người
kia đang làm.

## Khi nào dừng lại và gọi Ngọc

- CI đỏ mà Claude sửa 2 lần vẫn đỏ.
- Claude báo **xung đột (conflict)** mà không chắc cách gộp.
- Claude đòi vào VPS (`ssh`), đòi đổi secret hay mật khẩu, đòi xoá `server/data/`, hoặc đòi push thẳng `main`.
  Trả lời **không**, rồi gọi Ngọc.
- Site sập sau khi merge: tab **Actions → Deploy to VPS** đỏ nghĩa là script đã tự quay về bản cũ. Muốn gỡ hẳn
  thay đổi đó thì mở PR vừa merge → nút **Revert**.

---

← [12 — Duy trì lâu dài](12-duy-tri-lau-dai.md) | [Mục lục](README.md)
