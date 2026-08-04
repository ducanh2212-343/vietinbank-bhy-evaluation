-- Ba cấp phụ trách: sửa được sau khi thẻ đã tạo, nhưng chỉ lãnh đạo
--
-- Bối cảnh: 23 thẻ nhập từ board Miro cũ (Phòng KHDN 22, BGĐ 1) ra đời trước
-- khi có ba cột pho_phong / truong_phong / pgd_phu_trach nên đều trống. Giao
-- diện nay cho lãnh đạo sửa ngay trong hộp thoại chi tiết thẻ.
--
-- Quyền GHI đã đúng sẵn ở tầng RLS: policy UPDATE của ct2_dau_viec cho phép
-- ct2_sua_duoc_phong(phong), mà hàm này bắt đầu bằng can_view_all_action_plans()
-- → vai «bgd» (Giám đốc Chi nhánh) sửa được thẻ của mọi phòng. Không cần nới.
--
-- Chỗ HỞ cần vá: f_ct2_truoc_sua_dau_viec() liệt kê các trường mà cán bộ không
-- phải lãnh đạo không được đổi (tiêu đề, người chịu trách nhiệm, hạn, ưu tiên…)
-- nhưng danh sách này viết trước khi có ba cột cấp phụ trách. Hiện tại chủ thẻ
-- tự đổi được Trưởng phòng / PGĐ phụ trách của chính việc mình làm — cùng loại
-- rủi ro với lanh_dao_theo_doi, chỉ là chưa ai chạm tới. Gán ai là cấp phụ
-- trách là quyết định của lãnh đạo, không phải của người thực hiện.

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
    -- Ba cấp phụ trách: tách thông báo riêng vì đây là câu hỏi khác hẳn —
    -- không phải «đổi hạn» mà là «ai chịu trách nhiệm quản lý việc này»
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

    IF NEW.trang_thai = 'HOAN_THANH' THEN
      IF NEW.phan_tram <> 100 THEN
        RAISE EXCEPTION 'Chưa đạt 100%% — không thể chuyển sang Hoàn thành';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.ct2_nhip_pdca n
                     WHERE n.dau_viec_id = NEW.id AND n.nhan_pdca = 'C') THEN
        RAISE EXCEPTION 'Thiếu bước Check (C) trong nhật ký PDCA — đối chiếu kết quả với chỉ tiêu trước khi Hoàn thành';
      END IF;
    END IF;

    IF NEW.trang_thai = 'DA_DONG' THEN
      IF NOT la_lanh_dao THEN
        RAISE EXCEPTION 'Chỉ Trưởng/Phó phòng được chốt «Đã đóng»';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.ct2_nhip_pdca n
                     WHERE n.dau_viec_id = NEW.id AND n.nhan_pdca = 'A') THEN
        RAISE EXCEPTION 'Thiếu bước Act (A) — chưa ghi bài học rút ra trước khi đóng đầu việc';
      END IF;
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
