# Orbit Workspace SP1

SP1 triển khai US01 và US02: đăng ký, đăng nhập, đăng xuất, phân quyền, tạo/cập nhật không gian làm việc, mời và quản lý thành viên. Giao diện và API dùng dữ liệu PostgreSQL được lưu trên đĩa.

## Chạy bản học tập

Yêu cầu Node.js 24 và pnpm 11.25.0. Từ thư mục dự án:

```powershell
pnpm install --frozen-lockfile
pnpm dev:sp1
```

Mở `http://localhost:3000`. Lệnh trên tự khởi tạo PostgreSQL cục bộ tại `127.0.0.1:55432`, generate Prisma Client, áp dụng migration, khởi động NestJS tại cổng 4000 và Next.js tại cổng 3000. Ctrl+C dừng các tiến trình của phiên chạy. Nếu cổng đã được sử dụng, dừng phiên Orbit cũ trước khi chạy lại.

Database UTF-8 được lưu dưới `.local/development`. Thông tin kết nối local được tạo ngẫu nhiên trong `runtime.json` và bị loại khỏi Git. Không xóa `.local` nếu muốn giữ dữ liệu. Không cần Docker hay tài khoản Supabase cho chế độ học tập.

Lần đầu mở trang, đăng ký tài khoản mới rồi tạo workspace. Để demo thành viên, tạo tài khoản thứ hai ở cửa sổ ẩn danh. Người quản lý tạo lời mời theo email và gửi mã thủ công; tài khoản nhận lời mời đăng nhập rồi dán mã để tham gia. SP1 chưa gửi email tự động.

## Phân chia cho ba thành viên

| Người phụ trách | Phạm vi | Module chính |
|---|---|---|
| Thành viên 1 | Đăng ký/đăng nhập/đăng xuất, phiên đăng nhập, AuthGuard và dữ liệu xác thực | `apps/api/src/auth`, `apps/api/src/database`, Prisma schema |
| Thành viên 2 | Workspace, thành viên, lời mời, chính sách quyền, audit và outbox | `apps/api/src/workspaces` |
| Thành viên 3 | Giao diện SP1, nối API, database local, kiểm thử tích hợp/E2E và CI | `apps/web/app`, `scripts`, `tests`, `.github/workflows` |

Bảng phân công, các đầu việc và kịch bản nghiệm thu có trong `outputs/SP1_PhanCong_Va_NghiemThu.md`. Thay nhãn thành viên bằng tên thật khi đưa vào báo cáo. Đây là phân công module, không phải lịch sử đóng góp/commit của ba sinh viên.

## Kiểm tra

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

- Unit tests: domain, password hashing và RBAC policies.
- Integration tests: dùng PostgreSQL thật trong cluster riêng cổng 55433, áp dụng migration từ database rỗng, gọi API thật. Bao gồm cross-workspace denial, session expiry/logout, role escalation, lời mời, concurrency và rollback khi outbox thất bại.
- Playwright: tự khởi động ứng dụng tại cổng 3100/4100, dùng PostgreSQL local cổng 55432, thao tác trình duyệt thật cho Owner và Viewer. Không chạy cùng lúc với một phiên development đang chiếm database local.
- CI: `.github/workflows/ci.yml`. Workflow chưa được chạy trên GitHub trong phiên triển khai local.

Test database được giữ dưới `.local/test-*` để điều tra khi thất bại. Test không xóa dữ liệu development. E2E tạo các tài khoản có hậu tố ngẫu nhiên và để lại dữ liệu demo trong database development.

## API SP1

Prefix `http://localhost:4000/api/v1`. Cookie `orbit_session` là HttpOnly, SameSite=Lax và được gửi với `credentials: include`. Web/API phải dùng cùng hostname `localhost` trong bản local.

