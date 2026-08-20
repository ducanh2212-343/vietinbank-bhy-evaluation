-- ============================================================================
-- PHƯƠNG ÁN D — HOÀN THÀNH PHẢI QUA TRƯỞNG PHÒNG DUYỆT (GĐ 15/08)
--
-- Số liệu dẫn tới quyết định: 109 thẻ ở «Hoàn thành», 0 thẻ được lãnh đạo
-- chốt; 31/33 lần chuyển là chủ thẻ tự chuyển; cột «Chờ duyệt» dùng đúng 1
-- lần. Tự hoàn thành = tự thoát lưới nhịp — cùng họ với đường né «nằm ở
-- Chuẩn bị» vừa bịt hôm nay.
--
-- Luật mới: cán bộ KHÔNG tự chuyển được thẻ sang «Hoàn thành». Đường đi:
--   cán bộ đạt 100% → «Trình duyệt hoàn thành» (thẻ vào CHO_DUYET, đồng hồ
--   chờ giao cho Trưởng phòng) → Trưởng phòng DUYỆT (→ HOAN_THANH) hoặc
--   TRẢ LẠI (→ DANG_LAM, kèm lý do trong trao đổi).
-- Đây là chủ ý «nâng cao năng lực quản trị của Trưởng phòng»: mỗi thẻ xong
-- phải qua mắt lãnh đạo một lần, không phải rà hậu kiểm 109 thẻ một thể.
--
-- Push đi kèm (dùng đúng bộ máy người-nhận sẵn có, người thao tác tự bị loại):
--   · N18 — cán bộ trình: báo NGƯỜI GIỮ ĐỒNG HỒ (Trưởng phòng) «chờ anh/chị
--     duyệt hoàn thành».
--   · N19 — Trưởng phòng duyệt: báo cả vòng liên quan qua
--     ct2_ds_nhan_khi_co_chuyen = chủ thẻ + PP/TP + PGĐ PHỤ TRÁCH + người ấn
--     THEO DÕI thẻ/phòng — đúng danh sách GĐ yêu cầu.
--   · N20 — trả lại: báo chủ thẻ, mức ĐỎ vì cần hành động lại ngay.
--
-- Kèm một RPC «hôm nay tôi phải làm gì» cho ô tổng hợp trên trang chủ:
-- ghi nhịp mấy việc (kể cả việc chưa bắt đầu đã đến lúc chạy), mấy thẻ chờ
-- tôi duyệt/cho ý kiến, mấy hồ sơ tín dụng cần nhịp.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Cổng: Hoàn thành là chữ ký của lãnh đạo Phòng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_sua_dau_viec()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  la_lanh_dao boolean := public.ct2_sua_duoc_phong(OLD.phong);
  la_chu_the boolean := (public.get_my_profile_id() = OLD.nguoi_chiu_trach_nhiem);
  la_phoi_hop boolean := (public.get_my_profile_id() = ANY(OLD.nguoi_phoi_hop));
