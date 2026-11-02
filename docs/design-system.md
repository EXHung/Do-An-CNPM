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
| Màu teal `#0D9488`, nền `#F0FDFA` | Giữ tím của Orbit (`#5B3FD0`) | Tím là nhận diện sẵn có, xuất hiện cả ở `/prototype`. Đổi màu chỉ cần sửa token ở đầu `sp1.css`. |
| Plus Jakarta Sans | Be Vietnam Pro | Cả hai có tiếng Việt, nhưng Be Vietnam Pro được thiết kế cho tiếng Việt và cũng do công cụ gợi ý khi tra `vietnamese`. |
| Mẫu landing page, GSAP scroll reveal | Không dùng | Đây là màn hình ứng dụng, không phải trang giới thiệu. Không thêm thư viện chuyển động. |

## Token

Token nằm ở đầu `apps/web/app/sp1.css`, gồm hai bộ sáng và tối (`.sp1-dark`). Thành phần chỉ dùng token, không dùng mã màu trực tiếp; ngoại lệ là panel giới thiệu ở trang đăng nhập, giữ một màu ở cả hai chế độ.

| Vai trò | Sáng | Tối |
|---|---|---|
| Nền / bề mặt | `#F6F6FA` / `#FFFFFF` | `#14131C` / `#1E1C29` |
| Chữ / chữ phụ | `#1F1D2E` / `#5F5C72` | `#F2F0FA` / `#B4AFC8` |
| Nhấn / chữ trên nhấn | `#5B3FD0` / `#FFFFFF` | `#B5A0FF` / `#1A1235` |
| Nguy hiểm | `#B3263F` | `#FF9DB0` |
| Thành công | `#1F7A4D` | `#8FE3B8` |

Cỡ chữ: 28 tiêu đề trang, 18 tiêu đề khối, 15 nội dung, 14 điều khiển, 13 chú thích, 16 trong ô nhập để iOS không tự phóng to. Không dùng nhãn viết hoa giãn chữ vì dấu tiếng Việt khó đọc ở dạng này.
