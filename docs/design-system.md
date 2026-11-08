# Hệ thiết kế Orbit

Tài liệu này ghi lại các quyết định giao diện của SP1. Nguồn tham khảo là bộ UI UX Pro Max (truy vấn `SaaS team collaboration workspace dashboard productivity`, density 7, motion 2, variance 3). Kết quả của công cụ là gợi ý, nên các điểm khác gợi ý được ghi rõ lý do.

## Đã áp dụng từ công cụ

- Phong cách Minimalism & Swiss: phân cấp bằng chữ và khoảng trắng, hiệu ứng tối thiểu.
- Font Be Vietnam Pro cho toàn bộ giao diện SP1 (cặp "Vietnamese Friendly").
- Tương phản chữ tối thiểu 4.5:1, viền điều khiển tối thiểu 3:1, focus nhìn thấy được, tôn trọng `prefers-reduced-motion`.
- Vùng bấm tối thiểu 44 px, chữ tối thiểu 12 px, nhãn hiển thị cố định thay vì chỉ dùng placeholder.
- Xác nhận trước thao tác không hoàn tác được, lỗi đặt gần trường liên quan, skip link, không có cuộn ngang ở 320/390/820/1280 px.

## Khác với gợi ý của công cụ

| Công cụ gợi ý | Dự án dùng | Lý do |
|---|---|---|
| Màu teal `#0D9488`, nền `#F0FDFA` | Giữ tím của Orbit (`#5B3FD0`) | Tím là nhận diện sẵn có, xuất hiện cả ở `/prototype`. Đổi màu chỉ cần sửa token ở đầu `orbit.css`. |
| Plus Jakarta Sans | Be Vietnam Pro | Cả hai có tiếng Việt, nhưng Be Vietnam Pro được thiết kế cho tiếng Việt và cũng do công cụ gợi ý khi tra `vietnamese`. |
| Mẫu landing page, GSAP scroll reveal | Không dùng | Đây là màn hình ứng dụng, không phải trang giới thiệu. Không thêm thư viện chuyển động. |

## Token

Token nằm ở đầu `apps/web/app/orbit.css`, gồm hai bộ sáng và tối (`.orbit-dark`). Thành phần chỉ dùng token, không dùng mã màu trực tiếp; ngoại lệ là panel giới thiệu ở trang đăng nhập, giữ một màu ở cả hai chế độ.

| Vai trò | Sáng | Tối |
|---|---|---|
| Nền / bề mặt | `#EEEEF5` / `#FFFFFF` | `#100F17` / `#1E1C29` |
| Chữ / chữ phụ | `#15132A` / `#4C4962` | `#F7F5FF` / `#C6C1D9` |
| Nhấn / chữ trên nhấn | `#5B3FD0` / `#FFFFFF` | `#B5A0FF` / `#1A1235` |
| Nguy hiểm, quá hạn | `#A81F38` | `#FF9DB0` |
| Cảnh báo, đến hạn hôm nay | `#8A4B00` | `#FFCF8A` |
| Thành công | `#17693F` | `#8FE3B8` |

Cỡ chữ: 28 tiêu đề trang, 18 tiêu đề khối, 15 nội dung, 14 điều khiển, 13 chú thích, 16 trong ô nhập để iOS không tự phóng to. Không dùng nhãn viết hoa giãn chữ vì dấu tiếng Việt khó đọc ở dạng này.

## Cấu trúc điều hướng

Từ SP2, mỗi việc có một trang riêng thay vì gom vào một trang dài. Mỗi trang có địa chỉ riêng nên nút Back, tải lại và chia sẻ liên kết đều hoạt động.

| Trang | Dùng để |
|---|---|
| Tổng quan | Xem việc của mình theo hạn, các bước bắt đầu với nhóm mới |
| Dự án | Xem và tạo dự án; mở một dự án để thêm và giao nhiệm vụ |
| Thành viên | Xem người trong nhóm, mời, đổi vai trò, thu hồi lời mời |
| Cài đặt | Thông tin không gian, quyền của mình, nhật ký hoạt động |

Danh sách dùng hàng kẻ mảnh thay vì thẻ để quét nhanh. Thao tác phụ nằm trong hộp thoại, chi tiết nhiệm vụ mở ở ngăn bên phải. Trên điện thoại, điều hướng chuyển xuống thanh dưới cùng.

## Phân biệt nội dung

- Tên việc đậm và dùng màu chữ chính; thông tin phụ như tên dự án dùng chữ phụ nhỏ hơn, tỷ lệ tương phản vẫn từ 7:1.
- Mã nhiệm vụ nằm trong nhãn xám riêng để không lẫn với tên việc.
- Danh sách đặt trên nền trắng tách khỏi nền trang; ô thêm nhiệm vụ có nền tím nhạt.
- Hạn có màu theo mức khẩn: đỏ là quá hạn, cam là hôm nay, tím là 7 ngày tới. Luôn kèm chữ hoặc ngày, không chỉ dựa vào màu.
- Mục menu đang mở dùng nền tím đậm.
