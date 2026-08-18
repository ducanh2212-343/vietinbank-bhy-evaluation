// Tên đăng nhập của khách đối tác — bản dùng phía máy chủ.
// Giữ y hệt src/lib/taiKhoanKhach.ts: lệch một ký tự là quản trị viên xem một
// tên đăng nhập còn hệ thống tạo ra một tên khác.

export const GUEST_EMAIL_DOMAIN = "khach.343skill.com";

const VALID = /^[a-z0-9][a-z0-9._-]{2,31}$/;

/** "Công ty ABC" → "cong.ty.abc" */
export function normalizeUsername(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/[._-]{2,}/g, (m) => m[0])
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 32);
}

export function isValidUsername(username: string): boolean {
  return VALID.test(username);
}

export function emailFromUsername(username: string): string {
  return `${username}@${GUEST_EMAIL_DOMAIN}`;
}
