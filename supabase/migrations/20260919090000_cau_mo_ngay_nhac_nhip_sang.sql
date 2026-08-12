-- CÂU MỞ NGÀY cho tin nhắc nhịp 07:30 — 12/08/2026.
--
-- Áp dụng tài liệu thiết kế «Câu mở ngày BHY One» (docs/cau-mo-ngay-nhac-nhip-sang-2026-08.md):
-- tin nhắc nhịp sáng mở bằng MỘT câu ngắn xoay vòng mỗi ngày (kiểu Duolingo), đóng bằng
-- câu luật mốc giờ giữ nguyên — «mở bằng người, đóng bằng luật». Không thêm một tin nào:
-- câu cưỡi lên tin 07:30 sẵn có, người đã ghi xong vẫn không nhận gì.
--
-- Kiến trúc: 3 bảng + 1 hàm chọn câu + 2 view, và sửa ct2_nhac_nhip_sang. Tài liệu gốc
-- viết phần ghép cho edge function TypeScript — nền thật là hàm PL/pgSQL thuần, nên phần
-- ghép được viết lại tại đây; hành vi giữ đúng thiết kế.
--
-- Bốn tính chất hàm chọn câu phải giữ, đừng «tối ưu» mất:
--   1. BẤT BIẾN TRONG NGÀY — gọi bao nhiêu lần cùng một ngày vẫn ra một câu (đọc lịch sử
--      trước khi chọn). Dry-run không ghi gì nên xem trước thoải mái.
--   2. KHÔNG LẶP 63 NGÀY — ưu tiên câu chưa từng phát, rồi câu phát lâu nhất.
--   3. XEN KẼ NHÓM — thu_tu nạp sẵn theo vòng A→B→…→K để hai sáng liền nhau không gõ
--      cùng một cần gạt tâm lý.
--   4. KHÔNG BAO GIỜ VỠ TIN — cạn kho thì nới luật lấy câu lâu nhất; kho rỗng hoặc chế
--      độ «tat» thì trả NULL và tin quay về đúng dạng cũ.

-- ============ 1) Kho câu ============
-- Trần 48 ký tự và lệnh cấm «·» «↳» ép NGAY Ở TẦNG DỮ LIỆU: viết sai là không insert
-- được, không phụ thuộc người nhớ luật.
CREATE TABLE public.ct2_cau_mo_ngay (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  noi_dung text NOT NULL UNIQUE,
  -- Nhóm cần gạt tâm lý (A mở ngày nhẹ · B chuỗi · C gương soi · D gốc rễ 20 năm ·
  -- E nghề ngân hàng · F đồng hồ · G theo thứ · H hệ thống tự trêu · I trì hoãn · K ấm áp)
  nhom text NOT NULL CHECK (nhom ~ '^[A-K]$'),
  -- 2..6 = chỉ phát đúng thứ Hai..thứ Sáu đó; NULL = mọi ngày
  thu int CHECK (thu BETWEEN 2 AND 6),
  -- Dùng được vào ngày nhạy cảm (chế độ an_toan)?
  an_toan boolean NOT NULL DEFAULT false,
  -- TCTH tắt một câu khi có cán bộ phản ánh: set false, không tranh luận
  dang_dung boolean NOT NULL DEFAULT true,
  -- Thứ tự phát xen kẽ nhóm: hạng-trong-nhóm × 100 + số-nhóm (A=1…K=10)
  thu_tu int NOT NULL,
  lan_cuoi_phat date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cau_toi_da_48_ky_tu CHECK (char_length(btrim(noi_dung)) BETWEEN 10 AND 48),
  CONSTRAINT cau_khong_ky_tu_cam CHECK (noi_dung !~ '[·↳]')
);
COMMENT ON TABLE public.ct2_cau_mo_ngay IS
  'Kho câu mở ngày cho tin nhắc nhịp 07:30. TCTH quản kho; câu bị phản ánh thì set dang_dung=false ngay trong ngày, không tranh luận.';

