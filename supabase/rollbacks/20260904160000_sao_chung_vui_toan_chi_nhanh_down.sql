-- GỠ tin chung vui toàn chi nhánh (20260904160000) — quay về bản tin gộp cuối ngày.
--
-- Đây cũng chính là đường lui nếu sau vài tuần lượng người tắt push tăng: chạy file
-- này là trở lại phương án 1 tin/ngày cho cả chi nhánh, người được tặng vẫn có tin
-- riêng như cũ.

-- 1. Trigger trở lại bản chỉ báo cho người nhận (20260904150000)
create or replace function public.sao_bao_nguoi_nhan()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_tong integer;
  v_moc text;
  v_noi_dung text;
begin
  if new.is_collective or new.recipient_profile_id is null then
    return new;
  end if;
  if new.entry_mode = 'backfill' then
    return new;
  end if;

  v_tong := sao_tong_cua_can_bo(new.recipient_profile_id);
  v_moc  := sao_moc_qua_ke_tiep(v_tong);

  v_noi_dung :=
        'Người tặng: ' || ct2_cat(coalesce(new.sender, 'Chương trình'), 70)
    || E'\nVì đã: '    || ct2_cat(coalesce(new.reason, ''), 140)
    || E'\nSao tích lũy: ' || v_tong || ' Sao'
    || coalesce(E'\n' || v_moc, '');

  perform ct2_dat_thong_bao(
    'SAO_NHAN', new.recipient_profile_id,
    'Bạn vừa nhận ' || new.stars || ' Sao Xứng Đáng',
    v_noi_dung, 'KHEN', null, null);

  perform ct2_kich_hoat_phat_push();
  return new;
end $$;

-- 2. Bật lại lịch bản tin gộp 16h30 các ngày làm việc
select cron.schedule('sao-ban-tin-ngay', '30 9 * * 1-5', $cron$ SELECT public.sao_ban_tin_ngay(true); $cron$);

-- Tin đã phát KHÔNG xoá — cán bộ đã đọc chúng trong chuông. Nếu cần dọn:
--   delete from public.ct2_thong_bao where ma_su_kien = 'SAO_CHUNG_VUI';
