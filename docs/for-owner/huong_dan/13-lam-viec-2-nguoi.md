# 13 — Hai người, hai máy, hai Claude: cách làm chung không loạn

← [12 — Duy trì lâu dài](12-duy-tri-lau-dai.md) | [Mục lục](README.md)

---

Quyết định: `docs/memory/decisions/0012-two-owner-workflow.md` và `0014-limits-instead-of-branch-lock.md`. Tóm tắt:
**mỗi việc = 1 Issue = 1 nhánh → commit → push → mở PR → CI chạy → xanh hết thì CI tự merge → tự deploy.**

CI tự merge bằng job `automerge` trong `.github/workflows/ci.yml`. Job này chỉ merge khi cả 3 job `server`,
`app`, `docs` đều xanh, và chỉ khi trong lúc CI chạy chưa có ai merge thêm gì vào `main`. Nếu có, nó để lại
comment, Claude rebase và đẩy lại, CI chạy lại rồi tự merge.

`main` **không khoá** trên GitHub (bạn chọn, 2026-11-10). Thay vào đó, Claude của cả hai máy đọc cùng một bộ
**quy tắc giới hạn** trong `CLAUDE.md`:
1. Không commit, push hay merge thẳng vào `main`; mọi thay đổi đi qua PR.
2. Claude không tự bấm merge; CI merge khi xanh hết. Việc đang làm dở thì mở PR ở dạng **draft**: CI vẫn chạy
   nhưng không merge.
3. Chỉ được force-push lên nhánh việc của chính mình sau khi rebase; không bao giờ lên `main`.
4. CI báo "`main` moved" thì rebase và đẩy lại.
5. Deploy đỏ thì báo ngay, không tự sửa vội trên `main`.

Bạn hay anh trai bảo Claude phá một quy tắc, nó sẽ nói rõ rủi ro và hỏi lại lần nữa. Thêm một lưới an toàn: kể cả
khi ai đó lỡ push thẳng `main`, **CI đỏ thì không deploy**.

**Hai máy dùng chung một tài khoản GitHub**, nên GitHub không phân biệt được ai làm gì. Claude gắn nhãn `ngoc`
hoặc `anh` lên Issue và PR, và commit mang tên riêng của từng máy (`git config user.name`).

## Phần A — Làm 1 lần

1. **Settings → General → Pull Requests** (không bắt buộc, cho lịch sử gọn): chỉ bật **Allow squash merging**.
2. **Chỉ khi** job `automerge` báo lỗi `Resource not accessible by integration`: vào **Settings → Actions →
   General → Workflow permissions**, chọn **Read and write permissions**, Save. Bình thường không cần, vì workflow
   đã tự xin đủ quyền.
3. Trên VPS: dán `deploy.sh` bản mới theo [file 11](11-cap-nhat-deploy-lai.md), rồi chạy thử tính năng tự quay về.

Các nhãn `ngoc`, `anh`, `tech-debt`: đã tạo sẵn (Claude tự tạo lại nếu thiếu).

## Phần B — Máy anh trai, cài 1 lần

GitHub đã đăng nhập sẵn trên máy anh. Chỉ cần kiểm tra và cài phần còn thiếu:

1. Có **Git**, **Node.js 22**, **GitHub CLI** (`gh`), **Claude Code**.
2. Mở terminal:
   ```bash
   gh auth status                # phải thấy "Logged in to github.com"; nếu không: gh auth login
   gh repo clone DrLouisNgoc/vieng_chua_online
   cd vieng_chua_online
   git config user.name "Anh"    # tên hiện trên commit, để phân biệt với máy Ngọc
   npm ci && npm --prefix server ci && npm --prefix app ci   # npm ci ở gốc cài cả git hook kiểm tra code
   npm run check                 # phải thấy toàn chữ xanh / "check-docs: ok"
   ```
3. **Ảnh/model không có trong git**: Ngọc nén thư mục `app/public/sansatemple/` và `app/public/thirdparty/` ở
   máy mình, gửi qua (Drive/USB), anh giải nén vào đúng chỗ đó trong thư mục repo. Không có thì vẫn sửa được code,
   chỉ có `npm run dev` là thiếu hình.
4. Mở Claude Code **trong thư mục repo**. Claude tự đọc `CLAUDE.md`.

## Phần C — Mỗi ngày, cả hai người làm giống nhau

**Không cần gõ lệnh gì.** Cứ nói việc bằng lời thường, Claude tự lo cả quy trình.

1. Mở Claude trong thư mục repo, nói việc cần làm, ví dụ: *"sửa nút Nhạc nền bị che trên điện thoại"*.
   Trước khi sửa, Claude **tự** lấy code mới nhất → tìm hoặc tạo Issue → tạo nhánh → viết test → sửa.
2. Xem Claude làm; nó hỏi thì trả lời.
3. Sửa xong và test xanh, Claude **tự** commit → push → mở PR → theo dõi CI (vài phút).
4. CI xanh hết: **CI tự merge**, khoảng 1–3 phút sau site cập nhật. Claude báo lại kết quả bằng tiếng Việt.
5. Việc tiếp theo: nên gõ `/clear` trước (xoá ngữ cảnh cũ, đỡ tốn limit), rồi nói việc mới.

Chưa muốn đưa lên site ngay (chỉ thử, xem trước)? Nói rõ *"làm thử thôi, đừng đưa lên"*. Claude sẽ để dạng PR
**draft**: CI vẫn chạy nhưng không merge.

Chỉ hỏi hay nhờ giải thích, không sửa file nào: Claude không mở Issue, không tạo nhánh.

(Các lệnh `/bat-dau`, `/xong`, `/refactor` vẫn dùng được nếu muốn gọi tay, nhưng không bắt buộc.)

**Không còn bước xem trước khi merge** (quyết định 0016): PR đổi giao diện/3D cũng tự động merge như mọi PR khác
khi CI xanh. Muốn xem thử thì `npm run dev` trước hoặc sau khi merge đều được, tuỳ bạn.

**Xem ai đang làm gì:** tab **Issues** trên GitHub, nhãn `ngoc` hay `anh`. Đừng nhận việc có nhãn của người kia.

## Khi nào dừng lại và gọi Ngọc

- CI đỏ mà Claude sửa 2 lần vẫn đỏ.
- Claude báo **xung đột (conflict)** mà không chắc cách gộp.
- Claude đòi vào VPS (`ssh`), đòi đổi secret hay mật khẩu, đòi xoá `server/data/`, đòi push thẳng `main`, hoặc đòi
  merge khi CI chưa xanh, hoặc đòi sửa file trong `.github/workflows/` mà bạn không yêu cầu.
  Trả lời **không**, rồi gọi Ngọc.
- Site sập sau khi merge: tab **Actions → Deploy to VPS** đỏ nghĩa là script đã tự quay về bản cũ. Muốn gỡ hẳn
  thay đổi đó thì mở PR vừa merge → nút **Revert**.

---

← [12 — Duy trì lâu dài](12-duy-tri-lau-dai.md) | [Mục lục](README.md)