| Nhóm | Endpoint |
|---|---|
| Identity | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /me` |
| Workspace | `GET /workspaces`, `POST /workspaces`, `GET /workspaces/:id`, `PATCH /workspaces/:id` |
| Members | `GET /workspaces/:id/members`, `PATCH /workspaces/:id/members/:memberId`, `DELETE /workspaces/:id/members/:memberId` |
| Invitations | `GET /workspaces/:id/invitations`, `POST /workspaces/:id/invitations`, `DELETE /workspaces/:id/invitations/:invitationId`, `POST /invitations/accept` |
| Audit | `GET /workspaces/:id/audit` |

OpenAPI nằm trong `packages/contracts/openapi.yaml`; các kiểu frontend được sinh vào `api.generated.ts` bằng `pnpm api:types`. Các task API mẫu cũ đã được gỡ khỏi SP1; chức năng dự án/nhiệm vụ thuộc SP2.

## Quyền và tính nhất quán

- Mọi API workspace xác thực phiên và đọc membership hiện tại từ database. Header `x-user-role`/`x-user-id` không tạo được quyền.
- Owner/Admin quản trị workspace. Manager/Member/Viewer xem workspace và thành viên trong SP1. Quyền nhiệm vụ sẽ được bổ sung ở SP2.
- Owner không bị xóa/hạ quyền trong SP1. Admin không quản lý Owner/Admin. Không được tự sửa quyền hoặc tự xóa membership.
- Lời mời có hạn 7 ngày, email phải khớp, mã chỉ dùng một lần và database chỉ lưu hash của mã.
- Workspace update kiểm tra `version` trong điều kiện cập nhật; xung đột trả 409. Mutation khóa workspace, kiểm tra quyền và ghi audit/outbox trong cùng transaction.
- Đăng nhập giới hạn 30 lần/phút theo IP và 10 lần/phút theo email, đếm trong bảng `AuthAttempt` nên vẫn giữ sau khi khởi động lại API. Khóa được băm, không lưu IP hay email gốc. Phiên hết hạn được dọn mỗi lần đăng nhập.
- Các bảng bật RLS không có policy cho client; trình duyệt làm việc qua NestJS. Prisma cần kết nối trusted table-owner/BYPASSRLS. Không cấp quyền database này cho client.

## Chế độ Supabase

Adapter Supabase đã có trong code. Để sử dụng với PostgreSQL/Supabase đã được chuẩn bị, thiết lập biến môi trường cho API (không đưa khóa thật vào Git):

```powershell
$env:DATABASE_URL="<trusted PostgreSQL connection string>"
$env:AUTH_MODE="supabase"
$env:SUPABASE_URL="<project URL>"
$env:SUPABASE_ANON_KEY="<publishable/anon key>"
$env:SESSION_ENCRYPTION_KEY="<32 byte ngẫu nhiên dạng base64>"
$env:WEB_ORIGIN="http://localhost:3000"
pnpm db:generate
pnpm db:migrate
pnpm api:dev
```

Chạy `pnpm dev` ở terminal khác cho web. File `.env.example` là mẫu tham khảo; các lệnh API hiện đọc biến môi trường của tiến trình. Lệnh `dev:sp1` luôn chọn local auth và database local.

Provider token được mã hóa AES-256-GCM trước khi lưu vào bảng `Session`. Đổi `SESSION_ENCRYPTION_KEY` hoặc nâng cấp từ bản cũ sẽ làm các phiên Supabase đang mở hết hiệu lực và người dùng cần đăng nhập lại.

Supabase session hiện hết hạn theo access token và cần đăng nhập lại; chưa có refresh-token flow. Supabase Auth chưa được kiểm thử end-to-end do chưa có project/credentials. Local auth dùng scrypt và session thật để học tập, bị chặn khi `NODE_ENV=production`. Bản public cần triển khai web/API cùng site hoặc reverse proxy `/api/v1` để cookie hoạt động đúng.

## Giao diện

Quyết định về màu, font và khả năng tiếp cận nằm trong `docs/design-system.md`. Font Be Vietnam Pro tải từ Google Fonts; khi không có mạng, giao diện dùng font hệ thống.

## Giao diện mẫu cũ

`/prototype` giữ giao diện nhiệm vụ và dashboard cũ để tham khảo SP2 trở đi. Dữ liệu, hoạt động và các con số trên trang này là minh họa, được ghi nhãn trên giao diện.
