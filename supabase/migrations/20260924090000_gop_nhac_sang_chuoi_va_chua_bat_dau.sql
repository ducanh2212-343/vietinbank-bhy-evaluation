-- ============================================================================
-- GỘP HAI NHÁNH SỬA TIN NHẮC 07:30 — sự cố hai phiên làm việc song song
--
-- Chuyện xảy ra (15/08): hai phiên cùng sửa ct2_nhac_nhip_sang trên production.
--   · Nhánh A (PR #121/#122): câu mở ngày + dòng «Chuỗi đúng giờ: N ngày» (≥3)
--     + rút danh sách còn 2 việc.
--   · Nhánh B (PR #120 nối dài): nhắc cả thẻ CHƯA BẮT ĐẦU đã đến lúc phải chạy.
-- Bản áp SAU (B) đè mất tính năng của A — tin 07:30 đang chạy mất câu mở ngày
-- và dòng chuỗi. File này là bản gộp đủ cả hai, và từ nay là bản duy nhất.
--
-- Cấu trúc lấy theo A (bản GĐ duyệt 13/08: câu mở ngày, 2 việc, chuỗi), cộng
-- bốn điểm của B: (1) đếm cả thẻ Chuẩn bị phải báo cáo; (2) việc chưa bắt đầu
-- xếp lên đầu; (3) nhãn lý do sau tên việc; (4) dòng «Có N việc chưa bắt đầu».
-- ============================================================================

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
             public.ct2_vi_sao_phai_bao_cao(
               d.trang_thai, d.loai_dau_viec, d.ngay_bat_dau, d.han_hoan_thanh, _moc
             ) AS ly_do,
             -- Việc chưa bắt đầu lên đầu: nó cần một hành động lớn hơn là ghi chữ
             row_number() OVER (PARTITION BY d.nguoi_chiu_trach_nhiem
                                ORDER BY (d.trang_thai = 'CHUAN_BI') DESC,
                                         d.han_hoan_thanh NULLS LAST, d.created_at) AS thu_tu,
             count(*) OVER (PARTITION BY d.nguoi_chiu_trach_nhiem) AS tong_cua_nguoi
        FROM public.ct2_dau_viec d
       WHERE d.loai_dau_viec = 'TIEN_TRINH'
         AND d.nguoi_chiu_trach_nhiem IS NOT NULL
         AND (
           d.trang_thai = 'DANG_LAM'
           OR (d.trang_thai = 'CHUAN_BI'
               AND public.ct2_vi_sao_phai_bao_cao(
                     d.trang_thai, d.loai_dau_viec, d.ngay_bat_dau, d.han_hoan_thanh, _moc
                   ) IS NOT NULL)
         )
         AND NOT EXISTS (
               SELECT 1 FROM public.ct2_nhip_pdca n
                WHERE n.dau_viec_id = d.id
                  AND (n.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ngay_vn)
    )
    SELECT c.ai,
           p.full_name AS ten_nguoi,
           count(*)::int AS dem,
           count(*) FILTER (WHERE c.ly_do IS NOT NULL)::int AS dem_chua_bat_dau,
           (array_agg(c.viec_id ORDER BY c.thu_tu))[1] AS viec_dau,
           string_agg(
             CASE WHEN c.tong_cua_nguoi = 1 THEN 'Việc: '
                  ELSE 'Việc ' || c.thu_tu || ': ' END
             || c.ten_viec
             || CASE c.ly_do
                  WHEN 'QUA_HAN_BAT_DAU' THEN ' — quá ngày bắt đầu, chưa mở'
                  WHEN 'SAP_DEN_HAN' THEN ' — sắp đến hạn mà chưa bắt đầu'
                  ELSE '' END,
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
      || CASE WHEN r.dem_chua_bat_dau > 0
              THEN E'\nCó ' || r.dem_chua_bat_dau
                   || ' việc chưa bắt đầu đã đến lúc phải chạy — mở việc hoặc báo cáo vướng ở đâu.'
              ELSE '' END
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

COMMENT ON FUNCTION public.ct2_nhac_nhip_sang(boolean, timestamptz) IS
  'Nhắc 07:30 ngày làm việc — BẢN GỘP 15/08: câu mở ngày + chuỗi đúng giờ (nhánh A) '
  'và thẻ chưa bắt đầu đã đến lúc phải chạy (nhánh B). _that=false chỉ xem trước.';
