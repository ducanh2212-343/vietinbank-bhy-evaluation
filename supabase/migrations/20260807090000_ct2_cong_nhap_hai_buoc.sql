-- ============================================================================
-- CHIÊU THỨC 2 — Tách Cổng A thành HAI CỔNG theo đúng nhịp nghĩ của cán bộ
--
-- VÌ SAO ĐỔI (căn cứ từ chính quy chế Miro đang chạy của Chi nhánh):
--   Quy chế «PhanTichKanBan» mục A1 đã kết luận từ thực tế: "yêu cầu điền quá
--   nhiều trường trên màn hình điện thoại là NGUYÊN NHÂN CHÍNH khiến card bị bỏ
--   trống hoàn toàn" — nên chỉ bắt buộc 3 trường: Status · Assignee · Due Date.
--   Đặc tả v1.0 §3.1 lại chặn cứng đủ 11 trường 5W2H ngay lúc tạo. Hai văn bản
--   cùng chống một lỗi ("card vô chủ") bằng hai thuốc ngược nhau.
--
--   Hòa giải: hai văn bản nói về HAI thứ khác nhau.
--     · 3 trường A1  = làm cho thẻ THEO DÕI ĐƯỢC (vận hành)
--     · 5W2H đặc tả  = làm cho việc ĐƯỢC GIAO RÕ (chất lượng kế hoạch)
--   Chúng thuộc hai thời điểm tâm lý khác nhau: lúc ghi việc (đang họp giao
--   ban, đang cầm điện thoại, chỉ biết việc gì–ai–bao giờ) và lúc quyết định
--   bắt tay làm (mới đủ bình tĩnh nghĩ kết quả–mục tiêu–các bước).
--
--   Nên: giữ nguyên chặn cứng, nhưng ĐẶT ĐÚNG CỬA.
--     Cổng 1 — Tạo thẻ  : 3 trường (tiêu đề · người chịu trách nhiệm · hạn)
--                          → thẻ nằm ở cột «Chuẩn bị», chưa đòi gì thêm
--     Cổng 2 — Khởi động: CHUAN_BI → DANG_LAM bắt buộc đủ 5W2H + dòng Plan (P)
--
--   Cổng 2 chính là bước P của PDCA, vốn đã bắt buộc từ migration trước — nay
--   gộp luôn nội dung 5W2H vào đó thay vì hỏi trước cả khi việc được khởi động.
--   Kết quả: không thẻ nào CHẠY mà thiếu 5W2H (đúng mục tiêu đặc tả), nhưng
--   không ai bị chặn ở giây thứ 20 khi mới chỉ muốn ghi lại một chỉ đạo.
--
-- Kanban này KHÔNG dùng cho việc lặp lại hằng ngày (chốt với Chi nhánh) — chỉ
-- ba nguồn: việc trong kế hoạch hành động · chỉ đạo giao ban tuần/tháng ·
-- việc phòng/cán bộ chủ động. Cột nguon_viec ghi lại đúng ba nguồn đó.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Nguồn việc — ba lối vào Kanban
-- ---------------------------------------------------------------------------
ALTER TABLE public.ct2_dau_viec
  ADD COLUMN IF NOT EXISTS nguon_viec text NOT NULL DEFAULT 'CHU_DONG';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ct2_dau_viec'::regclass AND conname = 'ct2_nguon_viec_hop_le'
  ) THEN
    ALTER TABLE public.ct2_dau_viec ADD CONSTRAINT ct2_nguon_viec_hop_le
      CHECK (nguon_viec IN ('KE_HOACH','GIAO_BAN','CHU_DONG'));
  END IF;
END $$;

COMMENT ON COLUMN public.ct2_dau_viec.nguon_viec IS
  'KE_HOACH = việc trong kế hoạch hành động kỳ · GIAO_BAN = chỉ đạo giao ban tuần/tháng · CHU_DONG = phòng/cán bộ chủ động. Việc lặp hằng ngày KHÔNG vào Kanban này.';

