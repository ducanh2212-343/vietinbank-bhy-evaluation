// 5 giá trị cốt lõi — MỘT nguồn duy nhất cho frontend, mirror bảng `core_values`
// (CV01…CV05) trong DB. Màn Login là pre-auth (anon đã bị revoke) nên không đọc DB;
// nếu đổi danh mục trong DB thì cập nhật cả đây.
export const CORE_VALUES = ['Chính trực', 'Trí tuệ', 'Tận tâm', 'Thấu cảm', 'Thích ứng'] as const;
