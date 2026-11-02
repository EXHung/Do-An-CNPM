# Quy trình thực hiện đồ án Orbit Workspace

## 1. Mục đích

Tài liệu này quy định cách nhóm phân tích, thiết kế, xây dựng, kiểm thử và chuẩn bị bảo vệ cho **Orbit Workspace** — nền tảng quản lý dự án và công việc có workspace, project, task, nhiều view và phân quyền.

Mục tiêu không phải hoàn thành thật nhiều màn hình, mà tạo được một vertical slice có thể chứng minh đầy đủ:

```text
Yêu cầu → Use case → UI → API → Authentication → Authorization
→ Validation → Transaction → Database → Audit → Test → Demo
```

## 2. Phương pháp làm việc

Áp dụng **Agile theo 5 sprint của học phần, có checkpoint mỗi tuần**, phù hợp nhóm ba người:

- Product Backlog: toàn bộ yêu cầu, được sắp xếp theo giá trị và rủi ro.
- Sprint Backlog: các task cam kết trong sprint, phân bổ checkpoint theo tuần.
- Increment: phần mềm chạy được sau mỗi Sprint.
- Review: trình diễn trực tiếp chức năng đã hoàn thành cuối sprint; cập nhật ngắn mỗi tuần.
- Retrospective: đánh giá cách làm và điều chỉnh sprint sau. Lịch sprint có độ dài khác nhau nên không coi đây là Scrum với timebox đồng nhất.
- Không coi tài liệu, mockup hoặc code chưa test là sản phẩm hoàn thành.

Lịch chi tiết và ngày cụ thể nằm trong [`agile-plan.md`](agile-plan.md).

## 3. Quy trình từ yêu cầu đến task code

### Bước 1 — Ghi nhận yêu cầu

Mỗi yêu cầu cần trả lời:

- Ai sử dụng?
- Người dùng muốn đạt mục tiêu gì?
- Điều kiện trước khi thực hiện là gì?
- Kết quả thành công là gì?
- Trường hợp lỗi hoặc bị từ chối là gì?
- Dữ liệu nào thay đổi?
- Có cần audit, notification hoặc realtime event không?

Mẫu user story:

```text
Là một [vai trò], tôi muốn [hành động], để [giá trị].
```

Ví dụ:

```text
Là Project Manager, tôi muốn kéo task sang trạng thái Review,
để cập nhật tiến độ cho cả nhóm.
```

### Bước 2 — Phân tích use case

Mỗi use case phải có:

```text
Tên
Actor
Preconditions
Main flow
Alternative/error flows
Authorization rule
Database effects
Events/audit
Acceptance criteria
Test cases
```

### Bước 3 — Thiết kế trước khi code

Với feature liên quan nhiều module, tạo hoặc cập nhật:

- Sequence diagram.
- Data model/ERD.
- API contract.
- Permission matrix.
- UI state: loading, empty, error, success, forbidden, conflict.
- Test plan.

Không bắt đầu bằng việc tạo component hoặc controller nếu chưa biết dữ liệu và quy tắc quyền.

### Bước 4 — Chia thành task nhỏ

Một task tốt nên hoàn thành trong 0,5–1,5 ngày và có một kết quả kiểm chứng được.

Ví dụ `Move task` được chia thành:

1. Định nghĩa request/response và lỗi `409`.
2. Kiểm tra membership workspace.
3. Kiểm tra quyền `task.write`.
4. Tính position mới.
5. Cập nhật task với `version` trong transaction.
6. Ghi activity/audit.
7. Viết unit/integration test.
8. Nối UI optimistic update và rollback.

### Bước 5 — Implement theo thứ tự

```text
Contract → Domain rule → Repository/database → API → UI state → UI polish → Test
```

Controller không chứa nghiệp vụ. Frontend không tự quyết định quyền. Database là source of truth.

### Bước 6 — Kiểm thử và review

Mỗi task phải được kiểm tra ở mức phù hợp:

- Unit: hàm thuần, RBAC, progress, ranking, cycle detection.
- Integration: API + database + transaction + authorization.
- E2E: critical user flow trên trình duyệt.
- Negative security: cross-workspace, viewer mutation, stale version, private file.

## 4. Nhịp làm việc trong một tuần

### Ngày bắt đầu Sprint

- Review backlog và blocker.
- Chọn Sprint Goal.
- Chọn task theo capacity thực tế.
- Xác định acceptance criteria và demo scenario.

### Trong Sprint

Mỗi ngày cập nhật ngắn:

```text
Đã hoàn thành gì?
Tiếp theo làm gì?
Đang bị chặn bởi điều gì?
```

Chỉ đưa task đã có đủ thông tin vào trạng thái Ready. Nếu phát sinh yêu cầu mới, đưa vào backlog trừ khi đó là lỗi bảo mật hoặc lỗi chặn critical flow.

### Cuối Sprint

- Chạy test/typecheck/build.
- Demo phần mềm chạy thật.
- Đối chiếu acceptance criteria.
- Ghi bug còn lại.
- Retrospective: Continue / Stop / Try.
- Cập nhật backlog và rủi ro cho Sprint sau.

## 5. Definition of Ready và Definition of Done

### Definition of Ready

- Có actor và mục tiêu.
- Có acceptance criteria.
- Biết module/dữ liệu/API bị ảnh hưởng.
- Đã xác định permission và các lỗi chính.
- Có dependency hoặc đã ghi rõ không có dependency.

### Definition of Done

- Code TypeScript strict, không bỏ qua lỗi.
- Server-side authorization đã kiểm tra.
- Entity được scope theo workspace.
- Validation và error response đã có.
- Transaction/version/audit được xử lý nếu feature cần.
- Test phù hợp pass.
- UI có loading, empty, error và forbidden state.
- Không log secret/token/password.
- README hoặc tài liệu liên quan đã cập nhật.

## 6. Quản lý rủi ro

| Rủi ro | Dấu hiệu sớm | Cách xử lý |
|---|---|---|
| Scope phình to | Mở thêm module trước khi MVP chạy | Khóa MVP; đưa vào backlog mở rộng |
| UI tách rời backend | Dùng mock JSON quá lâu | Xây vertical slice; nối API sớm |
| Sai quyền | Chỉ ẩn nút ở frontend | Viết negative test và policy server-side |
| Xung đột dữ liệu | Hai người cùng sửa/kéo task | Dùng `version`, trả `409`, refetch |
| Chậm tiến độ | Sprint không có increment chạy được | Giảm scope, giữ critical flow |
| Không giải thích được code | Dựa hoàn toàn vào generated code | Ghi quyết định kiến trúc và review từng transaction |

## 7. Quy trình dùng GPT/Codex trong đồ án

1. Đưa cho GPT mục tiêu, file liên quan và acceptance criteria.
2. Yêu cầu GPT phân tích trước khi sửa.
3. Chỉ giao một task bounded mỗi lần.
4. Yêu cầu nêu file thay đổi, rủi ro và lệnh kiểm tra.
5. Review diff, đặc biệt auth, migration, transaction và permission.
6. Chạy test/typecheck/build.
7. Ghi lại quyết định quan trọng vào tài liệu.

Không dùng prompt kiểu “build toàn bộ hệ thống giống Notion”. Hãy dùng prompt theo use case và module.

