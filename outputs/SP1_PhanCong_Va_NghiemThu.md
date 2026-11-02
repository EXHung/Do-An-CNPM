# SP1 Đăng nhập phân quyền và không gian làm việc

## Mục tiêu và phạm vi

Hoàn thiện US01 và US02 của đồ án Orbit Workspace: người dùng đăng ký, đăng nhập, đăng xuất; tạo không gian, cập nhật thông tin và quản lý thành viên theo quyền. SP1 là nền tảng cho dự án và nhiệm vụ ở SP2.

## Phân công nhóm ba thành viên

Các nhãn dưới đây dùng để phân chia trách nhiệm. Điền tên thật khi đưa vào báo cáo và ghi nhận đóng góp thực tế bằng commit/task đã hoàn thành.

| Người phụ trách | Công việc | Sản phẩm bàn giao | Phối hợp và review |
|---|---|---|---|
| Thành viên 1 | Xác thực và dữ liệu | API đăng ký/đăng nhập/đăng xuất; kiểm tra phiên; AuthGuard; Prisma schema và cấu trúc dữ liệu người dùng | Thống nhất AuthUser với TV2; thống nhất response/cookie với TV3; review bảo mật với TV2 |
| Thành viên 2 | Không gian và thành viên | API workspace, danh sách thành viên, lời mời, đổi vai trò, xóa thành viên; policy; audit và outbox | Dùng AuthGuard/Prisma của TV1; bàn giao API cho TV3; review quy tắc quyền với TV1 |
| Thành viên 3 | Giao diện và tích hợp | Trang đăng nhập/đăng ký, workspace và thành viên; nối API; PostgreSQL local; integration/E2E và CI | Tích hợp response của TV1/TV2; báo lỗi từ E2E; chuẩn bị demo chung |

## Đầu việc theo người phụ trách

### Thành viên 1

- TV1-01: xác định dữ liệu tài khoản, phiên và hợp đồng API.
- TV1-02: triển khai đăng ký và đăng nhập; băm mật khẩu bằng scrypt trong chế độ local.
- TV1-03: lưu hash session token; cookie HttpOnly; đăng xuất thu hồi phiên.
- TV1-04: triển khai AuthGuard và error response chung.
- TV1-05: hỗ trợ adapter Supabase và kiểm tra cấu hình.
- TV1-06: kiểm thử password hashing, phiên sai/hết hạn và đăng xuất.

### Thành viên 2

- TV2-01: tạo workspace kèm membership Owner; xem danh sách và chi tiết.
- TV2-02: cập nhật workspace với version để phát hiện xung đột.
- TV2-03: xem thành viên; kiểm tra quyền Owner/Admin/Manager/Member/Viewer.
- TV2-04: tạo, chấp nhận và thu hồi lời mời có hạn dùng, đúng email và chỉ dùng một lần.
- TV2-05: đổi vai trò/xóa thành viên; giữ nguyên Owner và chặn tự nâng quyền.
- TV2-06: ghi audit/outbox cùng transaction; kiểm thử policy và truy cập chéo workspace.

### Thành viên 3

- TV3-01: xây dựng giao diện đăng ký/đăng nhập và thông báo lỗi.
- TV3-02: giao diện tạo/chọn/cập nhật workspace.
- TV3-03: giao diện mời, nhận lời mời, danh sách và quản lý thành viên.
- TV3-04: giao diện theo quyền, desktop/mobile và dark/light.
- TV3-05: một lệnh khởi động PostgreSQL, migration, API và web.
- TV3-06: nối kiểu dữ liệu từ OpenAPI, chạy integration/E2E và chuẩn bị demo.

## Trình tự phối hợp trong SP1

1. Đầu sprint: thống nhất US01/US02, dữ liệu, response và quy tắc quyền; chọn đầu việc theo năng lực.
2. TV1 và TV2 xây dựng module; TV3 phát triển giao diện theo hợp đồng chung rồi tích hợp API thật.
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
| Unit tests | 10/10 đạt |
| Integration PostgreSQL thật | 23 ca con đạt; Node báo 24 test gồm test cha |
| Build web production | Đạt |
| Playwright Chromium | 2/2 đạt |
| Kiểm tra ảnh desktop/mobile | Đã xem; viewport mobile 390px không tràn ngang |

Chưa xác minh trên GitHub Actions, Supabase cloud, Firefox hoặc WebKit. Các kết quả trên chỉ áp dụng cho bản local và phạm vi SP1.

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
- Lời mời được gửi bằng mã thủ công. Chưa tích hợp dịch vụ email.
- Adapter Supabase có trong source nhưng chưa được kiểm chứng với project thật. Cần đăng nhập lại khi access token Supabase hết hạn; chưa có refresh-token flow.
- Project, task, milestone, bình luận và thống kê không thuộc SP1. Giao diện `/prototype` chứa dữ liệu minh họa cho các sprint sau.
- Không gọi số lượng test pass là chứng nhận production hoặc bằng chứng toàn bộ bảo mật.