-- Ghi lại cuộc họp sinh ra chỉ đạo (chỉ dùng khi nguon_viec = 'GIAO_BAN')
ALTER TABLE public.ct2_dau_viec
  ADD COLUMN IF NOT EXISTS cuoc_hop text;

-- ---------------------------------------------------------------------------
-- 2) Nới ràng buộc lúc TẠO — ba trường 5W2H còn lại chuyển sang Cổng 2
-- ---------------------------------------------------------------------------
ALTER TABLE public.ct2_dau_viec ALTER COLUMN ket_qua_dau_ra DROP NOT NULL;
ALTER TABLE public.ct2_dau_viec ALTER COLUMN muc_tieu_lien_ket DROP NOT NULL;
ALTER TABLE public.ct2_dau_viec ALTER COLUMN cach_lam DROP NOT NULL;

-- CHECK cũ chặn cả chuỗi rỗng; đổi sang "để trống được, đã ghi thì phải đủ chất"
ALTER TABLE public.ct2_dau_viec DROP CONSTRAINT IF EXISTS ct2_dau_viec_ket_qua_dau_ra_check;
ALTER TABLE public.ct2_dau_viec DROP CONSTRAINT IF EXISTS ct2_dau_viec_cach_lam_check;
ALTER TABLE public.ct2_dau_viec ADD CONSTRAINT ct2_ket_qua_dau_ra_du_chat
  CHECK (ket_qua_dau_ra IS NULL OR char_length(ket_qua_dau_ra) >= 5);
ALTER TABLE public.ct2_dau_viec ADD CONSTRAINT ct2_cach_lam_du_chat
  CHECK (cach_lam IS NULL OR char_length(cach_lam) >= 20);

-- ---------------------------------------------------------------------------
-- 3) Cổng 2 — thẻ chỉ được sang «Đang làm» khi đã đủ 5W2H
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_sua_dau_viec()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  la_lanh_dao boolean := public.ct2_sua_duoc_phong(OLD.phong);
  la_chu_the boolean := (public.get_my_profile_id() = OLD.nguoi_chiu_trach_nhiem);
  la_phoi_hop boolean := (public.get_my_profile_id() = ANY(OLD.nguoi_phoi_hop));
BEGIN
  IF auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- Người phụ trách được hoàn thiện 5W2H cho việc của mình (đây là bước lập kế
  -- hoạch của chính họ), nhưng vẫn không được tự đổi hạn/chủ thẻ/mức ưu tiên.
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

    -- ===== CỔNG 2: khởi động việc =====
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
END $$;

REVOKE ALL ON FUNCTION public.f_ct2_truoc_sua_dau_viec() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Nhịp: cho phép ghi dòng Plan (P) khi thẻ còn ở «Chuẩn bị»
--    (trước đây mọi nhịp ở cột Chuẩn bị đều KHONG_TINH — vẫn giữ nguyên, vì
--     dòng P là lập kế hoạch, không phải nhịp sáng, không vào mẫu số thi đua)
-- ---------------------------------------------------------------------------
-- Không cần đổi f_ct2_truoc_ghi_nhip: dòng P ở cột CHUAN_BI tự nhận
-- dung_nhip = 'KHONG_TINH', đúng nguyên tắc "chỉ đòi nhịp với việc đang chạy".

