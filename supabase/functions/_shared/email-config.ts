// Cấu hình domain email + link đích dùng chung cho mọi edge function gửi email.
// Ưu tiên secret (Supabase → Edge Functions → Secrets) để đổi domain không cần sửa code:
//   APP_URL              — địa chỉ web app mà link trong email trỏ tới
//   EMAIL_FROM_DOMAIN    — domain hiện ở header From (noreply@<domain>)
//   EMAIL_SENDER_DOMAIN  — domain gửi đã verify trong Resend (mặc định notify.<from>)
//   EMAIL_FROM_NAME      — tên hiển thị ở header From. Mặc định "BHY ONE" (thay cho tên
//                          cũ "chieuthuc3"): tên cấu phần đã có sẵn tiền tố CT2/CT3 trong
//                          tiêu đề nên người gửi chỉ cần một danh tính chung.
// Đổi ngược khẩn cấp: set EMAIL_FROM_DOMAIN=chieuthuc3.com (không cần deploy lại).
//
// VÌ SAO PHẢI LÀM SẠCH GIÁ TRỊ (sự cố 20/08/2026): khi chuyển sang bachungyenone.com,
// ô secret EMAIL_FROM_DOMAIN bị dán lọt MỘT KÝ TỰ TAB ở đầu. From thành
// «BHY ONE <noreply@\tbachungyenone.com>» → Resend trả 422 «Invalid from field» và
// TOÀN BỘ email ngừng gửi, trong khi giao diện secret nhìn vẫn y hệt bình thường.
// Một ký tự vô hình không được phép làm chết cả đường email, nên đọc secret là làm sạch.
function docSecret(ten: string): string {
  // Bỏ mọi khoảng trắng (kể cả tab, xuống dòng) ở hai đầu VÀ lọt vào giữa: domain và URL
  // không bao giờ chứa khoảng trắng hợp lệ, nên xoá là an toàn.
  return (Deno.env.get(ten) || '').replace(/\s+/g, '');
}

/** Domain trần: chấp nhận cả khi người nhập lỡ dán kèm https:// hoặc dấu / ở cuối. */
function lamSachDomain(giaTri: string): string {
  return giaTri.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

export const APP_URL = (docSecret('APP_URL') || 'https://bachungyenone.com').replace(/\/+$/, '');
export const FROM_DOMAIN = lamSachDomain(docSecret('EMAIL_FROM_DOMAIN') || 'bachungyenone.com');
export const FROM_NAME = (Deno.env.get('EMAIL_FROM_NAME') || 'BHY ONE').trim();
export const SENDER_DOMAIN = lamSachDomain(docSecret('EMAIL_SENDER_DOMAIN') || `notify.${FROM_DOMAIN}`);
