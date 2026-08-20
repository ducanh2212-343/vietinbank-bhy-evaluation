-- ============================================================================
-- BỊT ĐƯỜNG NÉ NHỊP: để thẻ ở «Chuẩn bị» không còn là chỗ trốn báo cáo
--
-- Yêu cầu GĐ 15/08: "tránh trường hợp cán bộ cứ để ở phần chuẩn bị mà không
-- chuyển sang đang làm để tránh phải báo cáo; quá thời hạn bắt đầu thì phải
-- báo cáo; trong tổng ghi nhịp note thêm cột các task quá thời hạn bắt đầu /
-- gần đến thời hạn hoàn thành mà chưa bắt đầu."
--
-- LỖ HỔNG CÓ THẬT, ĐO ĐƯỢC (15/08): 14 thẻ đang nằm ở «Chuẩn bị», trong đó 8
-- thẻ đã quá ngày bắt đầu từ 2 đến 19 ngày; KHDN-2608-006 quá cả hạn hoàn
-- thành mà chưa từng bắt tay làm; KHDN-2608-015 đến hạn hôm nay. Luật cũ chỉ
-- đòi nhịp ở «Đang làm» nên toàn bộ số này im lặng hợp lệ — càng chậm càng
-- không ai phải giải trình, đúng chiều khuyến khích ngược.
--
-- LUẬT MỚI — một câu: việc ĐÃ ĐẾN LÚC PHẢI CHẠY thì phải báo cáo, dù thẻ còn
-- nằm ở cột nào. Hai trường hợp:
--   · QUA_HAN_BAT_DAU — đã qua ngày bắt đầu mà chưa chuyển sang Đang làm.
--   · SAP_DEN_HAN     — hạn hoàn thành còn ≤ ngưỡng ngày làm việc (mặc định 3)
--                       mà chưa bắt đầu; gồm cả thẻ đã quá hạn hoàn thành.
-- Thẻ chưa tới ngày bắt đầu và còn xa hạn thì KHÔNG bị đòi — nằm ở «Chuẩn bị»
-- đúng lúc là hợp lệ, phạt cả nhóm đó chỉ dạy nhau ghi ngày bắt đầu thật muộn.
--
-- Ngưỡng để ra cấu hình, không chôn số: TCTH đổi được như mọi mốc giờ khác.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Ngưỡng «gần đến hạn», tính bằng ngày làm việc
-- ---------------------------------------------------------------------------
ALTER TABLE public.ct2_cau_hinh_thoi_gian
  ADD COLUMN IF NOT EXISTS nguong_sap_den_han int NOT NULL DEFAULT 3
    CHECK (nguong_sap_den_han BETWEEN 1 AND 30);

COMMENT ON COLUMN public.ct2_cau_hinh_thoi_gian.nguong_sap_den_han IS
  'Thẻ chưa bắt đầu mà hạn hoàn thành còn ≤ ngần này NGÀY LÀM VIỆC thì phải ghi nhịp như việc đang chạy.';

-- Hàng dự phòng của ct2_cau_hinh() phải có đủ cột mới, nếu không ROW() lệch kiểu
CREATE OR REPLACE FUNCTION public.ct2_cau_hinh()
RETURNS public.ct2_cau_hinh_thoi_gian
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT c FROM public.ct2_cau_hinh_thoi_gian c LIMIT 1),
    ROW(true, '08:00', '08:30', '06:45', '08:45', '07:00', '18:00',
        3, 2, 3, NULL, now(), 3)::public.ct2_cau_hinh_thoi_gian
  )
$$;

