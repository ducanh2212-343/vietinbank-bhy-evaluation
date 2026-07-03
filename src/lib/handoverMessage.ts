// Sinh tin nhắn bàn giao tài khoản theo mẫu để admin copy và gửi cho cán bộ
// qua kênh nội bộ (Zalo/SMS). Dùng chung cho: tạo 1 cán bộ, tạo hàng loạt,
// và cấp lại mật khẩu tạm.

export const SITE_LOGIN_URL = 'https://343skill.com';

export interface HandoverInfo {
  fullName?: string | null;
  email: string;
  tempPassword: string;
}

/** Tin nhắn bàn giao tài khoản mới (kèm mật khẩu tạm). */
export function buildHandoverMessage(info: HandoverInfo): string {
  const name = (info.fullName || '').trim();
  const greeting = name ? `Chào anh/chị ${name},` : 'Chào anh/chị,';
  return [
    greeting,
    'Tài khoản hệ thống "343 Phát triển nhân sự" (VietinBank Bắc Hưng Yên) của anh/chị đã sẵn sàng:',
    `- Đường dẫn đăng nhập: ${SITE_LOGIN_URL}`,
    `- Tên đăng nhập: ${info.email}`,
    `- Mật khẩu tạm: ${info.tempPassword}`,
    'Lưu ý: Vui lòng ĐỔI MẬT KHẨU ngay ở lần đăng nhập đầu tiên (hệ thống sẽ tự yêu cầu). Không chia sẻ tin nhắn này cho người khác và xóa tin nhắn sau khi đã đổi mật khẩu.',
  ].join('\n');
}

/** Tin nhắn cấp lại mật khẩu tạm cho tài khoản đã có. */
export function buildResetMessage(info: HandoverInfo): string {
  const name = (info.fullName || '').trim();
  const greeting = name ? `Chào anh/chị ${name},` : 'Chào anh/chị,';
  return [
    greeting,
    'Mật khẩu đăng nhập hệ thống "343 Phát triển nhân sự" (VietinBank Bắc Hưng Yên) của anh/chị vừa được cấp lại:',
    `- Đường dẫn đăng nhập: ${SITE_LOGIN_URL}`,
    `- Tên đăng nhập: ${info.email}`,
    `- Mật khẩu tạm mới: ${info.tempPassword}`,
    'Lưu ý: Vui lòng ĐỔI MẬT KHẨU ngay ở lần đăng nhập đầu tiên (hệ thống sẽ tự yêu cầu). Không chia sẻ tin nhắn này cho người khác và xóa tin nhắn sau khi đã đổi mật khẩu.',
  ].join('\n');
}
