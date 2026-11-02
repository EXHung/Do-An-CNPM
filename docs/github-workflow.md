# Quản lý GitHub theo tuần và sprint

Repository: https://github.com/EXHung/Do-An-CNPM

## 1. Nhánh và mốc phiên bản

| Loại | Quy ước | Mục đích |
|---|---|---|
| Bản tích hợp | `main` | Phiên bản đã kiểm thử và bàn giao |
| Sprint | `sprint/sp1` … `sprint/sp5` | Tích hợp công việc của sprint đang làm |
| Công việc cá nhân | `feature/spN-<noi-dung>` hoặc `fix/spN-<loi>` | Một phần việc có thể review |
| Mốc sprint | `sp1-v1.0.0`, sau đó `sp2-v1.0.0`… | Chụp đúng commit được chốt của từng sprint |

Đợt đầu chỉ xuất bản SP1. Không tạo nhánh/tag SP2–SP5 như thể đã hoàn thành. Không tạo tag theo tuần cho thời điểm chưa có snapshot được kiểm chứng.

## 2. Phân chia SP1

| Thành viên | Nhánh công việc gợi ý | Nội dung |
|---|---|---|
| Phạm Minh Hùng | `feature/sp1-ui-mail` | Giao diện, nối API, SMTP/email, E2E và demo |
| Nguyễn Hoàng Phú | `feature/sp1-auth-foundation` | Account/session, AuthGuard, local startup, CI |
| Phạm Minh Hoàng | `feature/sp1-workspaces-rbac` | Workspace/member/invite token, RBAC, version và audit/outbox |

Nhánh công việc trên là quy ước cho các lần cộng tác tiếp theo, không xác nhận ba người đã tự tạo commit trước đó. Mỗi người dùng tài khoản Git của mình khi thực sự làm và commit; không đổi tác giả để mô phỏng đóng góp.

## 3. Đưa SP1 hiện tại lên repository

Git local đã có commit nền `6201e48` chứa phần lõi SP1. Giữ nguyên commit và tác giả hiện có. Các cập nhật tiếp theo được tách theo nội dung: email/lời mời, công cụ local, phân công nhóm, và lịch tuần/sprint. Các commit đều dùng ngày thực tế; tài liệu tiến độ giải thích đây là lần nhập SP1 lên GitHub, không tái dựng lịch sử các tuần đã qua.

`/prototype` và schema Project/Task hiện là thiết kế/tham khảo cho sprint sau, không được tính là SP2 đã hoàn thành. Database local, tài khoản thật, SMTP credentials, `.env`, cache/build/test artifacts không được đưa lên Git.

## 4. Quy trình cho sprint tiếp theo

Ví dụ bắt đầu SP2, chỉ thực hiện khi thực sự bắt đầu sprint:

```powershell
git switch main
git pull --ff-only origin main
git switch -c sprint/sp2
git push -u origin sprint/sp2
git switch -c feature/sp2-projects
```

Mỗi lần hoàn thành phần việc:

1. Chạy kiểm tra liên quan, đọc diff và kiểm tra không có secret.
2. Chỉ stage tệp thuộc công việc đó, commit rõ `feat(sp2): ...`, `fix(sp2): ...` hoặc `test(sp2): ...`.
3. Push nhánh công việc, tạo PR vào nhánh sprint; một người khác review.
4. Cuối tuần cập nhật tiến độ bằng mẫu trong `progress/README.md`, ghi kết quả thực tế.
5. Cuối sprint chạy các gate, tạo PR từ nhánh sprint vào `main`. Sau khi merge và đối chiếu kết quả, tạo tag ở commit đã nghiệm thu.

Ví dụ push công việc hiện tại:

```powershell
git push -u origin feature/sp2-projects
```

Không có lịch tự động push. Mỗi tuần chỉ push code đã làm thật; nếu trễ, báo cáo phần chưa xong và điều chỉnh kế hoạch.

## 5. Kiểm tra trước khi chốt sprint

```powershell
pnpm install --frozen-lockfile
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm api:build
pnpm test
pnpm test:integration
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Không chạy build/E2E đồng thời với web dev dùng chung `.next` hoặc database local. CI thực hiện lại trên GitHub; kết quả local đạt không thay thế kết quả CI. Các tích hợp cloud chưa được xác minh phải được ghi rõ trong báo cáo.
