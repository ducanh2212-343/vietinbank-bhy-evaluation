-- KHEN MỐC CHUỖI (13/08/2026) — hướng C, GĐ chốt làm sau khi A (huy hiệu) + B (dệt vào
-- tin 07:30) đã chạy. Đây là chỗ NỚI CÓ CHỦ ĐÍCH nguyên tắc «im lặng là đúng»: người
-- làm tốt được nhận tin — nhưng chỉ tại các MỐC hiếm, không phải lời khen hằng ngày.
--
-- Luật chơi:
--   * Mốc: 5 / 10 / 20 / 50 / 100 ngày làm việc liên tiếp đúng giờ. Người hoàn hảo
--     tuyệt đối cũng chỉ nhận tối đa 5 tin một năm — khen hiếm mới quý, khen ngày nào
--     cũng có là tiếng ồn (bài học Duolingo giữ lại, phần spam của nó bỏ đi).
--   * Đứt chuỗi rồi gây dựng lại thì ĐƯỢC KHEN LẠI khi chạm mốc lần nữa — mốc đo công
--     gây dựng, không phải huân chương một lần.
--   * Chỉ gửi cho CHÍNH người đạt mốc. Không bắn cho TP/GĐ: lời khen là chuyện riêng
--     giữa hệ thống với người giữ chuỗi, không phải công cụ giám sát hay bảng vàng.
--   * Chạy 09:05 — SAU chốt sổ 09:00 (cron riêng, không đụng vào ct2_chot_so_nhip:
--     đường chốt sổ là đường sống của Bảng nhịp, thêm gì vào đó hỏng là hỏng cả hai).
--     Trước digest TP 09:15 nên thứ tự tin trong ngày vẫn gọn.
--   * Chỉ khen khi HÔM NAY có ảnh chụp DUNG_GIO — tức mốc vừa được vượt qua sáng nay.
--     Chốt sổ chưa chạy (hỏng/nghỉ lễ) thì im lặng, không khen nhầm mốc của hôm qua.
--   * Chống trùng theo (CHUOI_MOC, người, ngày VN) — cron chạy lại không bắn đúp.
--
-- MỨC TIN MỚI «KHEN» (🔥): tin khen không được đội mũ 🟡 của mức NHE — cán bộ liếc màn
-- hình khóa phải thấy ngay đây là tin vui, không phải việc phải xử. Trên notify-ct2 và
-- chuông trong app, KHEN mang 🔥 (trùng huy hiệu chuỗi ở tab «Của tôi»), urgency normal,
-- vẫn tôn trọng khung giờ yên tĩnh 07:00–18:00 như tin thường (không phải CHAN).

ALTER TABLE public.ct2_thong_bao DROP CONSTRAINT ct2_thong_bao_muc_check;
ALTER TABLE public.ct2_thong_bao ADD CONSTRAINT ct2_thong_bao_muc_check
  CHECK (muc IN ('NHE', 'VANG', 'DO', 'CHAN', 'KHEN'));

