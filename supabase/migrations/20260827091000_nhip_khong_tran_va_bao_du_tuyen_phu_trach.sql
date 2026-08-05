-- Ghi nhịp: báo ĐỦ tuyến phụ trách, và KHÔNG chịu trần
--
-- Giám đốc chốt 08/2026: «tất cả người được giao phụ trách khi ghi nhịp thì sẽ
-- push lên notification của tất cả mọi người». Đây là đảo lại một nửa thang
-- thông báo tôi dựng ở đợt trước — lúc đó tôi cắt nhịp xanh/vàng chỉ tới người
-- bám sát, để cấp trên khỏi bị dội tin. GĐ quyết ngược: giai đoạn này cần cả
-- tuyến nhìn thấy nhịp thở hằng ngày, kỷ luật quan trọng hơn sự yên tĩnh.
--
-- Hai thay đổi:
--   1. Mọi nhịp (xanh/vàng/đỏ) đều đi tới ct2_ds_nhan_khi_co_chuyen() — cán bộ,
--      người phối hợp, lãnh đạo theo dõi, Phó phòng, Trưởng phòng, PGĐ phụ
--      trách, và người tự bấm Theo dõi.
--   2. NHIP không chịu trần chống nhiễu. Trần vẫn giữ cho các loại tin khác.
--      Rủi ro đã biết và GĐ chấp nhận: một Trưởng phòng 9 cán bộ sẽ nhận 9 tin
--      mỗi sáng. Nếu sau này thấy dội quá thì đường lùi là bật lại trần riêng
--      cho NHIP, không phải sửa lại toàn bộ.

CREATE OR REPLACE FUNCTION public.ct2_dat_thong_bao(
  _ma_su_kien text, _nguoi_nhan uuid, _tieu_de text, _noi_dung text,
  _muc text DEFAULT 'NHE'::text, _dau_viec_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  moc_phat timestamptz;
  tran int := (public.ct2_cau_hinh()).tran_thong_bao;
  da_gui int;
BEGIN
  IF _nguoi_nhan IS NULL THEN RETURN false; END IF;
  IF _nguoi_nhan = public.get_my_profile_id() THEN RETURN false; END IF;

  _tieu_de  := COALESCE(NULLIF(trim(_tieu_de), ''), 'Có cập nhật mới');
  _noi_dung := COALESCE(NULLIF(trim(_noi_dung), ''), _tieu_de);

  moc_phat := CASE WHEN _muc = 'CHAN' THEN now() ELSE public.ct2_moc_phat_gan_nhat() END;

  -- Miễn trần: N12 (trao đổi) và NHIP (nhịp PDCA) — hai thứ này LÀ mạch chính
  -- của Chiêu thức 2. Trần đếm riêng từng mã sự kiện cho các loại còn lại, để
  -- một cơn lũ ở loại này không bóp chết loại kia.
  IF _muc = 'NHE' AND _ma_su_kien NOT IN ('N12', 'NHIP') THEN
    SELECT count(*) INTO da_gui FROM public.ct2_thong_bao t
     WHERE t.nguoi_nhan = _nguoi_nhan
       AND t.muc = 'NHE'
       AND t.ma_su_kien = _ma_su_kien
       AND (t.phat_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (moc_phat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
    IF da_gui >= tran THEN RETURN false; END IF;
  END IF;

  INSERT INTO public.ct2_thong_bao
    (ma_su_kien, nguoi_nhan, dau_viec_id, tieu_de, noi_dung, muc, kenh, phat_luc)
  VALUES (_ma_su_kien, _nguoi_nhan, _dau_viec_id, _tieu_de, _noi_dung, _muc,
          ARRAY['push','bell'], moc_phat);

  RETURN moc_phat <= now();
END $function$;

CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_nhip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE ten_nguoi text; tieu_de_dv text; ds uuid[]; nguoi uuid; co_gui boolean := false;
BEGIN
  SELECT p.full_name INTO ten_nguoi FROM public.profiles p WHERE p.id = NEW.nguoi_ghi;
  SELECT d.tieu_de INTO tieu_de_dv FROM public.ct2_dau_viec d WHERE d.id = NEW.dau_viec_id;

  -- MỌI nhịp đi đủ tuyến phụ trách, không phân biệt màu cờ nữa.
  ds := public.ct2_ds_nhan_khi_co_chuyen(NEW.dau_viec_id);

  FOREACH nguoi IN ARRAY ds LOOP
    IF public.ct2_dat_thong_bao('NHIP', nguoi,
         COALESCE(ten_nguoi, 'Đồng nghiệp')
           || CASE WHEN NEW.co_tinh_trang = 'DO' THEN ' báo ĐANG VƯỚNG'
                   WHEN NEW.co_tinh_trang = 'VANG' THEN ' báo có rủi ro'
                   ELSE ' vừa ghi nhịp' END,
         '«' || COALESCE(tieu_de_dv, 'đầu việc') || '» ' || NEW.phan_tram || '%: '
           || left(NEW.noi_dung, 140)
           || COALESCE(E'\n↳ Vướng: ' || left(NEW.vuong_mac, 100), ''),
         CASE WHEN NEW.co_tinh_trang = 'DO' THEN 'DO' ELSE 'NHE' END,
         NEW.dau_viec_id) THEN co_gui := true; END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;