-- ============ 2) Lịch sử — mỗi ngày một dòng ============
CREATE TABLE public.ct2_lich_su_cau_mo_ngay (
  ngay date PRIMARY KEY,
  cau_id uuid REFERENCES public.ct2_cau_mo_ngay(id),  -- NULL = hôm đó tắt câu
  che_do text NOT NULL DEFAULT 'binh_thuong' CHECK (che_do IN ('binh_thuong', 'an_toan', 'tat')),
  so_nguoi_nhan int,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ct2_lich_su_cau_mo_ngay IS
  'Hôm nào phát câu nào, chế độ gì, bao nhiêu người nhận — nguồn cho tính bất biến trong ngày và cho view hiệu quả.';

-- ============ 3) Chế độ theo ngày ============
CREATE TABLE public.ct2_che_do_cau_mo_ngay (
  ngay date PRIMARY KEY,
  che_do text NOT NULL CHECK (che_do IN ('an_toan', 'tat')),
  ly_do text,
  nguoi_dat text,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.ct2_che_do_cau_mo_ngay IS
  'TCTH chèn 1 dòng để bật an_toan (chỉ dùng câu trung tính) hoặc tat (không câu nào) cho một ngày. '
  'TCTH được TỰ QUYẾT không cần xin ý kiến, chỉ báo lại sau — chi phí bất đối xứng thì quyền đặt ở phía rẻ hơn.';

-- ============ RLS: ai cũng đọc được, chỉ TCTH/quản trị sửa ============
ALTER TABLE public.ct2_cau_mo_ngay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_lich_su_cau_mo_ngay ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_che_do_cau_mo_ngay ENABLE ROW LEVEL SECURITY;

CREATE POLICY doc_kho_cau ON public.ct2_cau_mo_ngay FOR SELECT TO authenticated USING (true);
CREATE POLICY sua_kho_cau ON public.ct2_cau_mo_ngay FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role));

CREATE POLICY doc_lich_su_cau ON public.ct2_lich_su_cau_mo_ngay FOR SELECT TO authenticated USING (true);
CREATE POLICY sua_lich_su_cau ON public.ct2_lich_su_cau_mo_ngay FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role));

CREATE POLICY doc_che_do_cau ON public.ct2_che_do_cau_mo_ngay FOR SELECT TO authenticated USING (true);
CREATE POLICY sua_che_do_cau ON public.ct2_che_do_cau_mo_ngay FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'system_admin'::app_role) OR public.has_role(auth.uid(), 'tcth_admin'::app_role));

-- ============ 4) Hàm chọn câu ============
CREATE OR REPLACE FUNCTION public.ct2_chon_cau_mo_ngay(
  _ngay date DEFAULT ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date),
  _ghi boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_che_do text;
  v_id uuid;
  v_cau text;
  v_thu int := EXTRACT(isodow FROM _ngay)::int + 1;  -- T2=2 … T6=6
