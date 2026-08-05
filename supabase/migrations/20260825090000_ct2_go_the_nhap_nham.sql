-- «Gỡ thẻ nhập nhầm» — đường dọn thẻ gõ sai, KHÁC hẳn Dừng/Hủy
--
-- Dừng/Hủy phục vụ hủy NGHIỆP VỤ: việc có thật, đã bàn, nay không làm nữa —
-- lãnh đạo Phòng quyết, lý do ≥30 ký tự, thẻ ở lại có vết. Đúng và giữ nguyên.
--
-- Nhưng nó đang bị dùng nhầm cho một ca khác hẳn: thẻ gõ sai, tạo trùng, chọn
-- nhầm phòng. Bắt một thẻ gõ nhầm viết 30 ký tự lý do rồi nằm vĩnh viễn trong
-- cột Dừng/Hủy làm cột đó lẫn rác với quyết định thật, và số «bao nhiêu việc bị
-- hủy trong kỳ» mất nghĩa.
--
-- CÁCH LÀM: lưu trữ nguyên dòng vào ct2_the_da_go rồi XOÁ THẬT khỏi bảng đầu
-- việc. Ban đầu định dùng cờ mềm `da_go`, nhưng như vậy phải nhớ lọc ở sáu hàm
-- thống kê và mọi truy vấn về sau — quên một chỗ là thẻ rác chui vào báo cáo.
-- Xoá thật thì không có gì phải nhớ.
--
-- An toàn vì điều kiện dưới đây bảo đảm thẻ CÒN SẠCH: chưa có nhịp PDCA nào,
-- chưa có trao đổi nào. Khoá ngoại CASCADE của nhịp vì thế không xoá mất gì —
-- đây đúng là lý do phải giữ điều kiện chặt, không nới về sau.

CREATE TABLE IF NOT EXISTS public.ct2_the_da_go (
  id uuid PRIMARY KEY,
  phong uuid NOT NULL REFERENCES public.departments(id),
  ma_hien_thi text,
  tieu_de text NOT NULL,
  du_lieu jsonb NOT NULL,
  go_boi uuid NOT NULL REFERENCES public.profiles(id),
  go_luc timestamptz NOT NULL DEFAULT now(),
  ly_do text
);
COMMENT ON TABLE public.ct2_the_da_go IS
  'Thẻ nhập nhầm đã gỡ — giữ nguyên dòng cũ dạng JSONB để khôi phục được. Không phải Dừng/Hủy.';

ALTER TABLE public.ct2_the_da_go ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.ct2_the_da_go TO authenticated;
GRANT ALL ON public.ct2_the_da_go TO service_role;

CREATE POLICY "ct2 xem the da go" ON public.ct2_the_da_go FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid())
         AND (public.ct2_sua_duoc_phong(phong) OR go_boi = public.get_my_profile_id()));

