# Kế hoạch Agile — 5 sprint Orbit Workspace

## 1. Kết luận về phương pháp

Áp dụng Agile theo 5 sprint của học phần, có checkpoint mỗi tuần. Mỗi sprint tập trung vào một nhóm chức năng chạy được, kiểm thử liên tục và nhận phản hồi. Các sprint có độ dài khác nhau theo lịch bên dưới nên chưa phải Scrum với timebox đồng nhất. Bảng này thay lịch cũ chia 10 sprint.

- Product Backlog có thứ tự ưu tiên và tiêu chí chấp nhận.
- Sprint Goal và Sprint Backlog; phân bổ checkpoint theo tuần học.
- Checkpoint cuối tuần và review cuối sprint với phần mềm chạy được.
- Retrospective cuối sprint để điều chỉnh cách làm.
- Definition of Ready và Definition of Done.
- Thay đổi mới được đánh giá và đưa vào backlog; không tự mở rộng Sprint Goal.

Ảnh tham khảo về 4 giá trị, 12 nguyên tắc Agile và Scrum được dùng như cơ sở phương pháp luận; đây không phải là yêu cầu giao diện hay nội dung phải sao chép vào phần mềm.

## 2. Nhịp làm việc mỗi Sprint

Một tuần học kéo dài từ thứ Ba đến thứ Hai, là checkpoint trong sprint. Đầu sprint planning, mỗi tuần cập nhật tiến độ, cuối sprint review/retrospective. Người dùng/giảng viên có thể tham gia review hoặc phản hồi backlog.

```text
Thứ Ba     Planning nếu đầu sprint; chọn checkpoint nếu giữa sprint
Thứ Tư–CN  Phân tích, thiết kế, code, test và cập nhật board
Thứ Hai    Cập nhật/demo; review và retrospective nếu cuối sprint
Hằng ngày  Stand-up 10–15 phút: đã làm, sẽ làm, blocker
```

### Definition of Ready

Một task chỉ được kéo vào Sprint khi có actor, mô tả hành vi, acceptance criteria, dependency và cách kiểm thử.

### Definition of Done

Task chỉ được đánh dấu Done khi code hoàn chỉnh, typecheck pass, test phù hợp pass, có xử lý lỗi/loading/permission, được review và cập nhật tài liệu cần thiết.

## 3. Lịch dự kiến theo tuần và sprint

| Tuần | Thời gian 2026 | Sprint | Mục tiêu checkpoint | Nội dung push khi hoàn thành |
|---|---|---|---|---|
| 1 | 13/10–19/10 | SP1 | Phạm vi, thiết kế và nền tảng | Web/API skeleton, schema và cấu hình |
| 2 | 20/10–26/10 | SP1 | Tài khoản và phiên | Đăng ký/đăng nhập/đăng xuất, AuthGuard và kiểm thử |
| 3 | 27/10–02/11 | SP1 | Workspace, RBAC và tích hợp | Thành viên, mã mời, UI, kiểm thử quyền; email bổ sung |
| 4 | 03/11–09/11 | SP2 | Quản lý dự án | Project API/UI, owner, status/date và quyền |
| 5 | 10/11–16/11 | SP2 | Tạo và phân công nhiệm vụ | Task CRUD, assignee, hạn hoàn thành và tích hợp |
| 6 | 17/11–23/11 | SP3 | Chi tiết nhiệm vụ | Status, priority, labels và subtask một cấp |
| 7 | 24/11–30/11 | SP3 | Theo dõi nhiệm vụ | List/Kanban/Calendar, move/version/rollback |
| 8 | 01/12–07/12 | SP4 | Trao đổi và tìm thông tin | Comment, private attachment và task filter/search |
| 9 | 08/12–14/12 | SP4 | Tổng hợp tiến độ | Progress tính ở server, status/overdue report và kiểm thử |
| 10 | 15/12–21/12 | SP5 | Hoàn thiện, nghiệm thu tổng thể | Regression, responsive/accessibility, deployment, tài liệu/demo |
| Chốt | 22/12 | Release | Khóa phạm vi và bàn giao | Tag phiên bản được nghiệm thu, ghi blocker còn lại |
| Bổ sung | 23/12–29/12 | Sau SP5 | Nâng cấp cuối để báo cáo | Sửa blocker, polish, báo cáo, slide và demo |

Lần nhập SP1 lên GitHub được chuẩn bị ngày 02/11/2026. Bảng là kế hoạch phân bổ, không xác nhận đã push trong tuần 1/2; commit giữ ngày thực tế. SP2–SP5 chưa được xác nhận hoàn thành. Quy tắc GitHub nằm trong `github-workflow.md`; mẫu cập nhật tuần nằm trong `progress/README.md`.

Phân công SP1: Phạm Minh Hùng phụ trách UI/integration/email/E2E (35%); Nguyễn Hoàng Phú phụ trách auth/nền tảng/local/CI (30%); Phạm Minh Hoàng phụ trách workspace/RBAC/invite token/transaction (35%). Đây là tỷ trọng dự kiến, không xác nhận đóng góp lịch sử.

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

### Chỉ cân nhắc sau khi luồng chính ổn định

Timeline, time tracking, realtime, notification inbox, project docs hoặc global search là backlog mở rộng; không cam kết trong SP1 hoặc tự mở thêm ở tuần 9.

### Không đưa vào scope chính

Automation engine, recurring task, custom fields, integrations, AI assistant, critical path và multi-region production infrastructure.

## 5. Cách đánh giá mỗi tuần

Mỗi tuần ghi checkpoint; cuối sprint tổng hợp:

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
