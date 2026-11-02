# Kế hoạch Agile/Scrum — Orbit Workspace

## 1. Kết luận về phương pháp

Kế hoạch hiện tại **đã theo tư duy Agile** ở các điểm: chia theo vertical slice, ưu tiên MVP, phản hồi sớm, kiểm thử liên tục và cho phép điều chỉnh phạm vi. Tuy nhiên, để gọi là kế hoạch Scrum rõ ràng cần bổ sung:

- Product Backlog có thứ tự ưu tiên và tiêu chí chấp nhận.
- Sprint cố định một tuần, Sprint Goal và Sprint Backlog.
- Review cuối tuần với phần mềm chạy được.
- Retrospective cuối tuần để điều chỉnh cách làm.
- Definition of Ready và Definition of Done.
- Không đổi Sprint Goal giữa tuần; thay đổi mới đưa vào backlog tuần sau.

Ảnh tham khảo về 4 giá trị, 12 nguyên tắc Agile và Scrum được dùng như cơ sở phương pháp luận; đây không phải là yêu cầu giao diện hay nội dung phải sao chép vào phần mềm.

## 2. Nhịp làm việc mỗi Sprint

Mỗi Sprint kéo dài 7 ngày, từ thứ Ba đến thứ Hai. Ngày thứ Ba bắt đầu Sprint mới; ngày thứ Hai review và retrospective. Người dùng/giảng viên có thể tham gia review hoặc phản hồi backlog.

```text
Thứ Ba     Sprint planning, chốt Sprint Goal và task
Thứ Tư–CN  Phân tích, thiết kế, code, test và cập nhật board
Thứ Hai    Demo/review, đo acceptance criteria, retrospective
Hằng ngày  Stand-up 10–15 phút: đã làm, sẽ làm, blocker
```

### Definition of Ready

Một task chỉ được kéo vào Sprint khi có actor, mô tả hành vi, acceptance criteria, dependency và cách kiểm thử.

### Definition of Done

Task chỉ được đánh dấu Done khi code hoàn chỉnh, typecheck pass, test phù hợp pass, có xử lý lỗi/loading/permission, được review và cập nhật tài liệu cần thiết.

## 3. Lịch triển khai chính thức

