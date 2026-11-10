# 13 — Hai người, hai máy, hai Claude: cách làm chung không loạn

← [12 — Duy trì lâu dài](12-duy-tri-lau-dai.md) | [Mục lục](README.md)

---

Quyết định: `docs/memory/decisions/0012-two-owner-workflow.md` và `0014-limits-instead-of-branch-lock.md`. Tóm tắt:
**mỗi việc = 1 Issue = 1 nhánh = 1 PR → CI xanh hết → Claude merge → tự deploy.**

`main` **không khoá** trên GitHub (bạn chọn, 2026-11-10). Thay vào đó, Claude của cả hai máy đọc cùng một bộ
**quy tắc giới hạn** trong `CLAUDE.md`:
1. Không commit, push hay merge thẳng vào `main`; mọi thay đổi đi qua PR.
2. Chỉ merge khi **mọi** check CI đều xanh; đang chạy, đỏ hay bị bỏ qua đều không merge.
3. Không force-push.
4. Mỗi lần merge một PR; `main` vừa đổi thì rebase và chờ CI lại.
5. Deploy đỏ thì báo ngay, không tự sửa vội trên `main`.

Bạn hay anh trai bảo Claude phá một quy tắc, nó sẽ nói rõ rủi ro và hỏi lại lần nữa. Thêm một lưới an toàn: kể cả
khi ai đó lỡ push thẳng `main`, **CI đỏ thì không deploy** (workflow deploy chỉ chạy sau CI xanh).

## Phần A — Chủ repo (Ngọc) bấm trên GitHub, làm 1 lần

1. **Mời anh trai:** repo → **Settings → Collaborators → Add people** →
   tài khoản GitHub của anh → quyền **Write**.
2. **Settings → General → Pull Requests**:
   - Bật **Automatically delete head branches**.
   - Chỉ bật **Allow squash merging** (tắt merge commit và rebase merging) để lịch sử gọn.
3. **Tạo 2 nhãn:** **Issues → Labels → New label**: `tech-debt` và `needs-visual-check`.
4. Trên VPS: dán `deploy.sh` bản mới theo [file 11](11-cap-nhat-deploy-lai.md), rồi chạy thử tính năng tự quay về.

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
3. Xong việc, gõ: `/xong`. Claude kiểm tra → mở PR → chờ CI (vài phút, đừng tắt Claude).
4. CI xanh hết: Claude merge, khoảng 1–3 phút sau site cập nhật. **Không cần làm gì thêm.**
5. Việc tiếp theo: gõ `/clear` trước, rồi lại `/bat-dau ...`. Một việc một phiên thì đỡ tốn limit.

**PR có nhãn `needs-visual-check`** (đổi giao diện hoặc 3D): Claude không merge. Người làm chạy `npm run dev`, nhìn
tận mắt, thấy ổn và CI xanh thì vào GitHub bấm **Merge**.

**Xem ai đang làm gì:** tab **Issues** trên GitHub (người được assign là người đang làm). Đừng nhận việc người
kia đang làm.

## Khi nào dừng lại và gọi Ngọc

- CI đỏ mà Claude sửa 2 lần vẫn đỏ.
- Claude báo **xung đột (conflict)** mà không chắc cách gộp.
- Claude đòi vào VPS (`ssh`), đòi đổi secret hay mật khẩu, đòi xoá `server/data/`, đòi push thẳng `main`, hoặc đòi
  merge khi CI chưa xanh.
  Trả lời **không**, rồi gọi Ngọc.
- Site sập sau khi merge: tab **Actions → Deploy to VPS** đỏ nghĩa là script đã tự quay về bản cũ. Muốn gỡ hẳn
  thay đổi đó thì mở PR vừa merge → nút **Revert**.

---

← [12 — Duy trì lâu dài](12-duy-tri-lau-dai.md) | [Mục lục](README.md)
