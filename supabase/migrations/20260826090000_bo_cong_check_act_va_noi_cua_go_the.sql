-- Bỏ cổng Check/Act + lãnh đạo gỡ thẻ sạch không vướng mốc 24h
--
-- (1) GĐ chốt 08/2026: Kanban vốn là VÒNG LẶP — một việc lên kế hoạch, làm
--     liên tục, ra kết quả thì Done; quá trình check thấy vấn đề thì TẠO VIỆC
--     MỚI, không giữ thẻ cũ làm con tin. Vậy bỏ hai barie «phải có dòng C mới
--     được Hoàn thành» và «phải có dòng A mới được Đã đóng». Giữ: 100% cho
--     Hoàn thành, chỉ lãnh đạo được Đóng/Dừng-Hủy, và cổng kế hoạch (Cổng 2)
--     khi bắt đầu làm. Nhãn P/D/C/A trên nhịp vẫn còn để đọc nhật ký.
--
-- (2) Mốc 24 giờ của «Gỡ thẻ nhập nhầm» chỉ áp cho CÁN BỘ tự gỡ thẻ mình.
--     Lãnh đạo Phòng không vướng — 22 thẻ nhập từ Miro đều quá 24h từ lâu, mà
--     dọn thẻ trùng trong đợt nhập chính là việc của lãnh đạo. Ba điều kiện
--     «thẻ còn sạch» (Chuẩn bị, chưa nhịp, chưa trao đổi) giữ nguyên cho mọi
--     người — đó mới là chốt an toàn thật. Đây cũng chính là lý do GĐ «chưa
--     thấy tính năng» sau khi merge: nút có nhưng mọi thẻ tồn tại đều quá 24h.
--

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

    -- 08/2026: bỏ cổng «phải có dòng C» — Kanban là vòng lặp, check thấy vấn
    -- đề thì tạo việc mới. Giữ đúng một thước: xong nghĩa là 100%.
    IF NEW.trang_thai = 'HOAN_THANH' AND NEW.phan_tram <> 100 THEN
      RAISE EXCEPTION 'Chưa đạt 100%% — không thể chuyển sang Hoàn thành';
    END IF;

    -- 08/2026: bỏ cổng «phải có dòng A» — chỉ giữ điều kiện cấp quyết định
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

CREATE OR REPLACE FUNCTION public.ct2_go_the(_id uuid, _ly_do text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  t public.ct2_dau_viec%ROWTYPE;
  toi uuid := public.get_my_profile_id();
  la_lanh_dao boolean;
BEGIN
  SELECT * INTO t FROM public.ct2_dau_viec WHERE id = _id;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy thẻ'; END IF;

  la_lanh_dao := public.ct2_sua_duoc_phong(t.phong);
  IF NOT (t.nguoi_tao = toi OR la_lanh_dao) THEN
    RAISE EXCEPTION 'Chỉ người tạo thẻ hoặc lãnh đạo Phòng mới gỡ được thẻ nhập nhầm';
  END IF;

  IF t.trang_thai <> 'CHUAN_BI' THEN
    RAISE EXCEPTION 'Thẻ đã ra khỏi cột Chuẩn bị — việc đã chạy thì dùng Dừng/Hủy để còn giữ vết';
  END IF;
  IF EXISTS (SELECT 1 FROM public.ct2_nhip_pdca n WHERE n.dau_viec_id = _id) THEN
    RAISE EXCEPTION 'Thẻ đã có nhịp PDCA — không gỡ được, dùng Dừng/Hủy để giữ lại nhật ký';
  END IF;
  IF EXISTS (SELECT 1 FROM public.ct2_binh_luan b
              WHERE b.pham_vi = 'DAU_VIEC' AND b.doi_tuong_id = _id) THEN
    RAISE EXCEPTION 'Thẻ đã có trao đổi — không gỡ được, dùng Dừng/Hủy để giữ lại mạch chuyện';
  END IF;
  -- Mốc 24h chỉ áp cho cán bộ tự gỡ; lãnh đạo dọn thẻ trùng của đợt nhập cũ
  -- không vướng — ba điều kiện «thẻ còn sạch» phía trên mới là chốt an toàn.
  IF NOT la_lanh_dao AND t.created_at < now() - interval '24 hours' THEN
    RAISE EXCEPTION 'Chỉ gỡ được thẻ tạo trong vòng 24 giờ — quá hạn đó nhờ lãnh đạo Phòng gỡ, hoặc dùng Dừng/Hủy';
  END IF;

  INSERT INTO public.ct2_the_da_go (id, phong, ma_hien_thi, tieu_de, du_lieu, go_boi, ly_do)
  VALUES (t.id, t.phong, t.ma_hien_thi, t.tieu_de, to_jsonb(t), toi, NULLIF(trim(_ly_do), ''));

  DELETE FROM public.ct2_dau_viec WHERE id = _id;
END $function$;
