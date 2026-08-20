// Cấu hình domain email + link đích dùng chung cho mọi edge function gửi email.
// Ưu tiên secret (Supabase → Edge Functions → Secrets) để đổi domain không cần sửa code:
//   APP_URL              — địa chỉ web app mà link trong email trỏ tới
//   EMAIL_FROM_DOMAIN    — domain hiện ở header From (noreply@<domain>)
//   EMAIL_SENDER_DOMAIN  — domain gửi đã verify trong Resend (mặc định notify.<from>)
//   EMAIL_FROM_NAME      — tên hiển thị ở header From (mặc định giữ nguyên tên đang
//                          chạy là "chieuthuc3"; muốn đổi sang "BHY ONE" thì set secret
//                          này, KHÔNG cần sửa code và không cần deploy lại)
// Đổi ngược khẩn cấp: set EMAIL_FROM_DOMAIN=chieuthuc3.com (không cần deploy lại).
export const APP_URL = (Deno.env.get('APP_URL') || 'https://bachungyenone.com').replace(/\/$/, '');
export const FROM_DOMAIN = Deno.env.get('EMAIL_FROM_DOMAIN') || 'bachungyenone.com';
export const FROM_NAME = Deno.env.get('EMAIL_FROM_NAME') || 'chieuthuc3';
export const SENDER_DOMAIN = Deno.env.get('EMAIL_SENDER_DOMAIN') || `notify.${FROM_DOMAIN}`;