-- ---------------------------------------------------------------------------
-- 5) Cán bộ được tự ghi VIỆC CHỦ ĐỘNG CỦA CHÍNH MÌNH
--
-- Kanban này phục vụ ba nguồn, trong đó có "việc phòng/cán bộ chủ động thực
-- hiện". Nếu cán bộ muốn ghi một việc mình tự thấy cần làm mà vẫn phải chờ
-- lãnh đạo duyệt mới hiện lên bảng, tín hiệu chủ động bị dập ngay từ đầu.
--
-- Mở đúng một khe hẹp: tự nhận việc về mình, trong phòng mình, không liên
-- phòng, không tự phong mức ưu tiên. Giao việc cho NGƯỜI KHÁC vẫn phải là
-- lãnh đạo (hoặc đi đường «Đề xuất việc») — nguyên tắc một chủ trì không đổi.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_tao_dau_viec()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ma_phong text;
  toi uuid := public.get_my_profile_id();
  tu_nhan_viec boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    NEW.han_goc := COALESCE(NEW.han_goc, NEW.han_hoan_thanh);
    RETURN NEW;
  END IF;

  tu_nhan_viec := NEW.nguoi_chiu_trach_nhiem = toi
    AND NEW.phong = public.get_my_department_id()
    AND NEW.nguon_viec = 'CHU_DONG'
    AND NOT NEW.lien_phong
    AND NEW.muc_uu_tien = 'THUONG';

  IF NOT public.ct2_sua_duoc_phong(NEW.phong) AND NOT tu_nhan_viec THEN
    RAISE EXCEPTION 'Anh/chị chỉ tự ghi được việc chủ động của chính mình. Giao việc cho người khác cần lãnh đạo Phòng, hoặc dùng «Đề xuất việc».';
  END IF;

  IF NEW.lien_phong AND NOT (
    public.can_view_all_action_plans() OR public.ct2_la_lanh_dao_phong(NEW.phong)
    OR NEW.phong = ANY(public.get_my_pgd_scope_dept_ids())
  ) THEN
    RAISE EXCEPTION 'Chỉ Phó Phòng trở lên được khởi tạo đầu việc liên phòng';
  END IF;

  IF NEW.muc_uu_tien = 'TRONG_DIEM_BGD' AND NOT (
    public.has_role(auth.uid(), 'bgd'::app_role)
    OR public.has_role(auth.uid(), 'system_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Mức «Trọng điểm BGĐ» chỉ Ban Giám đốc đặt được';
  END IF;

  IF NEW.chien_dich_id IS NOT NULL THEN
    PERFORM 1 FROM public.ct2_chien_dich c
     WHERE c.id = NEW.chien_dich_id AND c.ngay_ket_thuc >= NEW.han_hoan_thanh;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Hạn hoàn thành vượt mốc kết thúc của chiến dịch';
    END IF;
  END IF;

  NEW.han_goc := COALESCE(NEW.han_goc, NEW.han_hoan_thanh);
  IF NEW.ma_hien_thi IS NULL THEN
    SELECT d.code INTO ma_phong FROM public.departments d WHERE d.id = NEW.phong;
    NEW.ma_hien_thi := COALESCE(ma_phong, 'CT2') || '-'
      || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-'
      || lpad(nextval('public.ct2_ma_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.f_ct2_truoc_tao_dau_viec() FROM PUBLIC, anon, authenticated;

-- RLS INSERT nới theo đúng khe hẹp trên (trigger vẫn là chốt chặn cuối)
DROP POLICY IF EXISTS "ct2 tao dau viec" ON public.ct2_dau_viec;
CREATE POLICY "ct2 tao dau viec" ON public.ct2_dau_viec FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid())
    AND (
      public.ct2_sua_duoc_phong(phong)
      OR (
        nguoi_chiu_trach_nhiem = public.get_my_profile_id()
        AND phong = public.get_my_department_id()
        AND nguon_viec = 'CHU_DONG'
        AND NOT lien_phong
        AND muc_uu_tien = 'THUONG'
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_ct2_dv_nguon ON public.ct2_dau_viec(nguon_viec);

COMMENT ON TABLE public.ct2_dau_viec IS
  'Chiêu thức 2 — đầu việc Kanban 5W2H. Hai cổng nhập: tạo thẻ cần 3 trường (việc/ai/hạn), khởi động sang «Đang làm» mới bắt buộc đủ 5W2H + dòng Plan.';
