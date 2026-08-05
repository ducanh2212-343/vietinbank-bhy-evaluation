-- «Lãnh đạo theo dõi» là MỘT trong ba cấp phụ trách + thang thông báo phân tầng
--
-- Giám đốc hỏi: nếu «Theo dõi Đỗ Việt Anh» trùng «TP Đỗ Việt Anh» thì ô kia để
-- làm gì? Rà ra thì đúng — hai khái niệm đang gần như trùng nhau THẬT:
-- ct2_ds_nhan_dau_viec() gộp cả năm người vào một rổ DISTINCT nên mọi nhịp và
-- trao đổi ai cũng nhận y hệt ai; chỉ hai loại tin hiếm mới đi riêng.
--
-- Định nghĩa chốt:
--   · Ba cấp phụ trách  = ai chịu trách nhiệm theo TUYẾN (tương đối tĩnh).
--   · Lãnh đạo theo dõi = ai TRONG ba cấp đó đang trực tiếp bám việc này.
-- Trùng tên khi đó không phải lỗi mà là thông tin: Trưởng phòng tự bám việc,
-- không giao xuống Phó phòng.

-- ---------------------------------------------------------------------------
-- 1) Bù dữ liệu TRƯỚC khi dựng rào
-- ---------------------------------------------------------------------------
-- 10 hồ sơ PDTD nhập từ Miro ghi lãnh đạo theo dõi là Lê Văn Trưởng / Phạm Thị
-- Diễm Ly — cả hai KHÔNG phải Trưởng phòng KHDN nên sẽ vướng rào mới. Nhưng hồ
-- sơ cá nhân của chính họ ghi position = 'Phó phòng KHDN'. Vậy điền `pho_phong`
-- bằng chính người đó là ĐỌC hồ sơ của họ, không phải gán cấp bậc mới cho ai.
UPDATE public.ct2_ho_so_tin_dung hs
   SET pho_phong = hs.lanh_dao_theo_doi
  FROM public.profiles p
 WHERE p.id = hs.lanh_dao_theo_doi
   AND hs.pho_phong IS NULL
   AND hs.lanh_dao_theo_doi IS NOT NULL
   AND p.position ILIKE 'Phó phòng%'
   AND p.department_id = hs.phong;

-- ---------------------------------------------------------------------------
-- 2) Rào: lãnh đạo theo dõi phải thuộc ba cấp phụ trách
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_lanh_dao_hop_le(
  _ldtd uuid, _pho_phong uuid, _truong_phong uuid, _pgd uuid, _phong uuid)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT _ldtd IS NULL
      OR COALESCE(_ldtd = ANY(ARRAY[_pho_phong, _truong_phong, _pgd]), false)
      -- Trưởng phòng của phòng đó và Ban Giám đốc là lãnh đạo theo chức danh,
      -- hợp lệ ngay cả khi ba ô của thẻ còn trống
      OR public.ct2_tu_theo_doi_duoc(_ldtd, _phong)
$$;

CREATE OR REPLACE FUNCTION public.f_ct2_lanh_dao_thuoc_cap_phu_trach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Chỉ soi khi giá trị VỪA ĐƯỢC ĐẶT hoặc ĐỔI. Dòng cũ mang giá trị lịch sử đi
  -- qua bình thường — cùng khuôn «hàng rào chặn ghi mới, không chặn dữ liệu đã
  -- có» đã dùng ở các đợt nhập liệu trước. Chặn cả dòng cũ thì mọi thao tác
  -- không liên quan trên thẻ đó cũng chết theo.
  IF TG_OP = 'UPDATE' AND NEW.lanh_dao_theo_doi IS NOT DISTINCT FROM OLD.lanh_dao_theo_doi THEN
    RETURN NEW;
  END IF;
  IF NOT public.ct2_lanh_dao_hop_le(
       NEW.lanh_dao_theo_doi, NEW.pho_phong, NEW.truong_phong, NEW.pgd_phu_trach, NEW.phong) THEN
    RAISE EXCEPTION 'Lãnh đạo theo dõi phải là một trong ba cấp phụ trách của thẻ (Phó phòng / Trưởng phòng / PGĐ phụ trách)';
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_ct2_dv_lanh_dao_thuoc_cap ON public.ct2_dau_viec;
CREATE TRIGGER trg_ct2_dv_lanh_dao_thuoc_cap
  BEFORE INSERT OR UPDATE ON public.ct2_dau_viec
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_lanh_dao_thuoc_cap_phu_trach();

