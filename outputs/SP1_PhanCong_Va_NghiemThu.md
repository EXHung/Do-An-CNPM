# SP1 Đăng nhập phân quyền và không gian làm việc

## Mục tiêu và phạm vi

Hoàn thiện US01 và US02 của đồ án Orbit Workspace: người dùng đăng ký, đăng nhập, đăng xuất; tạo không gian, cập nhật thông tin và quản lý thành viên theo quyền. SP1 là nền tảng cho dự án và nhiệm vụ ở SP2.

## Phân công nhóm ba thành viên

Phân công được Phạm Minh Hùng xác nhận ngày 02/11/2026. Phạm Minh Hùng phụ trách cả phần email làm thêm. Tỷ trọng dưới đây là ước lượng công việc được giao, không phải tỷ lệ đóng góp đã được xác minh.

| Người phụ trách | Công việc và sản phẩm bàn giao | Code chính | Độ khó | Tỷ trọng |
|---|---|---|---|---|
| Phạm Minh Hùng | Giao diện đăng ký/đăng nhập, workspace, thành viên, nhật ký; nối API; responsive/dark/light; email mời SMTP và liên kết nhận lời mời; E2E và demo | `apps/web`, `apps/api/src/mail`, `tests/e2e` | 4/5 | 35% |
| Nguyễn Hoàng Phú | API tài khoản, băm mật khẩu, phiên/cookie, AuthGuard, giới hạn đăng nhập, lỗi chung; dữ liệu tài khoản; cấu hình chạy local và CI | `apps/api/src/auth`, `common`, `database`, `scripts`, `.github` | 4/5 | 30% |
| Phạm Minh Hoàng | API workspace/thành viên; vòng đời mã mời; RBAC; version và transaction; audit/outbox; schema liên quan | `apps/api/src/workspaces`, Prisma schema | 4,5/5 | 35% |

## Đầu việc theo người phụ trách

### Phạm Minh Hùng

- TV1-01: giao diện đăng ký/đăng nhập, kiểm tra form và thông báo lỗi.
- TV1-02: giao diện tạo/chọn/cập nhật workspace và quản lý thành viên theo quyền.
- TV1-03: giao diện tạo/nhận/thu hồi lời mời, nhật ký hoạt động, responsive và dark/light.
- TV1-04: tích hợp API và kiểu từ OpenAPI; phối hợp xử lý lỗi phiên, quyền và version.
- TV1-05: email mời SMTP, template, liên kết nhận lời mời và phản hồi gửi thư; không đưa khóa SMTP vào Git.
- TV1-06: phụ trách chính Playwright E2E, kiểm tra giao diện và demo; nhờ Phú/Hoàng hỗ trợ các luồng backend.

### Nguyễn Hoàng Phú

- TV2-01: dữ liệu tài khoản/phiên và hợp đồng API xác thực; phối hợp Prisma schema với Hoàng.
- TV2-02: API đăng ký/đăng nhập; băm mật khẩu bằng scrypt trong chế độ local.
- TV2-03: session, cookie HttpOnly, đăng xuất và từ chối phiên hết hạn.
- TV2-04: AuthGuard, giới hạn đăng nhập, validation/error response chung và adapter Supabase trong phạm vi hiện có.
- TV2-05: cấu hình PostgreSQL local, script khởi động, migration và CI; không sửa migration đã triển khai.
- TV2-06: unit tests xác thực; phối hợp Hoàng kiểm thử tích hợp backend và hỗ trợ Hùng tích hợp cookie/phiên.

### Phạm Minh Hoàng

- TV3-01: tạo/xem workspace và membership Owner; phối hợp schema với Phú.
- TV3-02: cập nhật workspace với version để phát hiện xung đột.
- TV3-03: danh sách thành viên và policy Owner/Admin/Manager/Member/Viewer.
- TV3-04: tạo/nhận/thu hồi mã mời, kiểm tra email, hạn dùng và chỉ dùng một lần; bàn giao dữ liệu cho Hùng gửi email.
- TV3-05: đổi vai trò/xóa thành viên; giữ nguyên Owner và chặn tự nâng quyền.
- TV3-06: transaction, audit/outbox; unit tests policy và integration về quyền, truy cập chéo workspace, concurrency và rollback cùng Phú.

### Ranh giới phối hợp

- Hoàng phụ trách nghiệp vụ và mã mời; Hùng phụ trách gửi email, liên kết và giao diện; Phú bảo đảm người nhận có phiên đăng nhập hợp lệ.
- Phú và Hoàng phối hợp schema/migration và integration backend. Mỗi người kiểm thử phần mình; Hùng phụ trách chính E2E, cả nhóm cùng nghiệm thu.
- API/OpenAPI được cập nhật cùng thay đổi module; Hùng phối hợp hai người để giữ frontend khớp hợp đồng.

## Trình tự phối hợp trong SP1

1. Đầu sprint: thống nhất US01/US02, dữ liệu, response và quy tắc quyền; chọn đầu việc theo năng lực.
2. Phú triển khai xác thực/nền tảng, Hoàng triển khai workspace/phân quyền, Hùng triển khai giao diện/email theo hợp đồng chung rồi tích hợp API thật.
3. Mỗi người cập nhật tiến độ, khó khăn và kết quả kiểm tra hằng ngày. Các thay đổi contract phải báo cho hai người còn lại.
4. Review chéo trước khi ghép code. Một người phụ trách chính nhưng ít nhất một người khác phải hiểu và review module.
5. Cuối sprint: chạy toàn bộ kiểm tra, demo, đối chiếu tiêu chí và ghi retrospective.

