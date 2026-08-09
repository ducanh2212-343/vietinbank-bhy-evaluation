-- Lịch chạy cho ct2-nhip-bao-cao — nhắc nhịp Chiêu thức 2 (09/08/2026).
--
-- Yêu cầu GĐ: "hàng ngày sau mốc muộn thì push cho trưởng phòng những ai chưa cập nhật,
-- ai trễ, ai đúng giờ để nhắc nhở ngay — đây là yếu tố sống còn nhất, nhắc là rất quan
-- trọng trong việc tạo thói quen mới; hàng tuần làm báo cáo tổng hợp vào thứ 6 cho các cấp."
--
-- GIỜ: cron chạy theo UTC, chi nhánh ở UTC+7. Đừng đọc con số ở đây như giờ Việt Nam.
--   '15 2 * * 1-5'  = 09:15 giờ VN, thứ Hai–thứ Sáu
--   '0 9 * * 5'     = 16:00 giờ VN, thứ Sáu
--
-- VÌ SAO 09:15 chứ không phải ngay sau mốc muộn 08:45: tác vụ ct2-chot-so-nhip chạy 09:00
-- mới ghi ảnh chụp của ngày hôm đó vào ct2_anh_chup_nhip. Bắn digest trước mốc này thì
-- Trưởng phòng nhận một bảng rỗng — tệ hơn là không nhận gì, vì lần sau họ sẽ bỏ qua.
-- 15 phút là khoảng đệm cho tác vụ chốt sổ chạy xong.
--
-- Nếu TCTH dời giờ ân hạn (ct2_cau_hinh_thoi_gian.gio_an_han) muộn hơn 09:00 thì phải dời
-- CẢ ct2-chot-so-nhip LẪN hai lịch dưới đây — màn Cài đặt ngày giờ đã cảnh báo điều này.

-- Digest NGÀY cho Trưởng phòng: ai đúng giờ / muộn / mất nhịp sáng nay, kèm tên.
SELECT cron.schedule(
  'ct2-nhip-ngay',
  '15 2 * * 1-5',
  $$
    select net.http_post(
      url := 'https://whlysprzsguehxmrjwha.supabase.co/functions/v1/ct2-nhip-bao-cao',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                      where name = 'email_queue_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{"dry_run": false, "mode": "nhip_ngay"}'::jsonb
    );
  $$
);

-- Báo cáo TUẦN chiều thứ Sáu cho GĐ/PGĐ/TP: push tóm tắt + email chi tiết.
SELECT cron.schedule(
  'ct2-bao-cao-tuan',
  '0 9 * * 5',
  $$
    select net.http_post(
      url := 'https://whlysprzsguehxmrjwha.supabase.co/functions/v1/ct2-nhip-bao-cao',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                      where name = 'email_queue_service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{"dry_run": false, "mode": "bao_cao_tuan"}'::jsonb
    );
  $$
);
