/**
 * TÊN ĐĂNG NHẬP CỦA KHÁCH ĐỐI TÁC — cấp tài khoản không cần email.
 *
 * Đối tác ngoài Chi nhánh thường không muốn (hoặc không kịp) đưa email, mà hệ
 * thống vẫn phải cấp được tài khoản ngay tại chỗ trong buổi làm việc. Supabase
 * Auth bắt buộc mỗi tài khoản có một email, nên phần này ghép email NỘI BỘ từ
 * tên đăng nhập: `congty-abc` → `congty-abc@khach.343skill.com`.
 *
 * Địa chỉ ấy KHÔNG bao giờ nhận thư: khách không đặt lại mật khẩu qua email
 * được — mất mật khẩu thì Phòng TCTH bấm «Cấp lại mật khẩu» ở màn quản trị.
 *
 * Bản dùng phía máy chủ: supabase/functions/_shared/guestLogin.ts (giữ y hệt).
 */

/** Miền nội bộ của tài khoản khách — không có hòm thư thật phía sau. */
export const MIEN_TAI_KHOAN_KHACH = 'khach.343skill.com';

/** 3–32 ký tự, bắt đầu bằng chữ/số, phần còn lại thêm được dấu chấm, gạch. */
const HOP_LE = /^[a-z0-9][a-z0-9._-]{2,31}$/;

/**
 * Đưa những gì quản trị viên gõ về dạng tên đăng nhập dùng được: bỏ dấu tiếng
 * Việt, hạ chữ thường, khoảng trắng thành dấu chấm, bỏ ký tự lạ. "Công ty ABC"
 * → "cong.ty.abc".
 */
export function chuanHoaTenDangNhap(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    // Gộp dấu lặp và cắt dấu ở hai đầu — "cong..ty-" → "cong.ty"
    .replace(/[._-]{2,}/g, (m) => m[0])
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 32);
}

export function tenDangNhapHopLe(tenDangNhap: string): boolean {
  return HOP_LE.test(tenDangNhap);
}

/** Tên đăng nhập → email nội bộ dùng cho Supabase Auth. */
export function emailTuTenDangNhap(tenDangNhap: string): string {
  return `${tenDangNhap}@${MIEN_TAI_KHOAN_KHACH}`;
}

/**
 * Email → thứ hiển thị cho người dùng. Tài khoản khách chỉ hiện tên đăng nhập
 * (email nội bộ bày ra chỉ khiến người ta tưởng gửi thư tới đó được); cán bộ
 * dùng email thật nên giữ nguyên.
 */
export function nhanDangNhap(email: string | null | undefined): string {
  if (!email) return '—';
  const hau = `@${MIEN_TAI_KHOAN_KHACH}`;
  return email.endsWith(hau) ? email.slice(0, -hau.length) : email;
}
