# SP1 — Tổng hợp khi đưa dự án lên GitHub

Ngày kiểm chứng và chuẩn bị xuất bản: 02/11/2026, múi giờ Asia/Saigon.

## Phạm vi

US01 và US02: tài khoản/phiên, workspace, thành viên, RBAC và mã mời. SMTP/email là phần bổ sung do Phạm Minh Hùng phụ trách. Project/Task trong schema và `/prototype` là thiết kế/tham khảo, chưa phải SP2 hoàn chỉnh.

## Phân bổ theo tuần học

| Tuần dự kiến | Nội dung được phân bổ | Bằng chứng hiện có |
|---|---|---|
| 1: 13/10–19/10 | Nền tảng và thiết kế | Cấu trúc web/API, schema, config và tài liệu có trong commit nền `6201e48` |
| 2: 20/10–26/10 | Tài khoản, phiên và AuthGuard | Code và kiểm thử xác thực có trong commit nền |
| 3: 27/10–02/11 | Workspace/RBAC và tích hợp | API/UI, unit/integration/E2E; các commit tiếp theo tách email, local tooling và tài liệu |

Đây là cách phân bổ nội dung để báo cáo, không xác nhận đã commit/push ở tuần 1 hoặc 2. Lịch sử Git được giữ nguyên; lần nhập SP1 lên GitHub diễn ra tại thời điểm hiện tại.

## Phân công

| Thành viên | Phụ trách | Tỷ trọng dự kiến |
|---|---|---|
| Phạm Minh Hùng | UI, API integration, SMTP/email, E2E và demo | 35% |
| Nguyễn Hoàng Phú | Auth/session, nền tảng, local startup và CI | 30% |
| Phạm Minh Hoàng | Workspace/member/invitation token, RBAC, version/transaction và audit/outbox | 35% |

Bảng ghi trách nhiệm được giao, không xác nhận mỗi người đã tự tạo commit hoặc review. Mỗi thành viên cần đọc, kiểm thử và ghi nhận công việc thực tế khi tiếp tục cộng tác.

## Kiểm chứng local trước khi push

| Lệnh/kiểm tra | Kết quả thực tế |
|---|---|
| `pnpm typecheck` | Đạt |
| `pnpm lint` | Đạt, không cảnh báo |
| `pnpm api:build` | Đạt |
| `pnpm test` | 13/13 unit tests đạt |
| `pnpm test:integration` | 26 ca con đạt, Node báo 27 test gồm test cha; PostgreSQL thật riêng và SMTP test server |
| `pnpm build` | Web production build đạt |
| `pnpm test:e2e` | 3/3 Chromium E2E đạt, API/database thật |
| Rà tệp Git và commit nền | Không phát hiện các mẫu token/private key được quét; không có `.env` thật, `.local`, dependencies hoặc build artifacts trong tập tệp xuất bản |

SMTP test xác minh nhận thư ở server kiểm thử và phản hồi khi xác thực SMTP thất bại; không chứng minh thư Gmail/nhà cung cấp thật đã đến inbox. Các kiểm tra không phải chứng nhận toàn bộ bảo mật hoặc production readiness.

GitHub Actions sẽ chạy sau push. Kết quả local không thay thế kết quả CI; xem trạng thái thật ở tab Actions của repository. Supabase cloud, triển khai public và Firefox/WebKit chưa được xác minh trong đợt này.

## Việc tiếp theo

- SP2: project CRUD rồi task CRUD/phân công/hạn hoàn thành.
- Dùng nhánh `sprint/sp2` khi bắt đầu thật; cập nhật từng tuần theo mẫu `README.md` trong thư mục này.
- Nhóm review chéo và cập nhật báo cáo bằng commit/PR thực tế; không dùng phân công dự kiến làm bằng chứng đóng góp.
