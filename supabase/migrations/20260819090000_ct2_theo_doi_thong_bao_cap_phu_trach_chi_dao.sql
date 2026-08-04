-- ============================================================================
-- CHIÊU THỨC 2 — Thông báo tới đủ cấp phụ trách · GĐ theo dõi phòng/thẻ ·
-- nguồn việc «Chỉ đạo của cấp trên»
--
-- Yêu cầu của Giám đốc Chi nhánh (08/2026):
--  1. Cán bộ ghi nhịp HOẶC bất kỳ ai trao đổi → thông báo tối thiểu tới:
--     cán bộ, Phó phòng, Trưởng phòng, PGĐ phụ trách (trước đây: nhịp không
--     báo ai; trao đổi chỉ báo cán bộ + người phối hợp + người được nhắc).
--  2. Giám đốc theo dõi được CẢ PHÒNG hoặc TỪNG THẺ — bảng ct2_theo_doi,
--     người theo dõi nhận cùng luồng thông báo.
--  3. Nguồn việc thêm «Do chỉ đạo của cấp trên» bên cạnh kế hoạch / kết luận
--     giao ban / chủ động.
--
-- Trần chống nhiễu GIỮ NGUYÊN: ct2_dat_thong_bao vẫn áp trần thông báo NHẸ
-- mỗi người mỗi ngày (mặc định 3, TCTH chỉnh trong «Cài đặt ngày giờ») và tự
-- bỏ qua người tự thao tác. «Tối thiểu những người này TRONG DANH SÁCH nhận»
-- — không có nghĩa là bỏ van chống dội tin.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Nguồn việc thêm CHI_DAO
-- ---------------------------------------------------------------------------
ALTER TABLE public.ct2_dau_viec DROP CONSTRAINT IF EXISTS ct2_dau_viec_nguon_viec_check;
ALTER TABLE public.ct2_dau_viec ADD CONSTRAINT ct2_dau_viec_nguon_viec_check
  CHECK (nguon_viec = ANY (ARRAY['KE_HOACH','GIAO_BAN','CHU_DONG','CHI_DAO']));

-- ---------------------------------------------------------------------------
-- 2) Theo dõi — GĐ (hoặc lãnh đạo bất kỳ) đăng ký nhận tin cả phòng / từng thẻ
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct2_theo_doi (
  nguoi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pham_vi text NOT NULL CHECK (pham_vi IN ('PHONG', 'DAU_VIEC')),
  doi_tuong_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (nguoi, pham_vi, doi_tuong_id)
);

GRANT SELECT, INSERT, DELETE ON public.ct2_theo_doi TO authenticated;
GRANT ALL ON public.ct2_theo_doi TO service_role;
ALTER TABLE public.ct2_theo_doi ENABLE ROW LEVEL SECURITY;

-- Ai cũng chỉ thấy/đặt/bỏ theo dõi CỦA CHÍNH MÌNH — trigger thông báo đọc
-- bảng này bằng SECURITY DEFINER nên không cần policy rộng hơn.
CREATE POLICY "ct2 xem theo doi cua minh" ON public.ct2_theo_doi FOR SELECT TO authenticated
  USING (nguoi = public.get_my_profile_id());
CREATE POLICY "ct2 dat theo doi" ON public.ct2_theo_doi FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND nguoi = public.get_my_profile_id());
CREATE POLICY "ct2 bo theo doi" ON public.ct2_theo_doi FOR DELETE TO authenticated
  USING (nguoi = public.get_my_profile_id());

-- ---------------------------------------------------------------------------
-- 3) MỘT hàm trả về danh sách nhận thông báo của một đầu việc
--    — mọi trigger cùng đọc, sửa luật một chỗ
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_ds_nhan_dau_viec(_dau_viec_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(ARRAY(
    SELECT DISTINCT x FROM (
      -- Cán bộ + người phối hợp + đủ ba cấp phụ trách + lãnh đạo theo dõi
      SELECT unnest(
        ARRAY[d.nguoi_chiu_trach_nhiem, d.pho_phong, d.truong_phong,
              d.pgd_phu_trach, d.lanh_dao_theo_doi]
        || COALESCE(d.nguoi_phoi_hop, '{}')
      ) AS x
        FROM public.ct2_dau_viec d WHERE d.id = _dau_viec_id
      UNION
      -- Người bấm «Theo dõi» thẻ này hoặc theo dõi cả phòng chứa thẻ
      SELECT t.nguoi
        FROM public.ct2_theo_doi t
       WHERE (t.pham_vi = 'DAU_VIEC' AND t.doi_tuong_id = _dau_viec_id)
          OR (t.pham_vi = 'PHONG' AND t.doi_tuong_id =
                (SELECT d2.phong FROM public.ct2_dau_viec d2 WHERE d2.id = _dau_viec_id))
    ) s
    WHERE x IS NOT NULL
  ), '{}')
$$;
REVOKE ALL ON FUNCTION public.ct2_ds_nhan_dau_viec(uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Ghi nhịp phát thông báo — trước đây nhịp KHÔNG báo ai cả, tức stand-up
--    sáng chỉ ai mở bảng mới thấy. Cờ đỏ (đang vướng) đi mức DO cho nổi lên.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_nhip()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2tbn$
DECLARE
  ten_nguoi text;
  tieu_de_dv text;
  ds uuid[];
  nguoi uuid;
  co_gui boolean := false;
BEGIN
  SELECT p.full_name INTO ten_nguoi FROM public.profiles p WHERE p.id = NEW.nguoi_ghi;
  SELECT d.tieu_de INTO tieu_de_dv FROM public.ct2_dau_viec d WHERE d.id = NEW.dau_viec_id;
  ds := public.ct2_ds_nhan_dau_viec(NEW.dau_viec_id);

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
         -- Cờ đỏ là điểm nghẽn cần tác động — đi mức DO (kèm email), không chịu
         -- trần thông báo nhẹ. Xanh/vàng đi mức NHẸ, chịu trần chống nhiễu.
         CASE WHEN NEW.co_tinh_trang = 'DO' THEN 'DO' ELSE 'NHE' END,
         NEW.dau_viec_id
       ) THEN co_gui := true;
    END IF;
  END LOOP;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $ct2tbn$;

DROP TRIGGER IF EXISTS trg_ct2_thong_bao_nhip ON public.ct2_nhip_pdca;
CREATE TRIGGER trg_ct2_thong_bao_nhip
  AFTER INSERT ON public.ct2_nhip_pdca
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_thong_bao_nhip();

REVOKE ALL ON FUNCTION public.f_ct2_thong_bao_nhip() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Trao đổi trên ĐẦU VIỆC: người nhận mở rộng ra đủ cấp phụ trách + người
--    theo dõi (các phạm vi khác giữ nguyên luật cũ)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_binh_luan()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $ct2tbb$
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
    -- Đủ cấp phụ trách + người theo dõi — cùng danh sách với thông báo nhịp
    ds_nhan := public.ct2_ds_nhan_dau_viec(NEW.doi_tuong_id);
  ELSIF NEW.pham_vi = 'HO_SO_TIN_DUNG' THEN
    SELECT h.khach_hang, ARRAY[h.can_bo] || COALESCE(ARRAY[h.nguoi_dang_giu], '{}')
      INTO tieu_de_dt, ds_nhan
      FROM public.ct2_ho_so_tin_dung h WHERE h.id = NEW.doi_tuong_id;
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
END $ct2tbb$;

REVOKE ALL ON FUNCTION public.f_ct2_thong_bao_binh_luan() FROM PUBLIC, anon, authenticated;
