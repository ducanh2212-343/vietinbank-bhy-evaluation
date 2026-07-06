-- Hạn bỏ phiếu của kỳ đánh giá đầu mối (khác end_date = ngày cuối quý,
-- vì việc bỏ phiếu diễn ra SAU khi quý kết thúc).
-- Cron send-reminders dùng mốc này để: nhắc thành viên chưa gửi phiếu khi còn <=3 ngày,
-- và tự chuyển kỳ sang 'closed' khi quá hạn.
ALTER TABLE public.council_rounds ADD COLUMN IF NOT EXISTS voting_deadline timestamptz;