Nhánh đề xuất: `feature/sp1-auth`, `feature/sp1-workspaces`, `feature/sp1-ui-integration`. Đây là quy ước để nhóm áp dụng; tài liệu không xác nhận đã có các nhánh hoặc commit của ba sinh viên.

## Tiêu chí nghiệm thu

| Mã | Nội dung cần kiểm chứng |
|---|---|
| AC01 | Đăng ký bằng tên tiếng Việt và email hợp lệ; email trùng trả lỗi |
| AC02 | Đăng nhập đúng thành công; sai mật khẩu không tạo phiên |
| AC03 | Tải lại trang giữ phiên; đăng xuất làm cookie cũ mất hiệu lực |
| AC04 | Tạo workspace lưu dữ liệu thật và tự gán Owner |
| AC05 | Chỉ xem được workspace đang là thành viên |
| AC06 | Owner/Admin quản trị theo phạm vi; Viewer/Member/Manager không sửa workspace hoặc mời thành viên trong SP1 |
| AC07 | Lời mời khớp email, có hạn, chỉ dùng một lần và có thể thu hồi |
| AC08 | Admin không tự nâng quyền hoặc quản lý Owner/Admin; Owner không bị xóa/hạ quyền |
| AC09 | Xóa thành viên làm mất quyền truy cập ngay ở yêu cầu kế tiếp |
| AC10 | Cập nhật workspace với version cũ trả 409; mutation lỗi rollback cả dữ liệu, audit và outbox |
| AC11 | Giao diện dùng được trên desktop/mobile; thông báo lỗi và quyền bị hạn chế rõ ràng |

## Chạy và kiểm tra

```powershell
pnpm install --frozen-lockfile
pnpm dev:sp1
```

Mở `http://localhost:3000`. Ctrl+C dừng ứng dụng. Database lưu ở `.local/development`, dữ liệu vẫn còn khi chạy lại. Hướng dẫn đầy đủ nằm trong README ở thư mục dự án.

Các lệnh kiểm tra:

```powershell
pnpm api:types
pnpm typecheck
pnpm lint
pnpm api:build
pnpm test
pnpm test:integration
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Integration tests dùng PostgreSQL thật riêng, không mock database. E2E gọi API thật từ Chromium và tạo hai phiên trình duyệt độc lập. CI đã được cấu hình; việc chạy trên GitHub cần repository và workflow được kích hoạt.

### Kết quả kiểm tra local ngày 02/11/2026

| Kiểm tra | Kết quả |
|---|---|
| TypeScript strict và API build | Đạt |
| ESLint, không cảnh báo | Đạt |
| Unit tests | 13/13 đạt ở lượt kiểm chứng trước khi push |
| Integration PostgreSQL thật | 26 ca con đạt; Node báo 27 test gồm test cha; có SMTP test server |
| Build web production | Đạt |
| Playwright Chromium | 3/3 đạt ở lượt kiểm chứng trước khi push |
| Kiểm tra desktop/mobile | Đã xem ảnh ở bản trước; E2E hiện tại kiểm tra viewport mobile 390px không tràn ngang |

Chưa xác minh trên GitHub Actions, Supabase cloud, Firefox hoặc WebKit. Các kết quả trên chỉ áp dụng cho bản local và phạm vi SP1.

Tổng hợp lần đưa SP1 lên GitHub và giới hạn kiểm chứng SMTP: `docs/progress/SP1.md`. Lịch 5 sprint/checkpoint tuần: `docs/agile-plan.md`.

## Kịch bản demo ngắn

1. Đăng ký tài khoản A với tên tiếng Việt; tạo workspace cho nhóm.
2. Cập nhật mô tả và tải lại trang để chứng minh dữ liệu được lưu.
3. Mời email B với vai trò Viewer; sao chép mã mời.
4. Đăng ký/đăng nhập B trong cửa sổ ẩn danh; dán mã và tham gia.
5. B xem thành viên nhưng không có nút quản trị. API cũng từ chối yêu cầu sửa trái phép.
6. A đổi vai trò B; B tải lại để thấy vai trò mới.
7. A xóa B; B không truy cập được workspace ở yêu cầu tiếp theo.
8. Đăng xuất A rồi tải lại; trang yêu cầu đăng nhập.

## Các giới hạn cần nêu đúng khi báo cáo

- Bản học tập chạy local auth và PostgreSQL thật; local auth không được phép chạy ở production.
- Đã có module gửi email SMTP do Hùng phụ trách. Chưa cấu hình SMTP thì chia sẻ mã thủ công; có code gửi thư không đồng nghĩa đã xác minh thư đến hộp thư thật.
- Adapter Supabase có trong source nhưng chưa được kiểm chứng với project thật. Cần đăng nhập lại khi access token Supabase hết hạn; chưa có refresh-token flow.
- Project, task, milestone, bình luận và thống kê không thuộc SP1. Giao diện `/prototype` chứa dữ liệu minh họa cho các sprint sau.
- Không gọi số lượng test pass là chứng nhận production hoặc bằng chứng toàn bộ bảo mật.
