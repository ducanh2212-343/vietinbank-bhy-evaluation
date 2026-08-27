import { describe, it, expect } from 'vitest';
import { dienGiaiLoiKhach } from '../invokeError';

/**
 * Ca thật 18/08: màn quản trị đã lên bản mới (không còn ô email) nhưng edge
 * function trên máy chủ còn bản cũ, nên bấm cấp tài khoản chỉ nhận được "Email
 * không hợp lệ" — người dùng không đoán nổi phải làm gì. Lỗi phải nói ra việc
 * cần làm chứ không chỉ nhắc lại lời máy chủ.
 */
describe('Diễn giải lỗi màn quản trị tài khoản khách', () => {
  it('lỗi đòi email → chỉ đúng việc phải deploy lại edge function', () => {
    const msg = dienGiaiLoiKhach(new Error('Email không hợp lệ'));
    expect(msg).toContain('create-guest-user');
    expect(msg).toMatch(/bản cũ/);
  });

  it('lỗi thiếu cột → chỉ đúng migration phải áp', () => {
    const msg = dienGiaiLoiKhach(new Error(`column "allowed_screens" of relation "guest_access" does not exist`));
    expect(msg).toContain('20260927090000_man_hinh_mo_cho_khach.sql');
  });

  it('lỗi mạng → bảo thử lại, không bắt người dùng đọc lỗi kỹ thuật', () => {
    expect(dienGiaiLoiKhach(new Error('Failed to send a request to the Edge Function')))
      .toMatch(/kết nối mạng/);
  });

  it('lỗi khác giữ nguyên lời máy chủ', () => {
    expect(dienGiaiLoiKhach(new Error('Bạn không có quyền thực hiện thao tác này')))
      .toBe('Bạn không có quyền thực hiện thao tác này');
  });
});
