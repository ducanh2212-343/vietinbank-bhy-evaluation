/**
 * CẤU HÌNH Ô KIỂM "KHÔNG PHẢI MÁY" (Cloudflare Turnstile).
 *
 * Site key là khóa CÔNG KHAI — nó nằm sẵn trong mã HTML mà ai xem nguồn trang cũng
 * đọc được. Thứ phải giữ kín là secret key, và nó chỉ nằm ở Supabase (Authentication
 * → Bot and Abuse Protection), không bao giờ có mặt trong repo này.
 *
 * Vì sao có giá trị dự phòng viết thẳng trong mã: cùng khuôn với anon key ở
 * src/integrations/supabase/client.ts. Supabase Auth ĐÃ bật kiểm captcha, nghĩa là
 * mọi lượt đăng nhập không kèm token đều bị từ chối. Nếu chỉ dựa vào biến môi
 * trường mà lúc phát hành quên đặt biến, cả chi nhánh mất đường đăng nhập — đó là
 * sự cố nặng hơn nhiều so với việc để một khóa vốn dĩ công khai trong mã.
 */

/**
 * ĐIỀN SITE KEY VÀO ĐÂY (dạng '0x4AAAAAAA...') để khỏi phụ thuộc biến môi trường.
 * Lấy tại Cloudflare Dashboard → Turnstile → chọn site → Site Key.
 */
const SITE_KEY_DU_PHONG = '0x4AAAAAAEZqSITX_VyCEXmyk2YR2SBE4pE';

export const TURNSTILE_SITE_KEY: string = (
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? SITE_KEY_DU_PHONG
).trim();

/**
 * Đã cấu hình được site key hay chưa. Khi CHƯA có, các trang vẫn cho bấm gửi như cũ
 * (không tự khóa cửa thêm lần nữa) nhưng hiện cảnh báo rõ ràng, để người vận hành
 * biết ngay phải đặt khóa — thay vì nhận một câu báo lỗi khó hiểu từ máy chủ Auth.
 */
export const CAPTCHA_SAN_SANG: boolean = TURNSTILE_SITE_KEY.length > 0;

/** Câu nhắc dùng chung cho các trang khi thiếu site key. */
export const NHAC_THIEU_SITE_KEY =
  'Chưa cấu hình khóa Turnstile (VITE_TURNSTILE_SITE_KEY). ' +
  'Supabase đang bật kiểm captcha nên máy chủ sẽ từ chối đăng nhập cho tới khi khóa được đặt. ' +
  'Liên hệ quản trị hệ thống.';