BEGIN
  IF auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NOT la_lanh_dao THEN
    IF NOT la_chu_the AND NOT la_phoi_hop THEN
      RAISE EXCEPTION 'Anh/chị không có quyền sửa đầu việc này';
    END IF;
    IF NEW.tieu_de IS DISTINCT FROM OLD.tieu_de
      OR NEW.nguoi_chiu_trach_nhiem IS DISTINCT FROM OLD.nguoi_chiu_trach_nhiem
      OR NEW.lanh_dao_theo_doi IS DISTINCT FROM OLD.lanh_dao_theo_doi
      OR NEW.phong IS DISTINCT FROM OLD.phong
      OR NEW.han_hoan_thanh IS DISTINCT FROM OLD.han_hoan_thanh
      OR NEW.ngay_bat_dau IS DISTINCT FROM OLD.ngay_bat_dau
      OR NEW.muc_uu_tien IS DISTINCT FROM OLD.muc_uu_tien
      OR NEW.loai_dau_viec IS DISTINCT FROM OLD.loai_dau_viec
      OR NEW.lien_phong IS DISTINCT FROM OLD.lien_phong THEN
      RAISE EXCEPTION 'Cán bộ phụ trách cập nhật được tiến độ và kế hoạch làm. Đổi hạn, đổi người hay mức ưu tiên cần lãnh đạo Phòng.';
    END IF;
    IF NEW.pho_phong IS DISTINCT FROM OLD.pho_phong
      OR NEW.truong_phong IS DISTINCT FROM OLD.truong_phong
      OR NEW.pgd_phu_trach IS DISTINCT FROM OLD.pgd_phu_trach THEN
      RAISE EXCEPTION 'Gán Phó phòng / Trưởng phòng / PGĐ phụ trách là việc của lãnh đạo Phòng hoặc Ban Giám đốc.';
    END IF;
  END IF;

  IF NEW.muc_uu_tien = 'TRONG_DIEM_BGD' AND OLD.muc_uu_tien <> 'TRONG_DIEM_BGD'
     AND NOT (public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'system_admin'::app_role)) THEN
    RAISE EXCEPTION 'Mức «Trọng điểm BGĐ» chỉ Ban Giám đốc đặt được';
  END IF;

  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    IF NEW.loai_dau_viec = 'THUONG_TRUC'
       AND NEW.trang_thai IN ('CHO_PHOI_HOP','CHO_DUYET','HOAN_THANH') THEN
      RAISE EXCEPTION 'Việc THƯỜNG TRỰC không đi qua luồng Kanban tiến trình — chỉ Chuẩn bị, Đang làm hoặc Đã đóng';
    END IF;

    IF NEW.trang_thai = 'DANG_LAM' AND OLD.trang_thai = 'CHUAN_BI'
       AND NEW.loai_dau_viec = 'TIEN_TRINH' THEN
      IF COALESCE(char_length(trim(NEW.ket_qua_dau_ra)), 0) < 5 THEN
        RAISE EXCEPTION 'Chưa ghi «làm xong thì có cái gì» — cần rõ kết quả đầu ra trước khi bắt tay làm';
      END IF;
      IF COALESCE(char_length(trim(NEW.muc_tieu_lien_ket)), 0) = 0 THEN
        RAISE EXCEPTION 'Chưa gắn việc này với mục tiêu/chiến dịch nào';
      END IF;
      IF COALESCE(char_length(trim(NEW.cach_lam)), 0) < 20 THEN
        RAISE EXCEPTION 'Chưa ghi các bước sẽ làm — cần ít nhất 2 bước cụ thể';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.ct2_nhip_pdca n
                     WHERE n.dau_viec_id = NEW.id AND n.nhan_pdca = 'P') THEN
        RAISE EXCEPTION 'Chưa có dòng Plan (P) trong nhật ký — lưu kế hoạch làm để khởi động việc';
      END IF;
    END IF;

    -- Giữ đúng một thước: xong nghĩa là 100%.
    IF NEW.trang_thai = 'HOAN_THANH' AND NEW.phan_tram <> 100 THEN
      RAISE EXCEPTION 'Chưa đạt 100%% — không thể chuyển sang Hoàn thành';
    END IF;

    -- PHƯƠNG ÁN D (GĐ 15/08): «Hoàn thành» là chữ ký của lãnh đạo Phòng.
    -- Trước đây 31/33 lần chuyển là chủ thẻ tự chuyển và 0/109 thẻ được chốt
    -- — tự hoàn thành đồng nghĩa tự thoát lưới nhịp, không ai duyệt gì cả.
    IF NEW.trang_thai = 'HOAN_THANH' AND NOT la_lanh_dao THEN
      RAISE EXCEPTION 'Hoàn thành cần Trưởng phòng duyệt — bấm «Trình duyệt hoàn thành» để chuyển thẻ tới lãnh đạo Phòng.';
    END IF;

    IF NEW.trang_thai = 'DA_DONG' AND NOT la_lanh_dao THEN
      RAISE EXCEPTION 'Chỉ Trưởng/Phó phòng được chốt «Đã đóng»';
    END IF;

    IF NEW.trang_thai = 'DUNG_HUY' THEN
      IF NOT la_lanh_dao THEN
        RAISE EXCEPTION 'Chỉ Trưởng/Phó phòng được Dừng/Hủy đầu việc';
      END IF;
      IF COALESCE(char_length(NEW.ly_do_dung_huy), 0) < 30 THEN
        RAISE EXCEPTION 'Dừng/Hủy phải ghi rõ lý do (tối thiểu 30 ký tự)';
      END IF;
    END IF;

    IF NEW.trang_thai IN ('CHO_PHOI_HOP','CHO_DUYET') THEN
      IF NEW.nguoi_dang_giu IS NULL THEN
        RAISE EXCEPTION 'Vào cột chờ phải chọn người đang giữ việc (người duyệt / đầu mối phối hợp)';
      END IF;
      NEW.giu_tu := COALESCE(NEW.giu_tu, now());
    ELSE
      NEW.nguoi_dang_giu := NULL;
      NEW.giu_tu := NULL;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $function$;