BEGIN
  -- Ghi lịch sử là việc của hệ thống: cron (không có auth.uid) hoặc TCTH/quản trị.
  IF _ghi AND auth.uid() IS NOT NULL AND NOT (
    public.has_role(auth.uid(), 'system_admin'::app_role)
    OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Chỉ TCTH/quản trị hệ thống được ghi lịch sử câu mở ngày';
  END IF;

  -- BẤT BIẾN TRONG NGÀY: đã chốt câu của ngày này thì trả đúng câu đó, kể cả gọi lại
  SELECT l.cau_id INTO v_id FROM public.ct2_lich_su_cau_mo_ngay l WHERE l.ngay = _ngay;
  IF FOUND THEN
    IF v_id IS NULL THEN RETURN NULL; END IF;  -- hôm đó đã tắt
    SELECT c.noi_dung INTO v_cau FROM public.ct2_cau_mo_ngay c WHERE c.id = v_id;
    RETURN v_cau;
  END IF;

  SELECT c.che_do INTO v_che_do FROM public.ct2_che_do_cau_mo_ngay c WHERE c.ngay = _ngay;
  IF v_che_do = 'tat' THEN
    IF _ghi THEN
      INSERT INTO public.ct2_lich_su_cau_mo_ngay (ngay, cau_id, che_do)
      VALUES (_ngay, NULL, 'tat') ON CONFLICT (ngay) DO NOTHING;
    END IF;
    RETURN NULL;
  END IF;

  -- Chọn: chưa phát trước hết (lan_cuoi_phat NULL đứng đầu), rồi phát lâu nhất,
  -- rồi thu_tu xen kẽ nhóm. Không lặp trong 63 ngày dương lịch.
  SELECT c.id, c.noi_dung INTO v_id, v_cau
    FROM public.ct2_cau_mo_ngay c
   WHERE c.dang_dung
     AND (c.thu IS NULL OR c.thu = v_thu)
     AND (v_che_do IS DISTINCT FROM 'an_toan' OR c.an_toan)
     AND (c.lan_cuoi_phat IS NULL OR c.lan_cuoi_phat <= _ngay - 63)
   ORDER BY c.lan_cuoi_phat ASC NULLS FIRST, c.thu_tu, c.id
   LIMIT 1;

  -- Cạn kho: nới điều kiện 63 ngày, lấy câu lâu nhất — không bao giờ để tin thiếu dòng đầu
  IF v_id IS NULL THEN
    SELECT c.id, c.noi_dung INTO v_id, v_cau
      FROM public.ct2_cau_mo_ngay c
     WHERE c.dang_dung
       AND (c.thu IS NULL OR c.thu = v_thu)
       AND (v_che_do IS DISTINCT FROM 'an_toan' OR c.an_toan)
     ORDER BY c.lan_cuoi_phat ASC NULLS FIRST, c.thu_tu, c.id
     LIMIT 1;
  END IF;

  IF v_id IS NULL THEN RETURN NULL; END IF;  -- kho rỗng thật sự → tin về dạng cũ

  IF _ghi THEN
    INSERT INTO public.ct2_lich_su_cau_mo_ngay (ngay, cau_id, che_do)
    VALUES (_ngay, v_id, COALESCE(v_che_do, 'binh_thuong')) ON CONFLICT (ngay) DO NOTHING;
    UPDATE public.ct2_cau_mo_ngay SET lan_cuoi_phat = _ngay WHERE id = v_id;
  END IF;

  RETURN v_cau;
END
$function$;

COMMENT ON FUNCTION public.ct2_chon_cau_mo_ngay(date, boolean) IS
  'Câu mở ngày của một ngày. _ghi=false (mặc định) chỉ xem trước; _ghi=true chốt vào lịch sử — '
  'chỉ ct2_nhac_nhip_sang gọi với true, và chỉ khi có ít nhất một người nhận tin.';

REVOKE ALL ON FUNCTION public.ct2_chon_cau_mo_ngay(date, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.ct2_chon_cau_mo_ngay(date, boolean) TO authenticated;

-- ============ 5) Hai view theo dõi ============
CREATE OR REPLACE VIEW public.ct2_suc_khoe_kho_cau AS
SELECT nhom,
       count(*) AS tong,
       count(*) FILTER (WHERE dang_dung) AS dang_dung,
       count(*) FILTER (WHERE dang_dung AND an_toan) AS dung_duoc_ngay_cang,
       count(*) FILTER (WHERE dang_dung AND lan_cuoi_phat IS NULL) AS chua_tung_phat,
       count(*) FILTER (WHERE dang_dung AND (lan_cuoi_phat IS NULL
         OR lan_cuoi_phat <= ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 63))) AS san_sang_phat
FROM public.ct2_cau_mo_ngay
GROUP BY nhom ORDER BY nhom;
COMMENT ON VIEW public.ct2_suc_khoe_kho_cau IS
  'TCTH xem sức khỏe kho. Bổ sung câu khi tổng số san_sang_phat xuống dưới 25.';