-- ---------------------------------------------------------------------------
-- 2) MỘT nơi trả lời «thẻ chưa bắt đầu này có phải báo cáo không, vì sao»
--
-- Mọi chỗ khác (trigger chấm nhịp, bảng nhịp phòng, việc của tôi, nhắc sáng)
-- đều gọi hàm này — luật nằm một chỗ thì không có chuyện bảng đòi mà trigger
-- tha, hay nhắc một đằng chấm một nẻo.
--
-- Trả về: 'SAP_DEN_HAN' (nguy cấp hơn, xét trước) · 'QUA_HAN_BAT_DAU' · NULL.
-- Hai nhãn loại trừ nhau nên đếm hai cột là cộng đúng tổng, không đếm trùng.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_vi_sao_phai_bao_cao(
  _trang_thai text,
  _loai_dau_viec text,
  _ngay_bat_dau date,
  _han_hoan_thanh date,
  _moc timestamptz DEFAULT now()
)
RETURNS text
LANGUAGE sql STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _loai_dau_viec <> 'TIEN_TRINH' OR _trang_thai <> 'CHUAN_BI' THEN NULL
    WHEN _han_hoan_thanh IS NOT NULL
         AND public.ct2_ngay_lam_viec((_moc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date, _han_hoan_thanh)
             <= (public.ct2_cau_hinh()).nguong_sap_den_han
      THEN 'SAP_DEN_HAN'
    WHEN _ngay_bat_dau IS NOT NULL
         AND _ngay_bat_dau < (_moc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      THEN 'QUA_HAN_BAT_DAU'
    ELSE NULL
  END
$$;
REVOKE ALL ON FUNCTION public.ct2_vi_sao_phai_bao_cao(text, text, date, date, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_vi_sao_phai_bao_cao(text, text, date, date, timestamptz) TO authenticated, service_role;

COMMENT ON FUNCTION public.ct2_vi_sao_phai_bao_cao(text, text, date, date, timestamptz) IS
  'Thẻ chưa bắt đầu có phải ghi nhịp không: SAP_DEN_HAN | QUA_HAN_BAT_DAU | NULL. Nguồn luật duy nhất cho cả trigger chấm nhịp lẫn bảng nhịp.';

-- ---------------------------------------------------------------------------
-- 3) Chấm nhịp: thẻ chưa bắt đầu nhưng phải báo cáo thì chấm như việc đang chạy
--
-- Trước: mọi thứ ngoài DANG_LAM đều KHONG_TINH — ghi cũng không được ghi nhận,
-- nên cán bộ có thiện chí báo cáo sớm cũng không có động lực. Nay ghi vào thẻ
-- «Chuẩn bị» quá hạn được chấm đúng giờ/muộn bình thường.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_ghi_nhip()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dv record;
  ch public.ct2_cau_hinh_thoi_gian;
  gio_vn time;
  hom_qua text;
  phai_bao_cao boolean;
BEGIN
  SELECT loai_dau_viec, trang_thai, phong, ngay_bat_dau, han_hoan_thanh INTO dv
    FROM public.ct2_dau_viec WHERE id = NEW.dau_viec_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đầu việc không tồn tại';
  END IF;

  -- Cờ vàng/đỏ: bắt buộc tách «Đang vướng vì…» và «Hôm nay tôi làm…»
  IF NEW.co_tinh_trang IN ('VANG','DO') THEN
    IF COALESCE(char_length(trim(NEW.vuong_mac)), 0) < 5
       OR COALESCE(char_length(trim(NEW.hanh_dong_hom_nay)), 0) < 5 THEN
      RAISE EXCEPTION 'Cờ vàng/đỏ cần ghi rõ cả hai ô: «Đang vướng vì…» và «Hôm nay tôi làm…»';
    END IF;
  END IF;

  -- Chống "điền cho có": từ chối câu nhịp trùng khớp 100%% với dòng gần nhất
  SELECT n.noi_dung INTO hom_qua
    FROM public.ct2_nhip_pdca n
   WHERE n.dau_viec_id = NEW.dau_viec_id
   ORDER BY n.ghi_luc DESC LIMIT 1;
  IF hom_qua IS NOT NULL AND trim(hom_qua) = trim(NEW.noi_dung) THEN
    RAISE EXCEPTION 'Nội dung giống hệt lần trước — hôm nay có gì khác không?';
  END IF;

  ch := public.ct2_cau_hinh();
  phai_bao_cao := public.ct2_vi_sao_phai_bao_cao(
    dv.trang_thai, dv.loai_dau_viec, dv.ngay_bat_dau, dv.han_hoan_thanh, NEW.ghi_luc
  ) IS NOT NULL;

  -- Chấm giờ theo giờ Việt Nam, và CHỈ trong ngày làm việc
  IF NOT public.ct2_la_ngay_lam_viec(NEW.ghi_luc) THEN
    NEW.dung_nhip := 'KHONG_TINH';
  ELSIF dv.loai_dau_viec = 'TIEN_TRINH'
        AND (dv.trang_thai = 'DANG_LAM' OR phai_bao_cao) THEN
    gio_vn := (NEW.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;
    IF gio_vn < ch.gio_dung_gio THEN
      NEW.dung_nhip := 'DUNG_GIO';
    ELSIF gio_vn < ch.gio_an_han THEN
      -- Khung ân hạn là khung của lãnh đạo Phòng: lãnh đạo ghi vẫn ĐÚNG GIỜ,
      -- cán bộ ghi tính là MUỘN (ân hạn, không phải mất nhịp)
      NEW.dung_nhip := CASE WHEN public.ct2_la_lanh_dao_phong(dv.phong)
                            THEN 'DUNG_GIO' ELSE 'MUON' END;
    ELSE
      NEW.dung_nhip := 'MAT_NHIP';
    END IF;
  ELSE
    NEW.dung_nhip := 'KHONG_TINH';
  END IF;

  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.f_ct2_truoc_ghi_nhip() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Bảng nhịp: thêm cột «chưa bắt đầu» và tính vào mẫu số
--
-- Cột cb_* tách riêng chứ không trộn vào cv_*: lãnh đạo phải phân biệt được
-- «cán bộ chưa ghi việc đang chạy» với «cán bộ ngâm việc chưa chịu bắt đầu» —
-- hai chuyện khác nhau, cách nhắc cũng khác.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ct2_nhip_phong_hom_nay(uuid);

CREATE FUNCTION public.ct2_nhip_phong_hom_nay(_phong uuid)
RETURNS TABLE(
  profile_id uuid, full_name text, avatar_url text,
  so_viec_dang_chay bigint, so_viec_da_ghi bigint,
  so_the_do bigint, so_qua_han bigint, ket_qua text,
  cv_dang_chay bigint, cv_da_ghi bigint,
  hs_dang_chay bigint, hs_da_ghi bigint,
  cb_can_bao_cao bigint, cb_da_ghi bigint,
  cb_qua_han_bd bigint, cb_sap_den_han bigint
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH nguon AS (
    -- Việc phòng: thẻ ĐANG LÀM (như cũ) + thẻ CHUẨN BỊ đã đến lúc phải chạy
    SELECT d.id, d.nguoi_chiu_trach_nhiem AS nguoi, d.co_tinh_trang, d.han_hoan_thanh,
           d.trang_thai,
           public.ct2_vi_sao_phai_bao_cao(
             d.trang_thai, d.loai_dau_viec, d.ngay_bat_dau, d.han_hoan_thanh
           ) AS ly_do
      FROM public.ct2_dau_viec d
      LEFT JOIN public.ct2_bang b ON b.id = d.bang_id
      LEFT JOIN public.profiles ng ON ng.id = d.nguoi_chiu_trach_nhiem
     WHERE d.loai_dau_viec = 'TIEN_TRINH'
       AND (
         d.phong = _phong
         OR (b.loai = 'TOAN_CN' AND ng.department_id = _phong)
       )
       AND (
         d.trang_thai = 'DANG_LAM'
         OR (d.trang_thai = 'CHUAN_BI'
             AND public.ct2_vi_sao_phai_bao_cao(
                   d.trang_thai, d.loai_dau_viec, d.ngay_bat_dau, d.han_hoan_thanh
                 ) IS NOT NULL)
       )
  ), cv AS (
    SELECT * FROM nguon
  ), cv_nhip AS (
    SELECT n.dau_viec_id,
           min(CASE n.dung_nhip WHEN 'DUNG_GIO' THEN 0 WHEN 'MUON' THEN 1 ELSE 2 END) AS tot_nhat
      FROM public.ct2_nhip_pdca n
     WHERE n.dau_viec_id IN (SELECT id FROM cv)
       AND (n.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
     GROUP BY n.dau_viec_id
  ), cv_gop AS (
    SELECT v.nguoi,
           count(*) FILTER (WHERE v.trang_thai = 'DANG_LAM') AS dang_chay,
           count(nh.dau_viec_id) FILTER (WHERE v.trang_thai = 'DANG_LAM') AS da_ghi,
           count(*) FILTER (WHERE v.ly_do IS NOT NULL) AS cb_can,
           count(nh.dau_viec_id) FILTER (WHERE v.ly_do IS NOT NULL) AS cb_ghi,
           count(*) FILTER (WHERE v.ly_do = 'QUA_HAN_BAT_DAU') AS cb_qua_bd,
           count(*) FILTER (WHERE v.ly_do = 'SAP_DEN_HAN') AS cb_sap,
           count(*) FILTER (WHERE v.co_tinh_trang = 'DO' AND v.trang_thai = 'DANG_LAM') AS the_do,
           count(*) FILTER (
             WHERE v.han_hoan_thanh < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           ) AS qua_han,
           max(COALESCE(nh.tot_nhat, 2)) AS xau_nhat
      FROM cv v
      LEFT JOIN cv_nhip nh ON nh.dau_viec_id = v.id
     GROUP BY v.nguoi
  ), hs_gop AS (
    SELECT h.can_bo AS nguoi,
           count(*) AS dang_chay,
           count(*) FILTER (
             WHERE (h.nhip_gan_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                 = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           ) AS da_ghi
      FROM public.ct2_ho_so_tin_dung h
     WHERE h.phong = _phong
       AND h.trang_thai IN ('THU_THAP','TRINH_LDP','TRINH_LDCN','TRINH_TSC','HOAN_THIEN_GN')
     GROUP BY h.can_bo
  ), tong AS (
    SELECT p.id, p.full_name, p.avatar_url,
           COALESCE(c.dang_chay, 0) AS cv_chay,
           COALESCE(c.da_ghi, 0)    AS cv_ghi,
           COALESCE(c.cb_can, 0)    AS cb_can,
           COALESCE(c.cb_ghi, 0)    AS cb_ghi,
           COALESCE(c.cb_qua_bd, 0) AS cb_qua_bd,
           COALESCE(c.cb_sap, 0)    AS cb_sap,
           COALESCE(x.dang_chay, 0) AS hs_chay,
           COALESCE(x.da_ghi, 0)    AS hs_ghi,
           COALESCE(c.the_do, 0)    AS the_do,
           COALESCE(c.qua_han, 0)   AS qua_han,
           COALESCE(c.xau_nhat, 0)  AS xau_nhat
      FROM (SELECT nguoi FROM cv_gop UNION SELECT nguoi FROM hs_gop) ai
      JOIN public.profiles p ON p.id = ai.nguoi
      LEFT JOIN cv_gop c ON c.nguoi = ai.nguoi
      LEFT JOIN hs_gop x ON x.nguoi = ai.nguoi
  )
  SELECT t.id, t.full_name, t.avatar_url,
         t.cv_chay + t.cb_can + t.hs_chay AS so_viec_dang_chay,
         t.cv_ghi  + t.cb_ghi + t.hs_ghi  AS so_viec_da_ghi,
         t.the_do, t.qua_han,
         CASE
           WHEN NOT public.ct2_la_ngay_lam_viec() THEN 'NGAY_NGHI'
           WHEN t.cv_chay + t.cb_can + t.hs_chay = 0 THEN 'KHONG_CO_VIEC'
           WHEN t.cv_ghi + t.cb_ghi + t.hs_ghi = t.cv_chay + t.cb_can + t.hs_chay
                AND t.xau_nhat = 0 THEN 'DUNG_GIO'
           WHEN t.cv_ghi + t.cb_ghi + t.hs_ghi = t.cv_chay + t.cb_can + t.hs_chay THEN 'MUON'
           WHEN t.cv_ghi + t.cb_ghi + t.hs_ghi > 0 THEN 'CHUA_DU'
           ELSE 'CHUA_GHI'
         END AS ket_qua,
         t.cv_chay, t.cv_ghi, t.hs_chay, t.hs_ghi,
         t.cb_can, t.cb_ghi, t.cb_qua_bd, t.cb_sap
    FROM tong t
   ORDER BY t.full_name
$$;

REVOKE ALL ON FUNCTION public.ct2_nhip_phong_hom_nay(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_nhip_phong_hom_nay(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) «Việc của tôi»: nói rõ thẻ nào đã đến lúc phải chạy
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ct2_viec_cua_toi();

CREATE FUNCTION public.ct2_viec_cua_toi()
RETURNS TABLE (
  id uuid, ma_hien_thi text, tieu_de text, trang_thai text, phan_tram int,
  co_tinh_trang text, han_hoan_thanh date, muc_uu_tien text, loai_dau_viec text,
  lien_phong boolean, phong uuid, nhip_gan_nhat timestamptz,
  da_ghi_nhip_hom_nay boolean, ngay_bat_dau date, ly_do_bao_cao text
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT d.id, d.ma_hien_thi, d.tieu_de, d.trang_thai, d.phan_tram,
         d.co_tinh_trang, d.han_hoan_thanh, d.muc_uu_tien, d.loai_dau_viec,
         d.lien_phong, d.phong, d.nhip_gan_nhat,
         (d.nhip_gan_nhat IS NOT NULL
          AND (d.nhip_gan_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
              = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AS da_ghi_nhip_hom_nay,
         d.ngay_bat_dau,
         public.ct2_vi_sao_phai_bao_cao(
           d.trang_thai, d.loai_dau_viec, d.ngay_bat_dau, d.han_hoan_thanh
         ) AS ly_do_bao_cao
    FROM public.ct2_dau_viec d
   WHERE d.nguoi_chiu_trach_nhiem = public.get_my_profile_id()
     AND d.trang_thai IN ('CHUAN_BI','DANG_LAM','CHO_PHOI_HOP','CHO_DUYET')
   ORDER BY CASE d.co_tinh_trang WHEN 'DO' THEN 0 WHEN 'VANG' THEN 1 ELSE 2 END,
            d.han_hoan_thanh
$$;

REVOKE ALL ON FUNCTION public.ct2_viec_cua_toi() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_viec_cua_toi() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Nhắc nhịp sáng 07:30 nhắc luôn thẻ chưa bắt đầu đã đến lúc phải chạy
--
-- Nếu bảng chấm mà lời nhắc không nhắc thì cán bộ bị trừ vì thứ chưa ai báo —
-- đúng điều ghi chú gốc của hàm này cảnh báo. Nhãn dòng nói rõ vì sao bị gọi
-- tên, để người đọc biết việc cần làm là BẮT ĐẦU chứ không phải chỉ ghi chữ.
-- ---------------------------------------------------------------------------
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
             FILTER (WHERE c.thu_tu <= 3) AS ds_viec
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
    v_tieu_de := 'Sáng nay còn ' || r.dem || ' việc phải ghi nhịp';
    v_noi_dung := r.ds_viec
      || CASE WHEN r.dem > 3 THEN E'\n… và ' || (r.dem - 3) || ' việc nữa' ELSE '' END
      || CASE WHEN r.dem_chua_bat_dau > 0
              THEN E'\nCó ' || r.dem_chua_bat_dau
                   || ' việc chưa bắt đầu đã đến lúc phải chạy — mở việc hoặc báo cáo vướng ở đâu.'
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

    nguoi := r.ai;
    ho_ten := r.ten_nguoi;
    so_viec := r.dem;
    tieu_de := v_tieu_de;
    noi_dung := v_noi_dung;
    da_gui := v_gui;
    RETURN NEXT;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
END
$function$;

REVOKE ALL ON FUNCTION public.ct2_nhac_nhip_sang(boolean, timestamptz) FROM public;
GRANT EXECUTE ON FUNCTION public.ct2_nhac_nhip_sang(boolean, timestamptz) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Chốt sổ nhịp (nguồn của báo cáo tuần/tháng) dùng CHUNG một luật
--
-- Nếu bảng ngày đòi mà chốt sổ không tính thì đến cuối tuần con số tự mâu
-- thuẫn: sáng bảng báo «chưa đủ», cuối tuần báo cáo lại nói «đủ». Ảnh chụp là
-- thứ không sửa lại được sau, nên phải đúng ngay từ hôm chụp.
--
-- Sửa kèm một lệch cũ phát hiện khi rà: hàm chỉ bỏ qua thứ Bảy/Chủ nhật bằng
-- EXTRACT(dow), trong khi cả hệ đã dùng ct2_la_ngay_lam_viec (biết ngày lễ và
-- ngày làm bù). Ngày lễ giữa tuần vẫn chốt sổ nghĩa là chụp một ảnh MẤT NHỊP
-- cho cả chi nhánh vì hôm đó không ai đi làm.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_chot_so_nhip(
  _ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date
)
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

  IF NOT public.ct2_la_ngay_lam_viec(_ngay::timestamptz) THEN
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
   WHERE d.loai_dau_viec = 'TIEN_TRINH'
     AND (
       d.trang_thai = 'DANG_LAM'
       OR (d.trang_thai = 'CHUAN_BI'
           AND public.ct2_vi_sao_phai_bao_cao(
                 d.trang_thai, d.loai_dau_viec, d.ngay_bat_dau, d.han_hoan_thanh,
                 _ngay::timestamptz
               ) IS NOT NULL)
     )
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
