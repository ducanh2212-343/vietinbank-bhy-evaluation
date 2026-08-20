# Trao đổi cho thẻ dấu ấn BHY Mark — «tương tự Kanban»

*Giám đốc yêu cầu sáng 06/08, kèm ảnh một thẻ dấu ấn chỉ có nhật ký máy.*

## Trước / sau

Thẻ dấu ấn trên `/dau-an` có «Dòng thời gian» nhưng chỉ là **nhật ký máy** đọc
một chiều (tạo thẻ, chuyển trạng thái, cập nhật tiến độ) — không có chỗ hỏi
đáp. Muốn góp ý một dấu ấn phải gọi điện hoặc nhắn ngoài hệ thống, và cuộc trao
đổi đó không để lại vết nào cạnh chính cái dấu ấn đang bàn.

Nay nút **«Dòng thời gian & trao đổi»** mở đúng mạch trộn của Kanban
(`Ct2DongThoiGian` dùng nguyên xi): nhật ký máy thành các dòng 📊 Báo cáo
(người thao tác ghi đúng tên, vướng mắc/kết quả/bằng chứng thành nhãn màu, link
bằng chứng bấm được), cộng cửa 💬 Trao đổi đầy đủ: nhắc đích danh, «Cần trả
lời» quá 24h nhắc lại, thu hồi, lọc Tất cả/Báo cáo/Trao đổi. Nút hiện cả khi
thẻ chưa có log — để trao đổi được ngay từ ngày giao khung.

## Cách làm — một mạch, không phải mạch thứ tư

Không dựng bảng bình luận riêng cho Mark: thêm phạm vi `DAU_AN` vào đúng bảng
`ct2_binh_luan` đang phục vụ ba bàn kia. Bốn mạch riêng là bốn chỗ sửa luật mỗi
lần đổi — ba tháng sau chúng lệch nhau.

- **Ai xem/viết**: cùng luật thẻ upskill — chủ dấu ấn, hoặc người trong tầm
  nhìn của chủ (lãnh đạo tuyến, BGĐ, quản trị). Một nhánh mới trong
  `ct2_xem_duoc_doi_tuong`, RLS tự ăn theo.
- **Thông báo**: trao đổi trên dấu ấn báo **đủ tuyến của chủ dấu ấn** — đúng
  chính sách «đủ tuyến bốn hệ» chốt sáng nay; bồi bằng chứng đã báo từ đợt
  trước.
- Migration `20260901090000`, đã áp production.

## Kiểm chứng (giả danh, có hoàn tác)

- Giám đốc mở được mạch dấu ấn của PGĐ ✅
- Giám đốc trao đổi → chủ dấu ấn nhận thông báo, người gửi tự-loại ✅
- Cán bộ thường **không** xem được mạch dấu ấn của PGĐ ✅
- 619 test qua, tsc sạch, build qua (6 lỗi lint `any` là của trang cũ, có từ trước).
