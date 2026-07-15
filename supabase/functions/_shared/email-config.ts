// Cấu hình domain email + link đích dùng chung cho mọi edge function gửi email.
// Ưu tiên secret (Supabase → Edge Functions → Secrets) để đổi domain không cần sửa code:
//   APP_URL              — địa chỉ web app mà link trong email trỏ tới
//   EMAIL_FROM_DOMAIN    — domain hiện ở header From (noreply@<domain>)
//   EMAIL_SENDER_DOMAIN  — domain gửi đã verify trong Resend (mặc định notify.<from>)
// Đổi ngược khẩn cấp: set EMAIL_FROM_DOMAIN=343skill.com (không cần deploy lại).
export const APP_URL = (Deno.env.get('APP_URL') || 'https://chieuthuc3.com').replace(/\/$/, '');
export const FROM_DOMAIN = Deno.env.get('EMAIL_FROM_DOMAIN') || 'chieuthuc3.com';
export const SENDER_DOMAIN = Deno.env.get('EMAIL_SENDER_DOMAIN') || `notify.${FROM_DOMAIN}`;
