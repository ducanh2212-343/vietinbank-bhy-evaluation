-- CHUỖI ĐÚNG GIỜ (13/08/2026) — GĐ hỏi «đã có tính năng cho người duy trì chuỗi streak
-- ghi nhịp đúng giờ chưa», chốt làm CẢ HAI hướng không phá nguyên tắc:
--
--   A. HUY HIỆU TRONG APP (tab «Của tôi», Ct2MyWork): «Chuỗi đúng giờ: N ngày», chỉ
--      mình thấy — hợp triết lý «nhịp là gương soi cho chính mình», không tin nào bắn ra.
--   B. DỆT VÀO TIN 07:30 SẴN CÓ: người CÒN NỢ hôm nay mà đang giữ chuỗi ≥3 ngày nhận
--      thêm dòng «Chuỗi đúng giờ: N ngày — giữ tiếp hôm nay.» — loss-aversion kiểu
--      Duolingo nhưng bằng số thật của chính người nhận, mạnh hơn mọi câu chung.
--      KHÔNG thêm tin nào; người đã ghi xong vẫn im lặng tuyệt đối.
--
-- Hướng C (push khen khi đạt mốc 5/10/20 ngày) CỐ Ý KHÔNG LÀM: người làm tốt bắt đầu
-- nhận tin là phá «im lặng là đúng» — cả hai tài liệu thiết kế đều dặn để GĐ chốt riêng.
--
-- LUẬT CÔNG BẰNG: ngày nghỉ phép / ngày không có việc phải ghi KHÔNG phá chuỗi — ngày
-- đó không có dòng ảnh chụp nên đơn giản là không vào chuỗi. Cùng triết lý mẫu số của
-- Bảng nhịp: phạt oan một lần thì lần sau không ai tin nữa.
--
-- Chuỗi đọc từ ct2_anh_chup_nhip (chốt sổ 09:00) nên «tính đến lần chốt gần nhất»:
-- lúc 07:30 sáng, chuỗi là số liệu tới hết hôm qua — đúng nghĩa «giữ tiếp hôm nay».

