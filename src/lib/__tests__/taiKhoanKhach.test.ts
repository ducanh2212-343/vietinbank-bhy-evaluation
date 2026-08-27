import { describe, it, expect } from 'vitest';
import {
  MIEN_TAI_KHOAN_KHACH,
  chuanHoaTenDangNhap,
  emailTuTenDangNhap,
  nhanDangNhap,
  tenDangNhapHopLe,
} from '../taiKhoanKhach';

/**
 * Khách đối tác được cấp tài khoản KHÔNG cần email: tên đăng nhập quản trị viên
 * gõ ở màn quản trị và chuỗi khách gõ ở ô đăng nhập phải ra CÙNG một email nội
 * bộ — lệch một ký tự là đối tác cầm mật khẩu đúng mà không vào được.
 */
describe('Tên đăng nhập của khách đối tác', () => {
  it('chuẩn hóa: bỏ dấu, hạ chữ thường, khoảng trắng thành dấu chấm', () => {
    expect(chuanHoaTenDangNhap('Công ty ABC')).toBe('cong.ty.abc');
    expect(chuanHoaTenDangNhap('  Đối Tác 01 ')).toBe('doi.tac.01');
    expect(chuanHoaTenDangNhap('Nguyễn Văn A')).toBe('nguyen.van.a');
  });

  it('bỏ ký tự lạ, gộp dấu lặp và cắt dấu ở hai đầu', () => {
    expect(chuanHoaTenDangNhap('cong@ty#abc!')).toBe('congtyabc');
    expect(chuanHoaTenDangNhap('cong..ty--abc')).toBe('cong.ty-abc');
    expect(chuanHoaTenDangNhap('.cong.ty.')).toBe('cong.ty');
    expect(chuanHoaTenDangNhap('a'.repeat(50))).toHaveLength(32);
  });

  it('chuẩn hóa hai lần cũng ra một kết quả', () => {
    // Màn quản trị chuẩn hóa lúc gửi, ô đăng nhập chuẩn hóa lúc khách gõ lại
    for (const raw of ['Công ty ABC', 'doi.tac-01', 'Nguyễn Văn A']) {
      const lan1 = chuanHoaTenDangNhap(raw);
      expect(chuanHoaTenDangNhap(lan1)).toBe(lan1);
    }
  });

  it('chặn tên quá ngắn hoặc mở đầu bằng dấu', () => {
    expect(tenDangNhapHopLe('abc')).toBe(true);
    expect(tenDangNhapHopLe('cong.ty.abc')).toBe(true);
    expect(tenDangNhapHopLe('ab')).toBe(false);
    expect(tenDangNhapHopLe('.abc')).toBe(false);
    expect(tenDangNhapHopLe('CongTy')).toBe(false);
    expect(tenDangNhapHopLe('a'.repeat(33))).toBe(false);
  });

  it('ghép email nội bộ và bóc lại đúng tên đăng nhập', () => {
    const email = emailTuTenDangNhap('cong.ty.abc');
    expect(email).toBe(`cong.ty.abc@${MIEN_TAI_KHOAN_KHACH}`);
    expect(nhanDangNhap(email)).toBe('cong.ty.abc');
  });

  it('email thật của cán bộ giữ nguyên khi hiển thị', () => {
    expect(nhanDangNhap('bhy001@343skill.com')).toBe('bhy001@343skill.com');
    expect(nhanDangNhap(null)).toBe('—');
  });
});
