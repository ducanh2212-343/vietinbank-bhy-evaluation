-- GỠ thông báo Sao Xứng Đáng (20260904150000).
--
-- Gỡ theo thứ tự này: tắt lịch trước, bỏ trigger, rồi mới bỏ hàm — làm ngược lại
-- thì cron còn gọi một hàm vừa bị xoá và ghi lỗi mỗi 16h30.

select cron.unschedule('sao-ban-tin-ngay');

drop trigger if exists trg_sao_bao_nguoi_nhan on public.star_records;
drop function if exists public.sao_bao_nguoi_nhan();
drop function if exists public.sao_ban_tin_ngay(boolean, timestamptz);
drop function if exists public.sao_tong_cua_can_bo(uuid);
drop function if exists public.sao_moc_qua_ke_tiep(integer);

-- Tin đã phát KHÔNG xoá: cán bộ đã đọc chúng trong chuông, xoá đi là làm mất lịch
-- sử thông báo của họ. Nếu thật sự cần dọn:
--   delete from public.ct2_thong_bao where ma_su_kien in ('SAO_NHAN', 'SAO_BAN_TIN');
