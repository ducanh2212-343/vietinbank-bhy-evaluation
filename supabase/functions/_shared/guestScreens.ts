// Bộ mã màn hình mở cho khách đối tác — bản dùng phía máy chủ.
// Phải trùng với src/lib/manHinhKhach.ts và ràng buộc CHECK
// guest_access_allowed_screens_hop_le của bảng guest_access.

export const GUEST_SCREENS = [
  "trang-chu",
  "tin-tuc",
  "sharing",
  "connect",
  "cay-ky-uc",
  "ghi-nhan",
  "credit-360",
  "ideas",
  "bhy-3806",
] as const;

export type GuestScreen = typeof GUEST_SCREENS[number];

/** Mặc định khi cấp tài khoản mới, cũng là bộ màn hình khách vẫn xem được trước nay. */
export const GUEST_SCREENS_DEFAULT: GuestScreen[] = ["trang-chu", "tin-tuc", "sharing", "connect"];

/** Trang chủ là cửa vào cổng — không tắt được. */
const REQUIRED: GuestScreen[] = ["trang-chu"];

/**
 * Lọc danh sách do người gọi gửi lên: bỏ mã lạ, khử trùng lặp, luôn kèm màn bắt
 * buộc, giữ đúng thứ tự danh mục. Gửi lên danh sách rỗng/không gửi → dùng mặc định.
 */
export function sanitizeGuestScreens(input: unknown): GuestScreen[] {
  if (!Array.isArray(input) || input.length === 0) return [...GUEST_SCREENS_DEFAULT];
  const chosen = new Set<string>([...input.filter((x): x is string => typeof x === "string"), ...REQUIRED]);
  return GUEST_SCREENS.filter((id) => chosen.has(id));
}
