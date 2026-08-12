-- NHẮC NHỊP SÁNG CHO CÁN BỘ — 07:30 các ngày làm việc (12/08/2026).
--
-- Yêu cầu GĐ: "xây dựng push cho cán bộ về các task cần cập nhật đầu giờ sáng, việc này
-- gửi lúc 7h30 sáng ngày làm việc."
--
-- CHỖ TRỐNG NÓ BỔ: luồng nhịp hiện chỉ báo SAU KHI ĐÃ LỠ — chốt sổ 09:00 rồi digest cho
-- Trưởng phòng 09:15 («sáng nay ai chưa ghi»). Người duy nhất còn kịp làm gì đó trước
-- mốc — chính cán bộ — lại không được nhắc. 07:30 là lúc nhắc có tác dụng: nhịp đã mở
-- từ 06:45, còn đúng một tiếng trước mốc đúng giờ 08:31.
--
-- ĐỊNH NGHĨA "VIỆC CẦN CẬP NHẬT" lấy nguyên của ct2_chot_so_nhip — đầu việc TIẾN TRÌNH
-- đang làm, có người chịu trách nhiệm. Cố ý KHÔNG mở rộng sang hồ sơ tín dụng hay thẻ
-- Kanban CT3: nhắc thứ không nằm trong bảng chấm thì cán bộ làm xong vẫn thấy mình bị
-- trừ, còn thứ bị trừ thì không ai nhắc — nhắc sai chỗ một lần là lần sau không ai đọc.
--
-- IM LẶNG LÀ ĐÚNG: ai đã ghi hết nhịp trước 07:30 thì không nhận gì. Người không có việc
-- đang chạy cũng vậy. Tin chỉ đến với người còn nợ thật.
--
-- BẤM VÀO MỞ THẲNG THẺ: còn đúng 1 việc thì gắn dau_viec_id, chuông và push đưa thẳng
-- tới thẻ đó (duongDanThongBao / notify-ct2). Thực tế phần lớn cán bộ giữ 1–2 việc đang
-- chạy nên đa số tin sẽ mở đúng một chạm. Nhiều việc thì để trống — về danh sách việc.
--
-- MỐC GIỜ trong tin đọc từ ct2_cau_hinh() chứ không chôn số: TCTH dời giờ ân hạn thì lời
-- nhắc tự đổi theo, không phải sửa mã.
--
-- Lãnh đạo phòng thực ra được tính đúng giờ tới tận mốc ân hạn (08:45), nhưng
-- ct2_la_lanh_dao_phong() trả lời "TÔI có phải lãnh đạo phòng này không" — dựa vào
-- auth.uid(), nên trong tác vụ nền không hỏi hộ người khác được. Dùng chung mốc chặt hơn
-- (08:31) cho mọi người: lãnh đạo bị nhắc sớm 14 phút thì vô hại, còn báo "vẫn kịp" cho
-- người đã muộn thì có hại.

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
BEGIN
  -- Quyền: cron chạy không có auth.uid(); người thật thì phải là TCTH/quản trị hệ thống.
  -- Cùng khuôn với ct2_chot_so_nhip.
  IF auth.uid() IS NOT NULL AND NOT (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Chỉ TCTH/quản trị hệ thống được chạy nhắc nhịp sáng';
  END IF;

  -- Ngày nghỉ lễ rơi vào giữa tuần: cron vẫn chạy (lịch chỉ biết thứ Hai–thứ Sáu) nhưng
  -- không ai phải ghi nhịp, nên im lặng. ct2_la_ngay_lam_viec đã tính cả ngày làm bù.
  IF NOT public.ct2_la_ngay_lam_viec(_moc) THEN
    RETURN;
  END IF;

  FOR r IN
    WITH con_no AS (
      SELECT d.id AS viec_id,
             d.nguoi_chiu_trach_nhiem AS ai,
             public.ct2_cat(d.tieu_de, 70) AS ten_viec,
             -- Gần hạn lên trước: cắt còn 3 dòng thì giữ lại việc gấp nhất
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
           -- Đánh số «Việc 1/2/3» khi có nhiều việc (GĐ chỉnh 12/08): danh sách dễ quét
           -- và khớp với con số ở tiêu đề. Còn đúng một việc thì để «Việc:» trơn — số
           -- thứ tự lúc đó không nói thêm gì, mà lại gợi người đọc đi tìm «Việc 2».
           string_agg(
             CASE WHEN c.tong_cua_nguoi = 1 THEN 'Việc: '
                  ELSE 'Việc ' || c.thu_tu || ': ' END || c.ten_viec,
             E'\n' ORDER BY c.thu_tu)
             FILTER (WHERE c.thu_tu <= 3) AS ds_viec
      FROM con_no c
      JOIN public.profiles p ON p.id = c.ai AND p.status = 'active'
      -- Chống nhắc trùng: cron chạy lại, hoặc TCTH bấm tay, đều không sinh tin thứ hai
      -- trong cùng ngày. Khóa theo (loại tin, người, ngày giờ VN).
     WHERE NOT EXISTS (
             SELECT 1 FROM public.ct2_thong_bao t
              WHERE t.ma_su_kien = 'NHIP_SANG'
                AND t.nguoi_nhan = c.ai
                AND (t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ngay_vn)
     GROUP BY c.ai, p.full_name
     ORDER BY p.full_name
  LOOP
    -- Hình thức theo chuẩn 09/08: tiêu đề mang CON SỐ CẦN HÀNH ĐỘNG và đủ ngắn để không
    -- gãy dòng; thân tin mỗi dòng một nhãn. Nhãn «Việc:» cũng là thứ để notify-ct2 nhận
    -- ra tin thuộc Chiêu thức 2 mà gắn [CT2] vào tiêu đề (nhãn phân hệ 11/08).
    -- «phải ghi» chứ không «chưa ghi» (GĐ chỉnh 12/08): cùng một sự thật, nhưng một
    -- đằng bảo người ta việc cần làm, một đằng nhắc họ đã thiếu. Tin đầu ngày nên mở
    -- bằng việc phải làm.
    v_tieu_de := 'Sáng nay còn ' || r.dem || ' việc phải ghi nhịp';
    v_noi_dung := r.ds_viec
      || CASE WHEN r.dem > 3 THEN E'\n… và ' || (r.dem - 3) || ' việc nữa' ELSE '' END
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

    nguoi := r.ai;
    ho_ten := r.ten_nguoi;
    so_viec := r.dem;
    tieu_de := v_tieu_de;
    noi_dung := v_noi_dung;
    da_gui := v_gui;
    RETURN NEXT;
  END LOOP;

  -- Đánh thức bộ phát ngay: 07:30 nằm trong khung yên tĩnh 07:00–18:00 nên tin đi liền,
  -- không phải đợi cron phát tin hoãn của sáng hôm sau.
  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
END
$function$;

COMMENT ON FUNCTION public.ct2_nhac_nhip_sang(boolean, timestamptz) IS
  'Nhắc từng cán bộ các đầu việc chưa ghi nhịp, chạy 07:30 ngày làm việc. '
  '_that = false (mặc định) chỉ xem trước, không gửi.';

-- Chỉ TCTH/quản trị gọi tay được; cron chạy bằng vai trò nền nên không qua GRANT này.
REVOKE ALL ON FUNCTION public.ct2_nhac_nhip_sang(boolean, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.ct2_nhac_nhip_sang(boolean, timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------
-- Lịch chạy
--
-- GIỜ: cron chạy theo UTC, chi nhánh ở UTC+7 — đừng đọc con số này như giờ Việt Nam.
--   '30 0 * * 1-5' = 07:30 giờ VN, thứ Hai–thứ Sáu.
--
-- Đặt sau tác vụ phát tin hoãn 07:00 (ct2-phat-thong-bao-hoan) để tin sáng nay không lẫn
-- vào lượt dọn hàng đợi của đêm qua, và trước mốc đúng giờ 08:31 đủ xa để còn kịp làm.
SELECT cron.unschedule('ct2-nhac-nhip-sang')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ct2-nhac-nhip-sang');

SELECT cron.schedule(
  'ct2-nhac-nhip-sang',
  '30 0 * * 1-5',
  $$ SELECT public.ct2_nhac_nhip_sang(true); $$
);