-- Đo hiệu quả KHÔNG đụng vào hàm chốt sổ: người nhận tin 07:30 chính là các dòng
-- NHIP_SANG trong ct2_thong_bao, kết quả ngày của họ nằm sẵn trong ct2_anh_chup_nhip —
-- view ráp hai nguồn đó, khỏi phải sửa ct2_chot_so_nhip để ghi thêm số liệu.
-- Đọc khiêm tốn: ~20 người/ngày chỉ đủ LOẠI NHÓM TỆ sau ~60 ngày, không đủ tìm câu hay.
CREATE OR REPLACE VIEW public.ct2_hieu_qua_theo_nhom AS
WITH nguoi_nhan AS (
  SELECT (t.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS ngay, t.nguoi_nhan AS nguoi
  FROM public.ct2_thong_bao t
  WHERE t.ma_su_kien = 'NHIP_SANG'
)
SELECT k.nhom,
       count(DISTINCT l.ngay) AS so_ngay_phat,
       count(a.nguoi) AS luot_do_duoc,
       round(100.0 * count(*) FILTER (WHERE a.ket_qua = 'DUNG_GIO')
             / NULLIF(count(a.nguoi), 0)) AS ti_le_dung_gio
FROM public.ct2_lich_su_cau_mo_ngay l
JOIN public.ct2_cau_mo_ngay k ON k.id = l.cau_id
JOIN nguoi_nhan n ON n.ngay = l.ngay
LEFT JOIN public.ct2_anh_chup_nhip a ON a.ngay = l.ngay AND a.nguoi = n.nguoi
GROUP BY k.nhom ORDER BY k.nhom;
COMMENT ON VIEW public.ct2_hieu_qua_theo_nhom IS
  'Trong số người NHẬN tin 07:30, bao nhiêu phần trăm kết ngày ĐÚNG GIỜ — gộp theo nhóm câu. '
  'Chỉ dùng để loại nhóm kém qua nhiều lượt, không dùng để khen từng câu.';

-- ============ 6) Ghép vào tin 07:30 — sửa ct2_nhac_nhip_sang ============
-- Hai thay đổi so với bản 12/08 sáng:
--   a. Dòng đầu = câu mở ngày («mở bằng người, đóng bằng luật»). Kho rỗng/chế độ tắt
--      thì tin về đúng dạng cũ, không dòng thừa.
--   b. Danh sách việc cắt 3 → 2 (kèm «… và N việc nữa») để tổng tin giữ trong 5 dòng
--      khi có thêm dòng câu. Hiện chưa ai quá 2 việc nên hôm nay không đổi tin của ai —
--      đây là chốt phòng cho mai sau.
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
    -- Câu mở ngày: lấy MỘT lần cho cả đợt, và chỉ khi thật sự có người nhận —
    -- nếu cả chi nhánh đã ghi xong trước 07:30 thì không «đốt» câu của hôm đó.
    IF NOT v_cau_da_lay THEN
      v_cau := public.ct2_chon_cau_mo_ngay(ngay_vn, _that);
      v_cau_da_lay := true;
    END IF;

    v_tieu_de := 'Sáng nay còn ' || r.dem || ' việc phải ghi nhịp';
    v_noi_dung := COALESCE(v_cau || E'\n', '')
      || r.ds_viec
      || CASE WHEN r.dem > 2 THEN E'\n… và ' || (r.dem - 2) || ' việc nữa' ELSE '' END
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

  -- Ghi số người nhận để view hiệu quả đối chiếu với ảnh chụp nhịp sau chốt sổ
  IF _that AND v_dem > 0 THEN
    UPDATE public.ct2_lich_su_cau_mo_ngay SET so_nguoi_nhan = v_dem WHERE ngay = ngay_vn;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
END
$function$;