CREATE OR REPLACE FUNCTION public.ct2_khen_chuoi_moc(
  _that boolean DEFAULT false,
  _moc timestamptz DEFAULT now()
)
RETURNS TABLE (
  nguoi uuid, ho_ten text, chuoi integer, tieu_de text, noi_dung text, da_gui boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  -- Đổi mốc thì sửa mảng này (kèm câu chữ bên dưới nếu thêm mốc mới) — cố ý không cho
  -- vào bảng cấu hình: mốc khen đổi xoành xoạch thì chuỗi mất thiêng.
  cac_moc CONSTANT int[] := ARRAY[5, 10, 20, 50, 100];
  ngay_vn date := (_moc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  r record;
  v_chuoi int;
  v_moc_sau int;
  v_tieu_de text;
  v_noi_dung text;
  v_gui boolean;
  co_gui boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Chỉ TCTH/quản trị hệ thống được chạy khen mốc chuỗi';
  END IF;

  IF NOT public.ct2_la_ngay_lam_viec(_moc) THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT a.nguoi AS ai, p.full_name AS ten
      FROM public.ct2_anh_chup_nhip a
      JOIN public.profiles p ON p.id = a.nguoi AND p.status = 'active'
     WHERE a.ngay = ngay_vn
       AND a.ket_qua = 'DUNG_GIO'
       AND NOT EXISTS (
             SELECT 1 FROM public.ct2_thong_bao t
              WHERE t.ma_su_kien = 'CHUOI_MOC'
                AND t.nguoi_nhan = a.nguoi
                AND (t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ngay_vn)
     ORDER BY p.full_name
  LOOP
    v_chuoi := public.ct2_chuoi_dung_gio(r.ai);
    IF NOT (v_chuoi = ANY (cac_moc)) THEN
      CONTINUE;
    END IF;

    SELECT min(m) INTO v_moc_sau FROM unnest(cac_moc) m WHERE m > v_chuoi;

    -- Tiêu đề mang con số (màn hình khóa: «🔥 [CT2] Chuỗi đúng giờ: 5 ngày liền»);
    -- thân tin dòng 1 dịch mốc ra nghĩa đời thường (5 ngày làm việc = tròn 1 tuần),
    -- dòng 2 treo mốc kế tiếp — cùng phép loss-aversion với dòng chuỗi trong tin 07:30.
    v_tieu_de := 'Chuỗi đúng giờ: ' || v_chuoi || ' ngày liền';
    v_noi_dung :=
      CASE v_chuoi
        WHEN 5  THEN 'Tròn một tuần làm việc không sót nhịp nào.'
        WHEN 10 THEN 'Hai tuần liền mạch — nhịp đã thành thói quen.'
        WHEN 20 THEN 'Tròn một tháng làm việc, không sót một ngày.'
        WHEN 50 THEN 'Mười tuần liền mạch — kỷ luật thành bản năng.'
        ELSE         'Một trăm ngày làm việc không sót nhịp nào.'
      END
      || E'\n'
      || CASE WHEN v_moc_sau IS NULL
              THEN 'Từ đây, mỗi ngày là một kỷ lục mới.'
              ELSE 'Mốc kế tiếp: ' || v_moc_sau || ' ngày.' END;

    IF _that THEN
      -- da_gui = phát NGAY hay không: 09:05 trong khung giờ thì true; chạy bù ngoài
      -- giờ thì tin nằm hàng đợi tới 07:00 sáng làm việc kế tiếp (ct2_moc_phat_gan_nhat)
      -- và ở đây trả false — giống ngữ nghĩa của ct2_nhac_nhip_sang.
      v_gui := public.ct2_dat_thong_bao('CHUOI_MOC', r.ai, v_tieu_de, v_noi_dung, 'KHEN', NULL, NULL);
      IF v_gui THEN co_gui := true; END IF;
    ELSE
      v_gui := false;
    END IF;

    nguoi := r.ai;
    ho_ten := r.ten;
    chuoi := v_chuoi;
    tieu_de := v_tieu_de;
    noi_dung := v_noi_dung;
    da_gui := v_gui;
    RETURN NEXT;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
END
$function$;

COMMENT ON FUNCTION public.ct2_khen_chuoi_moc(boolean, timestamptz) IS
  'Push 🔥 khen người vừa chạm mốc chuỗi đúng giờ (5/10/20/50/100 ngày) — chạy 09:05 '
  'sau chốt sổ, chỉ gửi cho chính người đạt mốc, chống trùng theo ngày. _that=false là '
  'chạy nháp (liệt kê, không gửi). Nới có chủ đích nguyên tắc «im lặng là đúng» theo '
  'quyết định của GĐ 13/08/2026.';

-- 02:05 UTC = 09:05 VN, thứ 2–6: sau chốt sổ 09:00, trước digest TP 09:15.
SELECT cron.schedule('ct2-khen-chuoi-moc', '5 2 * * 1-5',
  $job$SELECT public.ct2_khen_chuoi_moc(true);$job$);