CREATE OR REPLACE FUNCTION public.ct2_go_the(_id uuid, _ly_do text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  t public.ct2_dau_viec%ROWTYPE;
  toi uuid := public.get_my_profile_id();
BEGIN
  SELECT * INTO t FROM public.ct2_dau_viec WHERE id = _id;
  IF t.id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy thẻ'; END IF;

  IF NOT (t.nguoi_tao = toi OR public.ct2_sua_duoc_phong(t.phong)) THEN
    RAISE EXCEPTION 'Chỉ người tạo thẻ hoặc lãnh đạo Phòng mới gỡ được thẻ nhập nhầm';
  END IF;

  -- Bốn điều kiện «thẻ còn sạch». Nới bất kỳ điều nào là biến cửa hẹp này thành
  -- cửa xoá vạn năng, và lúc đó CASCADE của nhịp PDCA sẽ ăn mất nhật ký thật.
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
  IF t.created_at < now() - interval '24 hours' THEN
    RAISE EXCEPTION 'Chỉ gỡ được thẻ tạo trong vòng 24 giờ — quá hạn đó thì đã là việc của Phòng, dùng Dừng/Hủy';
  END IF;

  INSERT INTO public.ct2_the_da_go (id, phong, ma_hien_thi, tieu_de, du_lieu, go_boi, ly_do)
  VALUES (t.id, t.phong, t.ma_hien_thi, t.tieu_de, to_jsonb(t), toi, NULLIF(trim(_ly_do), ''));

  DELETE FROM public.ct2_dau_viec WHERE id = _id;
END $function$;

-- Khôi phục. Dùng cờ `ct2.dang_phuc_hoi` chứ KHÔNG xoá request.jwt.claims như
-- bản nháp đầu: claims là biến của cả transaction, xoá nó xong thì auth.uid()
-- thành NULL và mọi policy RLS phía sau đều trượt — chính điều đó làm kịch bản
-- kiểm chứng báo «khôi phục 0 dòng» dù dòng đã về.
CREATE OR REPLACE FUNCTION public.ct2_phuc_hoi_the(_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE g public.ct2_the_da_go%ROWTYPE;
BEGIN
  SELECT * INTO g FROM public.ct2_the_da_go WHERE id = _id;
  IF g.id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy thẻ đã gỡ'; END IF;
  IF NOT (public.ct2_sua_duoc_phong(g.phong) OR g.go_boi = public.get_my_profile_id()) THEN
    RAISE EXCEPTION 'Chỉ người đã gỡ hoặc lãnh đạo Phòng mới khôi phục được';
  END IF;

  PERFORM set_config('ct2.dang_phuc_hoi', '1', true);
  INSERT INTO public.ct2_dau_viec
  SELECT * FROM jsonb_populate_record(NULL::public.ct2_dau_viec, g.du_lieu);
  PERFORM set_config('ct2.dang_phuc_hoi', '0', true);

  DELETE FROM public.ct2_the_da_go WHERE id = _id;
END $function$;

REVOKE ALL ON FUNCTION public.ct2_go_the(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ct2_phuc_hoi_the(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_go_the(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_phuc_hoi_the(uuid) TO authenticated;

-- Cổng nhập phải nhận ra lượt KHÔI PHỤC: dòng này TỪNG hợp lệ, quyền đã kiểm
-- trong ct2_phuc_hoi_the(). Bắt nó qua lại cổng thì thẻ thiếu lãnh đạo theo dõi
-- — đúng thứ khiến người ta gỡ nó — sẽ không bao giờ về được.
CREATE OR REPLACE FUNCTION public.f_ct2_truoc_tao_dau_viec()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  ma_phong text;
  toi uuid := public.get_my_profile_id();
  tu_nhan_viec boolean;
BEGIN
  IF COALESCE(current_setting('ct2.dang_phuc_hoi', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    NEW.han_goc := COALESCE(NEW.han_goc, NEW.han_hoan_thanh);
    RETURN NEW;
  END IF;

  IF NEW.nguoi_chiu_trach_nhiem IS NULL THEN
    RAISE EXCEPTION 'Việc ghi mới phải có người chịu trách nhiệm — đúng 01 người, không để «gán sau»';
  END IF;
  IF NEW.lanh_dao_theo_doi IS NULL THEN
    RAISE EXCEPTION 'Việc ghi mới phải có lãnh đạo theo dõi — chọn Trưởng phòng ở mục «Các cấp phụ trách»';
  END IF;
  IF NEW.lanh_dao_theo_doi = NEW.nguoi_chiu_trach_nhiem
     AND NOT public.ct2_tu_theo_doi_duoc(NEW.nguoi_chiu_trach_nhiem, NEW.phong) THEN
    RAISE EXCEPTION 'Người làm không tự theo dõi chính mình — chọn Trưởng phòng hoặc lãnh đạo khác';
  END IF;
  IF NEW.han_hoan_thanh IS NULL THEN
    RAISE EXCEPTION 'Việc ghi mới phải có hạn hoàn thành — không có hạn thì không đo được đúng hẹn';
  END IF;
  NEW.ngay_bat_dau := COALESCE(NEW.ngay_bat_dau, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);

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
END $function$;