DROP TRIGGER IF EXISTS trg_ct2_hs_lanh_dao_thuoc_cap ON public.ct2_ho_so_tin_dung;
CREATE TRIGGER trg_ct2_hs_lanh_dao_thuoc_cap
  BEFORE INSERT OR UPDATE ON public.ct2_ho_so_tin_dung
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_lanh_dao_thuoc_cap_phu_trach();

-- ---------------------------------------------------------------------------
-- 3) Hai danh sách nhận thay cho một
-- ---------------------------------------------------------------------------
-- Nguyên tắc: NGƯỜI BÁM SÁT nghe nhịp thở hằng ngày; CẤP TRÊN chỉ nghe khi có
-- chuyện. Trước đây cả năm người cùng nghe mọi thứ — đó là công thức để tất cả
-- cùng tắt thông báo, và lúc đó tin cờ đỏ chết theo.

CREATE OR REPLACE FUNCTION public.ct2_ds_nhan_hang_ngay(_dau_viec_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(ARRAY(
    SELECT DISTINCT x FROM (
      SELECT unnest(ARRAY[d.nguoi_chiu_trach_nhiem, d.lanh_dao_theo_doi]
                    || COALESCE(d.nguoi_phoi_hop, '{}')) AS x
        FROM public.ct2_dau_viec d WHERE d.id = _dau_viec_id
      UNION
      -- Người tự bấm «👁 Theo dõi» thì họ CHỌN nhận đủ, không cắt của họ
      SELECT t.nguoi FROM public.ct2_theo_doi t
       WHERE (t.pham_vi = 'DAU_VIEC' AND t.doi_tuong_id = _dau_viec_id)
          OR (t.pham_vi = 'PHONG' AND t.doi_tuong_id =
                (SELECT d2.phong FROM public.ct2_dau_viec d2 WHERE d2.id = _dau_viec_id))
    ) s WHERE x IS NOT NULL
  ), '{}')
$function$;

CREATE OR REPLACE FUNCTION public.ct2_ds_nhan_khi_co_chuyen(_dau_viec_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(ARRAY(
    SELECT DISTINCT x FROM (
      SELECT unnest(public.ct2_ds_nhan_hang_ngay(_dau_viec_id)) AS x
      UNION
      SELECT unnest(ARRAY[d.pho_phong, d.truong_phong, d.pgd_phu_trach])
        FROM public.ct2_dau_viec d WHERE d.id = _dau_viec_id
    ) s WHERE x IS NOT NULL
  ), '{}')
$function$;

CREATE OR REPLACE FUNCTION public.ct2_ds_nhan_ho_so(_ho_so_id uuid, _co_chuyen boolean DEFAULT false)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(ARRAY(
    SELECT DISTINCT x FROM (
      SELECT unnest(
        ARRAY[h.can_bo, h.lanh_dao_theo_doi, h.nguoi_dang_giu]
        || CASE WHEN _co_chuyen
                THEN ARRAY[h.pho_phong, h.truong_phong, h.pgd_phu_trach]
                ELSE '{}'::uuid[] END
      ) AS x
        FROM public.ct2_ho_so_tin_dung h WHERE h.id = _ho_so_id
    ) s WHERE x IS NOT NULL
  ), '{}')
$function$;

REVOKE ALL ON FUNCTION public.ct2_ds_nhan_hang_ngay(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ct2_ds_nhan_khi_co_chuyen(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ct2_ds_nhan_ho_so(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_ds_nhan_hang_ngay(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ct2_ds_nhan_khi_co_chuyen(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ct2_ds_nhan_ho_so(uuid, boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Nhịp: cờ đỏ đi rộng, xanh/vàng đi hẹp
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_nhip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ten_nguoi text;
  tieu_de_dv text;
  ds uuid[];
  nguoi uuid;
  co_gui boolean := false;
BEGIN
  SELECT p.full_name INTO ten_nguoi FROM public.profiles p WHERE p.id = NEW.nguoi_ghi;
  SELECT d.tieu_de INTO tieu_de_dv FROM public.ct2_dau_viec d WHERE d.id = NEW.dau_viec_id;

  -- Đây là chỗ hai khái niệm tách nhau ra thật: cờ đỏ («đang vướng») là điểm
  -- nghẽn — cả tuyến phụ trách phải thấy. Nhịp xanh/vàng là nhịp thở hằng ngày
  -- — chỉ người bám sát nghe.
  ds := CASE WHEN NEW.co_tinh_trang = 'DO'
             THEN public.ct2_ds_nhan_khi_co_chuyen(NEW.dau_viec_id)
             ELSE public.ct2_ds_nhan_hang_ngay(NEW.dau_viec_id) END;

  FOREACH nguoi IN ARRAY ds LOOP
    IF public.ct2_dat_thong_bao(
         'NHIP', nguoi,
         COALESCE(ten_nguoi, 'Đồng nghiệp')
           || CASE WHEN NEW.co_tinh_trang = 'DO' THEN ' báo ĐANG VƯỚNG'
                   WHEN NEW.co_tinh_trang = 'VANG' THEN ' báo có rủi ro'
                   ELSE ' vừa ghi nhịp' END,
         '«' || COALESCE(tieu_de_dv, 'đầu việc') || '» ' || NEW.phan_tram || '%: '
           || left(NEW.noi_dung, 140)
           || COALESCE(E'\n↳ Vướng: ' || left(NEW.vuong_mac, 100), ''),
         CASE WHEN NEW.co_tinh_trang = 'DO' THEN 'DO' ELSE 'NHE' END,
         NEW.dau_viec_id
       ) THEN co_gui := true;
    END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- ---------------------------------------------------------------------------
-- 5) Trao đổi: chỉ người bám sát + người được nhắc tên
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_binh_luan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ten_nguoi_gui text;
  tieu_de_dt text := 'Trao đổi mới';
  nguoi uuid;
  ds_nhan uuid[] := '{}';
  co_gui boolean := false;
BEGIN
  SELECT p.full_name INTO ten_nguoi_gui FROM public.profiles p WHERE p.id = NEW.nguoi_gui;

  IF NEW.pham_vi = 'DAU_VIEC' THEN
    SELECT d.tieu_de INTO tieu_de_dt FROM public.ct2_dau_viec d WHERE d.id = NEW.doi_tuong_id;
    -- Trao đổi là sinh hoạt hằng ngày. Cấp trên muốn nghe đủ thì bấm «Theo dõi»,
    -- còn mặc định đẩy mọi câu hỏi vặt lên PGĐ là cách nhanh nhất để PGĐ tắt tin.
    ds_nhan := public.ct2_ds_nhan_hang_ngay(NEW.doi_tuong_id);
  ELSIF NEW.pham_vi = 'HO_SO_TIN_DUNG' THEN
    SELECT h.khach_hang INTO tieu_de_dt
      FROM public.ct2_ho_so_tin_dung h WHERE h.id = NEW.doi_tuong_id;
    ds_nhan := public.ct2_ds_nhan_ho_so(NEW.doi_tuong_id, false);
  ELSIF NEW.pham_vi = 'THE_KANBAN' THEN
    SELECT c.title, ARRAY[c.profile_id] INTO tieu_de_dt, ds_nhan
      FROM public.kanban_cards c WHERE c.id = NEW.doi_tuong_id;
  END IF;

  IF NEW.cha_id IS NOT NULL THEN
    SELECT ds_nhan || b.nguoi_gui INTO ds_nhan
      FROM public.ct2_binh_luan b WHERE b.id = NEW.cha_id;
  END IF;

  ds_nhan := COALESCE(ds_nhan, '{}') || COALESCE(NEW.nhac_ten, '{}');

  SELECT COALESCE(ARRAY(SELECT DISTINCT x FROM unnest(ds_nhan) AS x WHERE x IS NOT NULL), '{}')
    INTO ds_nhan;

  FOREACH nguoi IN ARRAY ds_nhan
  LOOP
    IF public.ct2_dat_thong_bao(
         'N12', nguoi,
         CASE WHEN nguoi = ANY(COALESCE(NEW.nhac_ten, '{}'))
              THEN ten_nguoi_gui || ' nhắc tên anh/chị'
              ELSE ten_nguoi_gui || ' vừa trao đổi' END,
         '«' || tieu_de_dt || '»: ' || left(NEW.noi_dung, 160)
           || CASE WHEN NEW.can_tra_loi THEN E'\n↳ Được đánh dấu «Cần trả lời».' ELSE '' END,
         'NHE', CASE WHEN NEW.pham_vi = 'DAU_VIEC' THEN NEW.doi_tuong_id ELSE NULL END
       ) THEN co_gui := true;
    END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- ---------------------------------------------------------------------------
-- 6) Đầu việc: Dừng/Hủy và lùi hạn là chuyện cả tuyến phải biết
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_dau_viec()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  co_gui boolean := false;
  nguoi uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF public.ct2_dat_thong_bao(
         'N13', NEW.nguoi_chiu_trach_nhiem, 'Anh/chị vừa được giao một việc',
         '«' || NEW.tieu_de || '» — hạn '
           || COALESCE(to_char(NEW.han_hoan_thanh, 'DD/MM/YYYY'), 'chưa đặt')
           || '. Khi bắt tay làm, mở thẻ bấm «Bắt đầu làm».',
         'NHE', NEW.id) THEN co_gui := true;
    END IF;

  ELSE
    IF NEW.muc_uu_tien = 'TRONG_DIEM_BGD' AND OLD.muc_uu_tien <> 'TRONG_DIEM_BGD' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao(
             'N14', nguoi, 'Ban Giám đốc đặt việc này là TRỌNG ĐIỂM',
             '«' || NEW.tieu_de || '» nay là việc trọng điểm của BGĐ.', 'DO', NEW.id)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;

    IF NEW.nguoi_dang_giu IS NOT NULL
       AND NEW.nguoi_dang_giu IS DISTINCT FROM OLD.nguoi_dang_giu THEN
      IF public.ct2_dat_thong_bao(
           'N7', NEW.nguoi_dang_giu, 'Có việc đang chờ ý kiến của anh/chị',
           '«' || NEW.tieu_de || '» vừa được chuyển sang chờ anh/chị. '
             || 'Đồng hồ chờ tính từ bây giờ.', 'NHE', NEW.id)
      THEN co_gui := true; END IF;
    END IF;

    IF NEW.trang_thai = 'HOAN_THANH' AND OLD.trang_thai <> 'HOAN_THANH' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao(
             'N15', nguoi, 'Có việc chờ anh/chị chốt',
             '«' || NEW.tieu_de || '» đã báo hoàn thành, mời anh/chị rà và đóng thẻ.',
             'NHE', NEW.id)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;

    -- MỚI: Dừng/Hủy — quyết định bỏ một việc, cả tuyến phụ trách phải biết
    IF NEW.trang_thai = 'DUNG_HUY' AND OLD.trang_thai <> 'DUNG_HUY' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao(
             'N16', nguoi, 'Một đầu việc vừa bị Dừng/Hủy',
             '«' || NEW.tieu_de || '». Lý do: ' || left(COALESCE(NEW.ly_do_dung_huy, ''), 160),
             'DO', NEW.id)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;

    -- MỚI: lùi hạn — thước đo đúng hẹn bị dời thì cấp trên phải thấy
    IF NEW.han_hoan_thanh IS DISTINCT FROM OLD.han_hoan_thanh
       AND OLD.han_hoan_thanh IS NOT NULL AND NEW.han_hoan_thanh IS NOT NULL
       AND NEW.han_hoan_thanh > OLD.han_hoan_thanh THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao(
             'N17', nguoi, 'Một đầu việc vừa lùi hạn',
             '«' || NEW.tieu_de || '»: ' || to_char(OLD.han_hoan_thanh, 'DD/MM/YYYY')
               || ' → ' || to_char(NEW.han_hoan_thanh, 'DD/MM/YYYY') || '.',
             'DO', NEW.id)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- ---------------------------------------------------------------------------
-- 7) PDTD: ba cấp phụ trách vừa thêm hôm qua chưa được dùng để báo cho ai
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_ho_so()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  co_gui boolean := false;
  tien text;
  nguoi uuid;
BEGIN
  tien := CASE
    WHEN NEW.so_tien IS NULL THEN 'chưa có số tiền'
    WHEN NEW.so_tien >= 1000 THEN round(NEW.so_tien / 1000.0, 1)::text || ' tỷ'
    ELSE NEW.so_tien::text || ' triệu' END;

  IF TG_OP = 'INSERT' THEN
    IF public.ct2_dat_thong_bao(
         'HS_GIAO', NEW.can_bo, 'Anh/chị được giao một hồ sơ tín dụng',
         NEW.khach_hang || ' — ' || tien || ', hạn xử lý '
           || COALESCE(to_char(NEW.han_xu_ly, 'DD/MM/YYYY'), 'chưa đặt') || '.', 'NHE', NULL)
    THEN co_gui := true; END IF;

  ELSE
    IF NEW.nguoi_dang_giu IS NOT NULL
       AND NEW.nguoi_dang_giu IS DISTINCT FROM OLD.nguoi_dang_giu THEN
      IF public.ct2_dat_thong_bao(
           'HS_TRINH', NEW.nguoi_dang_giu, 'Có hồ sơ tín dụng chờ anh/chị',
           NEW.khach_hang || ' — ' || tien
             || '. Hồ sơ vừa được trình lên, đồng hồ chờ tính từ bây giờ.',
           'DO', NULL)
      THEN co_gui := true; END IF;
    END IF;

    IF OLD.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS NULL
       AND NEW.trang_thai <> OLD.trang_thai THEN
      IF public.ct2_dat_thong_bao(
           'HS_TRA', NEW.can_bo, 'Hồ sơ đã có ý kiến cấp trên',
           NEW.khach_hang || ' — ' || tien || ' đã chuyển sang bước tiếp theo.',
           'NHE', NULL)
      THEN co_gui := true; END IF;
    END IF;

    -- Hồ sơ bị dừng: tiền của khách và uy tín Chi nhánh — cả tuyến phải biết,
    -- không chỉ cán bộ ôm hồ sơ.
    IF NEW.trang_thai = 'TU_CHOI' AND OLD.trang_thai <> 'TU_CHOI' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_ho_so(NEW.id, true) LOOP
        IF public.ct2_dat_thong_bao(
             'HS_TU_CHOI', nguoi, 'Hồ sơ tín dụng bị dừng',
             NEW.khach_hang || ' — ' || tien || '. Lý do: '
               || left(COALESCE(NEW.ly_do_tu_choi, ''), 160), 'DO', NULL)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;