| Sprint | Thời gian | Sprint Goal | Công việc nhỏ phải hoàn thành | Đầu ra/tiêu chí nghiệm thu |
|---|---|---|---|---|
| 1 | 13/10–19/10 | Chốt sản phẩm và dựng nền tảng | Product backlog; personas/use cases; ERD sơ bộ; monorepo; env example; CI; design tokens; dashboard shell | Chạy được web/API skeleton; backlog có thứ tự; team giải thích được kiến trúc |
| 2 | 20/10–26/10 | Identity và database foundation | Prisma schema; migration; seed; Supabase Auth contract; profile/session; route protection; error format | Schema validate/generate; login flow được mô tả và route protected từ chối user chưa đăng nhập |
| 3 | 27/10–02/11 | Workspace và RBAC | Workspace CRUD; member list; invitation; role matrix; auth guard; membership policy; cross-workspace tests | Owner/Admin/Manager/Member/Viewer hoạt động đúng; Viewer không mutate; không có IDOR trong test |
| 4 | 03/11–09/11 | Project và task core | Project CRUD; status; priority; labels; assignee; task key; subtask một cấp; task detail drawer | Tạo/sửa task trong project; task luôn thuộc workspace hợp lệ; acceptance tests pass |
| 5 | 10/11–16/11 | Ba view từ một Task dataset | List; Kanban; Calendar; filter/sort; shared query model; position ranking; `moveTask`; version conflict | Cùng task xuất hiện nhất quán ở List/Kanban/Calendar; move trả `409` nếu version cũ |
| 6 | 17/11–23/11 | Collaboration và audit | Comment; private attachment metadata; activity feed; audit event; transaction boundary; progress calculation | Comment/file/activity hiển thị đúng quyền; mutation quan trọng có audit; progress tính ở server |
| 7 | 24/11–30/11 | Dashboard và báo cáo MVP | Project summary; status/overdue report; project health; empty/loading/error states; responsive core screens | Dashboard phản ánh task thật; report lọc được; mobile layout dùng được |
| 8 | 01/12–07/12 | Hardening và kiểm thử | Unit tests domain; integration tests với DB test; security-negative tests; keyboard/focus; reduced motion; rate limit/logging | CI pass lint/typecheck/unit/integration; viewer/cross-workspace/private-file cases bị chặn |
| 9 | 08/12–14/12 | Tính năng nổi bật có kiểm soát | Chọn tối đa 2: Timeline cơ bản, time tracking, realtime, notification inbox, docs hoặc search | Hai tính năng được chọn có acceptance criteria, test và demo; không mở thêm scope ngoài Sprint |
| 10 | 15/12–21/12 | Đóng băng bản dự án | Regression; seed demo; API/OpenAPI; ERD/sequence/architecture diagrams; deployment; performance/accessibility smoke test; demo script | Bản dự án hoàn chỉnh chạy được; critical flow từ signup đến report không dùng mock UI thay backend |
| Release gate | 22/12 | Nghiệm thu và khóa phạm vi | Chạy lại acceptance checklist; chốt release candidate; tag phiên bản; sao lưu seed/demo; ghi danh sách blocker còn lại | Kết thúc phát triển chính thức; mọi thay đổi sau ngày này chỉ là nâng cấp/polish phục vụ báo cáo |
| Upgrade | 23/12–29/12 | Nâng cấp cuối cùng và chuẩn bị báo cáo | Sửa blocker từ Sprint 10; polish UI; tối ưu lỗi hiệu năng; hoàn thiện báo cáo/slides; quay demo; rehearsal phản biện | Release candidate đóng băng; báo cáo, slide, demo dataset và câu trả lời phản biện sẵn sàng |

## 4. Product Backlog ưu tiên

### Must have trước 22/12

1. Auth/profile/session.
2. Workspace/member/RBAC.
3. Project/task/subtask/status/priority/assignee/label.
4. List/Kanban/Calendar từ cùng Task model.
5. Comment, attachment metadata, activity/audit.
6. Progress, dashboard và status/overdue report.
7. Responsive, dark/light, accessibility cơ bản.
8. Unit, integration và security-negative tests.

### Có thể làm trong Sprint 9

Chọn tối đa hai tính năng: Timeline, time tracking, realtime, notification inbox, project docs hoặc global search.

### Không đưa vào scope chính

Automation engine, recurring task, custom fields, integrations, AI assistant, critical path và multi-region production infrastructure.

## 5. Cách đánh giá mỗi tuần

Cuối Sprint ghi lại:

- Sprint Goal: đạt/không đạt và lý do.
- Số story/task committed và completed.
- Acceptance criteria pass/fail.
- Bug còn mở theo mức độ.
- Test/build/typecheck status.
- Một điều nên tiếp tục, một điều nên dừng, một điều cần thử Sprint sau.

Không dùng phần trăm tiến độ cảm tính làm bằng chứng hoàn thành. Chỉ tính task đã qua Definition of Done; các con số dashboard demo phải được đánh dấu là dữ liệu seed nếu chưa kết nối database thật.

## 6. Quy tắc thay đổi phạm vi

- Bug bảo mật, lỗi build và lỗi chặn critical flow được ưu tiên ngay.
- Yêu cầu mới không làm hỏng Sprint Goal được ghi vào Product Backlog.
- Mỗi Sprint chỉ nhận thêm scope khi bỏ ra một task có effort tương đương.
- Sau ngày 22/12 chỉ sửa blocker, polish và chuẩn bị báo cáo; không mở module lớn mới.