CREATE OR REPLACE FUNCTION public.ct2_chuoi_dung_gio(_nguoi uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  -- bool_and chạy dồn từ ngày chụp mới nhất lùi về quá khứ: còn true nghĩa là chưa
  -- gặp ngày nào lỡ nhịp — đếm số dòng còn true là ra chuỗi.
  -- Sàn 2026-08-06 trùng mốc NGAY_BAT_DAU của ct2_bang_nhip_ky: trước ngày đó chưa
  -- có kỷ luật nhịp để đo, số trên huy hiệu phải khớp số trên màn Bảng nhịp.
  SELECT count(*)::int FROM (
    SELECT bool_and(ket_qua = 'DUNG_GIO') OVER (ORDER BY ngay DESC) AS van_giu
    FROM public.ct2_anh_chup_nhip
    WHERE nguoi = _nguoi AND ngay >= '2026-08-06'
  ) t WHERE van_giu;
$function$;

COMMENT ON FUNCTION public.ct2_chuoi_dung_gio(uuid) IS
  'Số ngày làm việc LIÊN TIẾP ghi nhịp đúng giờ, tính từ lần chốt sổ gần nhất lùi về. '
  'NỘI BỘ — không cấp cho authenticated: cán bộ tra được chuỗi của đồng nghiệp là thành '
  'bảng so sánh, phá nguyên tắc «nhịp là gương soi». App dùng ct2_chuoi_dung_gio_cua_toi.';

REVOKE ALL ON FUNCTION public.ct2_chuoi_dung_gio(uuid) FROM public;

CREATE OR REPLACE FUNCTION public.ct2_chuoi_dung_gio_cua_toi()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.ct2_chuoi_dung_gio(public.get_my_profile_id());
$function$;

COMMENT ON FUNCTION public.ct2_chuoi_dung_gio_cua_toi() IS
  'Chuỗi đúng giờ của CHÍNH người đang đăng nhập — nguồn cho huy hiệu 🔥 ở tab «Của tôi». '
  'Chưa đăng nhập / không có hồ sơ thì trả 0.';

REVOKE ALL ON FUNCTION public.ct2_chuoi_dung_gio_cua_toi() FROM public;
GRANT EXECUTE ON FUNCTION public.ct2_chuoi_dung_gio_cua_toi() TO authenticated;

-- ============ Dệt chuỗi vào tin 07:30 ============
-- Chỉ thêm dòng chuỗi (khi ≥3) ngay trước dòng luật; mọi phần khác giữ nguyên bản 13/08.
CREATE OR REPLACE FUNCTION public.ct2_nhac_nhip_sang(
  _that boolean DEFAULT false,
  _moc timestamptz DEFAULT now()
)
RETURNS TABLE (
  nguoi uuid, ho_ten text, so_viec integer, tieu_de text, noi_dung text, da_gui boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ch public.ct2_cau_hinh_thoi_gian := public.ct2_cau_hinh();
  ngay_vn date := (_moc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
  r record;
  v_tieu_de text;
  v_noi_dung text;
  v_gui boolean;
  co_gui boolean := false;
  v_cau text;
  v_cau_da_lay boolean := false;
  v_dem int := 0;
  v_chuoi int;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Chỉ TCTH/quản trị hệ thống được chạy nhắc nhịp sáng';
  END IF;

  IF NOT public.ct2_la_ngay_lam_viec(_moc) THEN
    RETURN;
  END IF;

  FOR r IN
    WITH con_no AS (
      SELECT d.id AS viec_id,
             d.nguoi_chiu_trach_nhiem AS ai,
             public.ct2_cat(d.tieu_de, 70) AS ten_viec,
             row_number() OVER (PARTITION BY d.nguoi_chiu_trach_nhiem
                                ORDER BY d.han_hoan_thanh NULLS LAST, d.created_at) AS thu_tu,
             count(*) OVER (PARTITION BY d.nguoi_chiu_trach_nhiem) AS tong_cua_nguoi
        FROM public.ct2_dau_viec d
       WHERE d.loai_dau_viec = 'TIEN_TRINH'
         AND d.trang_thai = 'DANG_LAM'
         AND d.nguoi_chiu_trach_nhiem IS NOT NULL
         AND NOT EXISTS (
               SELECT 1 FROM public.ct2_nhip_pdca n
                WHERE n.dau_viec_id = d.id
                  AND (n.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ngay_vn)
    )
    SELECT c.ai,
           p.full_name AS ten_nguoi,
           count(*)::int AS dem,
           (array_agg(c.viec_id ORDER BY c.thu_tu))[1] AS viec_dau,
           string_agg(
             CASE WHEN c.tong_cua_nguoi = 1 THEN 'Việc: '
                  ELSE 'Việc ' || c.thu_tu || ': ' END || c.ten_viec,
             E'\n' ORDER BY c.thu_tu)
             FILTER (WHERE c.thu_tu <= 2) AS ds_viec
      FROM con_no c
      JOIN public.profiles p ON p.id = c.ai AND p.status = 'active'
     WHERE NOT EXISTS (
             SELECT 1 FROM public.ct2_thong_bao t
              WHERE t.ma_su_kien = 'NHIP_SANG'
                AND t.nguoi_nhan = c.ai
                AND (t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ngay_vn)
     GROUP BY c.ai, p.full_name
     ORDER BY p.full_name
  LOOP
    IF NOT v_cau_da_lay THEN
      v_cau := public.ct2_chon_cau_mo_ngay(ngay_vn, _that);
      v_cau_da_lay := true;
    END IF;

    -- Chuỗi đúng giờ tính đến lần chốt gần nhất (hết hôm qua). Ngưỡng 3: chuỗi 1–2
    -- ngày chưa phải thứ đáng tiếc, nhắc sớm quá thành nhàm trước khi kịp quý.
    v_chuoi := public.ct2_chuoi_dung_gio(r.ai);

    v_tieu_de := 'Sáng nay còn ' || r.dem || ' việc phải ghi nhịp';
    v_noi_dung := COALESCE(v_cau || E'\n', '')
      || r.ds_viec
      || CASE WHEN r.dem > 2 THEN E'\n… và ' || (r.dem - 2) || ' việc nữa' ELSE '' END
      || CASE WHEN v_chuoi >= 3
              THEN E'\nChuỗi đúng giờ: ' || v_chuoi || ' ngày — giữ tiếp hôm nay.'
              ELSE '' END
      || E'\nGhi trước ' || to_char(ch.gio_dung_gio, 'HH24:MI') || ' là đúng giờ — sau '
      || to_char(ch.gio_an_han, 'HH24:MI') || ' tính mất nhịp.';

    IF _that THEN
      v_gui := public.ct2_dat_thong_bao(
        'NHIP_SANG', r.ai, v_tieu_de, v_noi_dung, 'NHE',
        CASE WHEN r.dem = 1 THEN r.viec_dau END, NULL);
      IF v_gui THEN co_gui := true; END IF;
    ELSE
      v_gui := false;
    END IF;
    v_dem := v_dem + 1;

    nguoi := r.ai;
    ho_ten := r.ten_nguoi;
    so_viec := r.dem;
    tieu_de := v_tieu_de;
    noi_dung := v_noi_dung;
    da_gui := v_gui;
    RETURN NEXT;
  END LOOP;

  IF _that AND v_dem > 0 THEN
    UPDATE public.ct2_lich_su_cau_mo_ngay SET so_nguoi_nhan = v_dem WHERE ngay = ngay_vn;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
END
$function$;