-- ---------------------------------------------------------------------------
-- 2) Push cho luồng duyệt — nối vào trigger thông báo sẵn có
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_thong_bao_dau_viec()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE co_gui boolean := false; nguoi uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;

    IF public.ct2_dat_thong_bao('N13', NEW.nguoi_chiu_trach_nhiem, 'Anh/chị vừa được giao một việc',
         'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
           || E'\nHạn: ' || COALESCE(to_char(NEW.han_hoan_thanh, 'DD/MM/YYYY'), 'chưa đặt')
           || E'\nKhi bắt tay làm, mở thẻ bấm «Bắt đầu làm».', 'NHE', NEW.id)
    THEN co_gui := true; END IF;
  ELSE
    IF NEW.muc_uu_tien = 'TRONG_DIEM_BGD' AND OLD.muc_uu_tien <> 'TRONG_DIEM_BGD' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao('N14', nguoi, 'Ban Giám đốc đặt việc này là TRỌNG ĐIỂM',
             'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
               || E'\nNay là việc trọng điểm của Ban Giám đốc.', 'DO', NEW.id)
        THEN co_gui := true; END IF;
      END LOOP;
    END IF;

    IF NEW.nguoi_dang_giu IS NOT NULL AND NEW.nguoi_dang_giu IS DISTINCT FROM OLD.nguoi_dang_giu THEN
      -- Trình duyệt hoàn thành nói bằng tin RIÊNG (N18): người duyệt phải biết
      -- đây là việc chờ CHỮ KÝ, không phải một ý kiến chờ chung chung.
      IF NEW.trang_thai = 'CHO_DUYET' AND NEW.phan_tram = 100 THEN
        IF public.ct2_dat_thong_bao('N18', NEW.nguoi_dang_giu, 'Có việc chờ anh/chị DUYỆT HOÀN THÀNH',
             'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
               || E'\nCán bộ báo đã xong 100%% — mời anh/chị duyệt hoặc trả lại.'
               || E'\nHộp «Chờ anh/chị duyệt» ở tab Công việc của Phòng.',
             'NHE', NEW.id) THEN co_gui := true; END IF;
      ELSE
        IF public.ct2_dat_thong_bao('N7', NEW.nguoi_dang_giu, 'Có việc đang chờ ý kiến của anh/chị',
             'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
               || E'\nVừa chuyển sang chờ anh/chị — đồng hồ chờ tính từ bây giờ.',
             'NHE', NEW.id) THEN co_gui := true; END IF;
      END IF;
    END IF;

    IF NEW.trang_thai = 'HOAN_THANH' AND OLD.trang_thai <> 'HOAN_THANH' THEN
      IF OLD.trang_thai = 'CHO_DUYET' THEN
        -- Trưởng phòng vừa DUYỆT — báo cả vòng: chủ thẻ, PP/TP, PGĐ phụ
        -- trách, người ấn theo dõi (GĐ 15/08). Người bấm duyệt tự bị loại.
        FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
          IF public.ct2_dat_thong_bao('N19', nguoi, 'Trưởng phòng đã duyệt hoàn thành',
               'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
                 || E'\nĐã qua duyệt của lãnh đạo Phòng — thẻ về cột Hoàn thành.',
               'NHE', NEW.id) THEN co_gui := true; END IF;
        END LOOP;
      ELSE
        FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
          IF public.ct2_dat_thong_bao('N15', nguoi, 'Có việc chờ anh/chị chốt',
               'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
                 || E'\nĐã báo hoàn thành — mời anh/chị rà và đóng thẻ.', 'NHE', NEW.id)
          THEN co_gui := true; END IF;
        END LOOP;
      END IF;
    END IF;

    -- Trả lại sau duyệt: chủ thẻ phải biết NGAY và biết đọc lý do ở đâu
    IF OLD.trang_thai = 'CHO_DUYET' AND NEW.trang_thai = 'DANG_LAM'
       AND OLD.phan_tram = 100 THEN
      IF public.ct2_dat_thong_bao('N20', NEW.nguoi_chiu_trach_nhiem, 'Thẻ bị trả lại sau duyệt',
           'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
             || E'\nLãnh đạo Phòng trả lại — mở thẻ đọc trao đổi để biết cần bổ sung gì.',
           'DO', NEW.id) THEN co_gui := true; END IF;
    END IF;

    IF NEW.trang_thai = 'DUNG_HUY' AND OLD.trang_thai <> 'DUNG_HUY' THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao('N16', nguoi, 'Một đầu việc vừa bị Dừng/Hủy',
             'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
               || E'\nLý do: ' || COALESCE(public.ct2_cat(NULLIF(NEW.ly_do_dung_huy, ''), 160), '(không ghi)'),
             'DO', NEW.id) THEN co_gui := true; END IF;
      END LOOP;
    END IF;

    IF NEW.han_hoan_thanh IS DISTINCT FROM OLD.han_hoan_thanh
       AND OLD.han_hoan_thanh IS NOT NULL AND NEW.han_hoan_thanh IS NOT NULL
       AND NEW.han_hoan_thanh > OLD.han_hoan_thanh THEN
      FOREACH nguoi IN ARRAY public.ct2_ds_nhan_khi_co_chuyen(NEW.id) LOOP
        IF public.ct2_dat_thong_bao('N17', nguoi, 'Một đầu việc vừa lùi hạn',
             'Việc: ' || public.ct2_cat(NEW.tieu_de, 70)
               || E'\nHạn: ' || to_char(OLD.han_hoan_thanh, 'DD/MM/YYYY')
               || ' → ' || to_char(NEW.han_hoan_thanh, 'DD/MM/YYYY'),
             'DO', NEW.id) THEN co_gui := true; END IF;
      END LOOP;
    END IF;
  END IF;

  IF co_gui THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN NEW;
