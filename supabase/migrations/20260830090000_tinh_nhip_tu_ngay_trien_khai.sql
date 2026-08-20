-- Kỷ luật nhịp tính từ NGÀY TRIỂN KHAI CHÍNH THỨC — 06/08/2026
--
-- Giám đốc chốt: hôm nay 06/08/2026 là ngày triển khai chính thức Kanban tại
-- ba phòng đầu tiên (TCTH, KHDN, Bán lẻ); nhịp tính từ hôm nay.
--
-- Bảng ct2_anh_chup_nhip đã có ảnh chụp của ngày 03/08 — hôm hệ thống còn đang
-- nhập liệu — ghi một cán bộ «mất nhịp». Đưa dòng đó vào bảng nhịp tuần này là
-- khiển trách người ta về một kỷ luật khi ấy chưa tồn tại. Ảnh chụp cũ KHÔNG
-- xoá (nó là sự thật của hôm đó), chỉ không đưa vào thước đo kỳ.
--
-- Các thước đo khác cố ý KHÔNG đổi: quá hạn, tuổi cột chờ, hạn hoàn thành vẫn
-- tính từ ngày thật — đó là lời hứa với khách hàng và BGĐ, không phải kỷ luật nhịp.
-- (Phía client, soNgayImLang/hsNgayImLang kẹp cùng mốc này — NGAY_TRIEN_KHAI
-- trong src/lib/cauHinhNhip.ts.)

CREATE OR REPLACE FUNCTION public.ct2_bang_nhip_ky(_tu date, _den date, _phong uuid DEFAULT NULL::uuid)
 RETURNS TABLE(profile_id uuid, full_name text, phong uuid, ten_phong text,
               so_ngay_can_ghi bigint, so_ngay_dung_gio bigint, so_ngay_muon bigint,
               so_ngay_mat_nhip bigint, tong_viec_phai_ghi bigint, ti_le integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.full_name, a.phong, d.name,
         count(*) AS so_ngay_can_ghi,
         count(*) FILTER (WHERE a.ket_qua = 'DUNG_GIO') AS so_ngay_dung_gio,
         count(*) FILTER (WHERE a.ket_qua = 'MUON') AS so_ngay_muon,
         count(*) FILTER (WHERE a.ket_qua NOT IN ('DUNG_GIO','MUON')) AS so_ngay_mat_nhip,
         COALESCE(sum(a.so_viec_phai_ghi), 0) AS tong_viec_phai_ghi,
         CASE WHEN count(*) = 0 THEN 100
              ELSE round(100.0 * count(*) FILTER (WHERE a.ket_qua IN ('DUNG_GIO','MUON')) / count(*))::int
         END AS ti_le
    FROM public.ct2_anh_chup_nhip a
    JOIN public.profiles p ON p.id = a.nguoi
    JOIN public.departments d ON d.id = a.phong
   WHERE a.ngay BETWEEN _tu AND _den
     -- Ngày triển khai chính thức: trước mốc này chưa có kỷ luật nhịp để đo
     AND a.ngay >= DATE '2026-08-06'
     AND a.so_viec_phai_ghi > 0
     AND (_phong IS NULL OR a.phong = _phong)
     AND public.ct2_xem_duoc_dau_viec(a.phong, '{}')
   GROUP BY p.id, p.full_name, a.phong, d.name
   ORDER BY 10 ASC, 4, 2
$function$;

-- ---------------------------------------------------------------------------
-- Job chốt sổ nhịp gãy hai ngày liền vì THẺ VÔ CHỦ — vá trước 9h sáng khai trương
-- ---------------------------------------------------------------------------
-- cron «ct2-chot-so-nhip» (09:00 VN, T2–T6) fail ngày 04 và 05/08:
--   «null value in column "nguoi" violates not-null constraint»
--
-- Nguồn cơn là quyết định ĐÚNG từ đợt nhập Miro: thẻ không có người phụ trách
-- thì để trống, không bịa tên. Nhưng ct2_chot_so_nhip() gom theo
-- nguoi_chiu_trach_nhiem rồi INSERT thẳng — gặp nhóm NULL là vỡ, và MỘT dòng
-- vỡ hủy CẢ lượt chốt: không ai trong chi nhánh có ảnh chụp nhịp hôm đó.
--
-- Sửa: bỏ thẻ vô chủ ra khỏi phép chốt. Nghĩa vụ ghi nhịp là của MỘT NGƯỜI;
-- thẻ chưa có chủ thì không ai nợ nhịp về nó — vấn đề của nó là «vô chủ», đã
-- được nêu to ở cảnh báo thiếu trường bắt buộc, không phải ở sổ nhịp.
CREATE OR REPLACE FUNCTION public.ct2_chot_so_nhip(_ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE so_dong int;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT (
    public.has_role(auth.uid(),'system_admin'::app_role)
    OR public.has_role(auth.uid(),'tcth_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Chỉ TCTH/quản trị hệ thống được chốt sổ nhịp';
  END IF;

  -- Thứ Bảy/Chủ nhật không có nhịp để chốt
  IF EXTRACT(dow FROM _ngay) IN (0, 6) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.ct2_anh_chup_nhip
    (ngay, nguoi, phong, so_viec_phai_ghi, so_viec_da_ghi_truoc_8h, so_viec_ghi_8h_8h30, ket_qua)
  SELECT _ngay, d.nguoi_chiu_trach_nhiem, d.phong,
         count(*) AS phai_ghi,
         count(*) FILTER (WHERE n.dung_nhip = 'DUNG_GIO') AS truoc_8h,
         count(*) FILTER (WHERE n.dung_nhip = 'MUON') AS muon,
         CASE
           WHEN count(*) = count(*) FILTER (WHERE n.dung_nhip = 'DUNG_GIO') THEN 'DUNG_GIO'
           WHEN count(*) = count(*) FILTER (WHERE n.dung_nhip IN ('DUNG_GIO','MUON')) THEN 'MUON'
           ELSE 'MAT_NHIP'
         END
    FROM public.ct2_dau_viec d
    LEFT JOIN LATERAL (
      SELECT nn.dung_nhip FROM public.ct2_nhip_pdca nn
       WHERE nn.dau_viec_id = d.id
         AND (nn.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = _ngay
       ORDER BY CASE nn.dung_nhip WHEN 'DUNG_GIO' THEN 0 WHEN 'MUON' THEN 1 ELSE 2 END
       LIMIT 1
    ) n ON true
   WHERE d.loai_dau_viec = 'TIEN_TRINH' AND d.trang_thai = 'DANG_LAM'
     -- Thẻ vô chủ không nợ nhịp của ai — và không được phép làm vỡ lượt chốt
     AND d.nguoi_chiu_trach_nhiem IS NOT NULL
   GROUP BY d.nguoi_chiu_trach_nhiem, d.phong
  ON CONFLICT (ngay, nguoi) DO UPDATE
    SET so_viec_phai_ghi = EXCLUDED.so_viec_phai_ghi,
        so_viec_da_ghi_truoc_8h = EXCLUDED.so_viec_da_ghi_truoc_8h,
        so_viec_ghi_8h_8h30 = EXCLUDED.so_viec_ghi_8h_8h30,
        ket_qua = EXCLUDED.ket_qua;
  GET DIAGNOSTICS so_dong = ROW_COUNT;
  RETURN so_dong;
END $function$;
