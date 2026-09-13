-- CHUNG VUI TOÀN CHI NHÁNH khi có người được tặng Sao (chốt lại 04/09/2026).
--
-- QUYẾT ĐỊNH NGHIỆP VỤ, ĐÃ CÂN NHẮC RỒI MỚI CHỌN. Bản trước gộp thành bản tin cuối
-- ngày để giữ lượng tin thấp (đo được: bắn từng phiếu tới 100 người là +3.500
-- tin/tháng, tăng 71% tổng lượng thông báo của cổng). Chủ chương trình đọc con số
-- và vẫn chọn phát ngay, vì mục tiêu của Sao Xứng Đáng KHÔNG phải là ít tin — mà
-- là truyền thông và để cán bộ được ghi nhận thấy tự hào. Tin vui đọc sau 8 tiếng
-- thì hết là tin vui. Đây là lựa chọn của chủ chương trình, không phải thiếu sót.
--
-- Đổi lại, bản tin gộp cuối ngày BỊ TẮT (không xoá hàm): hai tin nói cùng một
-- chuyện là nhân đôi ồn ào chứ không nhân đôi thông tin. Nếu sau vài tuần lượng
-- người tắt push tăng, quay về bản tin gộp chỉ cần đổi lịch cron — không sửa mã:
--   select cron.unschedule('sao-chung-vui-...');  -- không có, tin phát trong trigger
--   select cron.schedule('sao-ban-tin-ngay', '30 9 * * 1-5', $$ SELECT public.sao_ban_tin_ngay(true); $$);
-- và bỏ nhánh chung vui trong sao_bao_nguoi_nhan().

-- 1. Tắt lịch bản tin gộp — giữ nguyên hàm sao_ban_tin_ngay làm đường lui.
do $$
begin
  perform cron.unschedule('sao-ban-tin-ngay');
exception when others then null;  -- chạy lại lần hai thì lịch đã tắt rồi
end $$;

-- 2. Trigger: người nhận được tin riêng (giữ nguyên nội dung, chủ chương trình đã
--    duyệt), rồi cả chi nhánh nhận tin chung vui.
create or replace function public.sao_bao_nguoi_nhan()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_tong integer;
  v_moc text;
  v_noi_dung text;
  v_ten_nhan text;
  v_tieu_de_chung text;
  v_noi_dung_chung text;
  v_phat_luc timestamptz;
begin
  -- Nhập bù là chép lại lịch sử. Báo "vừa nhận Sao" cho phiếu trao từ tháng trước
  -- làm cán bộ tưởng có sao mới, và làm cả chi nhánh chung vui nhầm chuyện cũ.
  if new.entry_mode = 'backfill' then
    return new;
  end if;

  -- ---- (a) Tin riêng cho người được tặng (chỉ phiếu cá nhân có hồ sơ) ----
  if not new.is_collective and new.recipient_profile_id is not null then
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
  end if;

  -- ---- (b) Tin chung vui cho toàn chi nhánh ----
  -- Tên đứng đầu tiêu đề, không phải chữ "Có người": vinh danh là gọi đúng tên.
  v_ten_nhan := ct2_cat(coalesce(new.name, ''), 55);
  if v_ten_nhan = '' then
    return new;
  end if;

  v_tieu_de_chung := v_ten_nhan || ' vừa nhận ' || new.stars || ' Sao Xứng Đáng';

  -- Thân tin theo chuẩn hình thức push 09/08: mỗi dòng một nhãn, không nối «·».
  -- Vế «vì đã» là phần đáng đọc nhất — đó chính là nội dung được truyền thông.
  v_noi_dung_chung :=
        'Phòng: ' || ct2_cat(coalesce(new.department, 'chưa rõ phòng'), 40)
    || E'\nVì đã: ' || ct2_cat(coalesce(new.reason, ''), 140)
    || E'\nNgười tặng: ' || ct2_cat(coalesce(new.sender, 'Chương trình'), 70);

  -- Tin ngoài giờ vẫn nằm chờ tới 07h00 buổi làm việc kế tiếp — luật chung của
  -- cổng, không mở ngoại lệ kể cả cho tin vui.
  v_phat_luc := ct2_moc_phat_gan_nhat();

  -- MỘT câu lệnh cho ~98 người thay vì gọi ct2_dat_thong_bao 98 lần: lệnh này chạy
  -- BÊN TRONG giao dịch ghi phiếu, nên vòng lặp là bắt lãnh đạo ngồi chờ nút
  -- «Ghi nhận Sao» quay xong 98 lần chèn.
  insert into ct2_thong_bao
    (ma_su_kien, nguoi_nhan, tieu_de, noi_dung, muc, kenh, phat_luc)
  select 'SAO_CHUNG_VUI', p.id, v_tieu_de_chung, v_noi_dung_chung, 'KHEN',
         array['push','bell'], v_phat_luc
    from profiles p
   where p.status = 'active'
     -- người được tặng đã có tin riêng, đừng báo họ hai lần
     and p.id is distinct from new.recipient_profile_id
     -- người vừa bấm ghi phiếu thì đã biết rồi
     and p.id is distinct from get_my_profile_id();

  perform ct2_kich_hoat_phat_push();
  return new;
end $$;
