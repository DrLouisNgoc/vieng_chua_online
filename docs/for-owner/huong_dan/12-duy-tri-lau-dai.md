# 12 — Duy trì lâu dài

← [11 — Cập nhật code sau này](11-cap-nhat-deploy-lai.md) | [Mục lục](README.md) | Tiếp theo: [13 — Làm việc 2 người](13-lam-viec-2-nguoi.md)

---

## Dữ liệu nào quý, nằm ở đâu

| Dữ liệu | Ở đâu | Mất khi |
|---|---|---|
| Nội dung cốc, bài giảng, hỏi pháp + trả lời, mật khẩu (đã băm) | VPS: `/opt/chua/server/data/boards.json` | **mất VPS** (không có trong git) |
| Pháp danh đã khoá theo ip | VPS: `/opt/chua/server/data/visitor-names.json` | mất VPS |
| Ai đang ở đâu, ai ngồi đệm nào, chat | RAM của server | mỗi lần restart/deploy (bình thường) |
| Số hạt, số câu kinh của từng người | trình duyệt của khách (`localStorage`) | khách xoá dữ liệu trình duyệt |
| Code | GitHub | — |

> Bản cũ của file này ghi "sao lưu không bắt buộc". **Sai** từ khi có cốc và hỏi pháp: `server/data/` là nội
> dung thật của các thầy cô và khách, chỉ có trên VPS.

## Sao lưu tự động (quyết định 0013)

Workflow **Backup server data** (`.github/workflows/backup.yml`) chạy **2:30 sáng mỗi đêm**:
1. Trên VPS: nén `server/data/` vào `/opt/chua/backups/server-data-YYYY-MM-DD.tar.gz`, giữ 14 ngày gần nhất.
2. Tải bản đó về GitHub, cất thành **artifact riêng tư**, giữ 90 ngày.

Không cần cài gì thêm, dùng chung secret SSH của CI/CD (file 11). Chạy thử ngay: tab **Actions → Backup server
data → Run workflow**. Xanh, và trong run có mục **Artifacts → server-data-N** là được.

Artifact chứa mật khẩu đã băm và ip của khách. Chỉ người có quyền vào repo (Private) mới tải được. Đừng gửi
file này cho ai.

## Khôi phục khi `boards.json` hỏng hoặc mất

Server **từ chối khởi động** nếu file dữ liệu bị hỏng (báo `... is not valid JSON — restore it from a backup`
trong `journalctl -u chua-server`), để không ghi đè mất nội dung thật. Cách khôi phục:

```bash
ls -1 /opt/chua/backups/                       # chọn bản mới nhất còn tốt
sudo systemctl stop chua-server
cd /opt/chua/server
mv data data-hong-$(date +%F)                  # giữ bản hỏng lại, đừng xoá
tar -xzf /opt/chua/backups/server-data-YYYY-MM-DD.tar.gz   # tạo lại thư mục data/
sudo systemctl start chua-server
systemctl status chua-server                   # phải thấy active (running)
```

Mất cả VPS: tải artifact mới nhất trên GitHub (file `.zip` chứa `server-data.tar.gz`), giải nén ra máy mình, dựng
VPS mới theo file 04–10, rồi `scp server-data.tar.gz chua@<ip-vps-moi>:/opt/chua/` và giải nén như trên.

## Báo động khi site sập

Workflow **Uptime** (`.github/workflows/uptime.yml`) mở `https://chua.io.vn` và `/boards` **mỗi giờ**. Không trả
lời sau 3 lần thử thì run đỏ, GitHub **gửi email** cho người sửa lịch chạy gần nhất. Để chắc mail về đúng người:
GitHub → avatar → **Settings → Notifications → Actions** → bật "Notify me for failed workflows only".

Mỗi giờ một lần là cố ý: repo Private chỉ có 2000 phút GitHub Actions miễn phí mỗi tháng. Kiểm tra 15 phút một
lần riêng nó đã tốn khoảng 2900 phút/tháng và sẽ chặn luôn CI. Muốn báo nhanh hơn (5 phút): đăng ký
**UptimeRobot** miễn phí, thêm monitor HTTPS cho `https://chua.io.vn/boards`.

Lưu ý: GitHub **tự tắt** các workflow chạy theo lịch nếu repo không có commit nào trong 60 ngày. Lâu không sửa gì
thì vào **Actions** bật lại.

## Việc định kỳ

- **Gia hạn domain + VPS đúng hạn**: ghi lịch nhắc riêng, không có gì tự nhắc bạn.
- **Hằng tuần**: workflow **Audit** kiểm tra lỗ hổng bảo mật trong thư viện; **Dependabot** mở PR nâng cấp. PR của
  Dependabot không tự merge: CI xanh thì bấm Merge, hoặc nhờ Claude xem.
- **Theo dõi RAM/CPU** nếu đông người hơn dự kiến: `htop` (cài: `sudo apt install -y htop`).
- **Dung lượng đĩa**: `df -h /`. Bản sao lưu trên VPS tự xoá sau 14 ngày.
- **Cập nhật hệ điều hành** mỗi tháng: `sudo apt update && sudo apt upgrade -y`, rồi kiểm tra site vẫn chạy.

---

← [11 — Cập nhật code sau này](11-cap-nhat-deploy-lai.md) | [Mục lục](README.md) | Tiếp theo: [13 — Làm việc 2 người](13-lam-viec-2-nguoi.md)