END $function$;

-- ---------------------------------------------------------------------------
-- 3) «Hôm nay tôi phải làm gì» — MỘT RPC cho ô tổng hợp trang chủ
--
-- SECURITY INVOKER + đếm theo chính mình: RLS vẫn là hàng rào, và mỗi người
-- chỉ thấy con số của mình. Một vòng gọi cho màn hình nóng, đúng nguyên tắc
-- hiệu năng của lớp dữ liệu.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_viec_can_lam_hom_nay()
RETURNS TABLE (
  can_ghi_nhip int,      -- thẻ của tôi phải ghi nhịp hôm nay mà chưa ghi
  chua_bat_dau int,      -- trong số trên: thẻ chưa bắt đầu đã đến lúc chạy
  cho_toi_duyet int,     -- thẻ trình hoàn thành đang chờ chữ ký của tôi
  cho_toi_y_kien int,    -- thẻ chờ phối hợp / chờ ý kiến khác tôi đang giữ
  hs_can_nhip int        -- hồ sơ tín dụng của tôi đang chạy, hôm nay chưa ghi
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH toi AS (SELECT public.get_my_profile_id() AS id),
  hom_nay AS (SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d)
  SELECT
    (SELECT count(*) FROM public.ct2_dau_viec d, toi, hom_nay
      WHERE d.nguoi_chiu_trach_nhiem = toi.id
        AND d.loai_dau_viec = 'TIEN_TRINH'
        AND (d.trang_thai = 'DANG_LAM'
             OR public.ct2_vi_sao_phai_bao_cao(d.trang_thai, d.loai_dau_viec,
                  d.ngay_bat_dau, d.han_hoan_thanh) IS NOT NULL)
        AND (d.nhip_gan_nhat IS NULL
             OR (d.nhip_gan_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <> hom_nay.d))::int,
    (SELECT count(*) FROM public.ct2_dau_viec d, toi, hom_nay
      WHERE d.nguoi_chiu_trach_nhiem = toi.id
        AND public.ct2_vi_sao_phai_bao_cao(d.trang_thai, d.loai_dau_viec,
              d.ngay_bat_dau, d.han_hoan_thanh) IS NOT NULL
        AND (d.nhip_gan_nhat IS NULL
             OR (d.nhip_gan_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <> hom_nay.d))::int,
    (SELECT count(*) FROM public.ct2_dau_viec d, toi
      WHERE d.nguoi_dang_giu = toi.id
        AND d.trang_thai = 'CHO_DUYET' AND d.phan_tram = 100)::int,
    (SELECT count(*) FROM public.ct2_dau_viec d, toi
      WHERE d.nguoi_dang_giu = toi.id
        AND (d.trang_thai = 'CHO_PHOI_HOP'
             OR (d.trang_thai = 'CHO_DUYET' AND d.phan_tram <> 100)))::int,
    (SELECT count(*) FROM public.ct2_ho_so_tin_dung h, toi, hom_nay
      WHERE h.can_bo = toi.id
        AND h.trang_thai IN ('THU_THAP','TRINH_LDP','TRINH_LDCN','TRINH_TSC','HOAN_THIEN_GN')
        AND (h.nhip_gan_nhat IS NULL
             OR (h.nhip_gan_nhat AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <> hom_nay.d))::int
$$;

REVOKE ALL ON FUNCTION public.ct2_viec_can_lam_hom_nay() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_viec_can_lam_hom_nay() TO authenticated;

COMMENT ON FUNCTION public.ct2_viec_can_lam_hom_nay() IS
  'Ô «hôm nay tôi phải làm gì» trên trang chủ: nhịp cần ghi, thẻ chờ tôi duyệt/cho ý kiến, hồ sơ cần nhịp. Mỗi người chỉ thấy số của mình.';
