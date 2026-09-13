-- Gỡ phiếu giao việc bảy ô (đảo của 20261009090000_ttc_phieu_giao_viec_bay_o.sql).
-- Trả trigger về bản một ô nghiệm thu và thu lại quyền sửa nội dung của BGĐ.
-- Chữ trong lộ trình đã sửa không tự quay lại — sửa tay nếu cần.

DROP TRIGGER IF EXISTS ttc_goi_dau_truoc_tao ON public.ttc_viec_goi_dau;
DROP FUNCTION IF EXISTS public.f_ttc_goi_dau_truoc_tao();
DROP FUNCTION IF EXISTS public.f_ttc_goi_dau_dong_bo_goi(public.ttc_viec_goi_dau);
DROP FUNCTION IF EXISTS public.ttc_phieu_thieu(public.ttc_viec_goi_dau);

CREATE OR REPLACE FUNCTION public.f_ttc_goi_dau_truoc_sua()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toi uuid := public.get_my_profile_id();
  la_bgd boolean := public.ttc_la_bgd(NEW.chuong_trinh_id);
  doi_nghiem_thu boolean :=
    NEW.nghiem_thu IS DISTINCT FROM OLD.nghiem_thu
    OR NEW.nguoi_nghiem_thu IS DISTINCT FROM OLD.nguoi_nghiem_thu
    OR NEW.nghiem_thu_luc IS DISTINCT FROM OLD.nghiem_thu_luc;
  doi_noi_dung boolean :=
    NEW.ten IS DISTINCT FROM OLD.ten OR NEW.muc_dich IS DISTINCT FROM OLD.muc_dich
    OR NEW.dau_ra IS DISTINCT FROM OLD.dau_ra OR NEW.can_bo IS DISTINCT FROM OLD.can_bo
    OR NEW.tieu_chuan IS DISTINCT FROM OLD.tieu_chuan OR NEW.han IS DISTINCT FROM OLD.han
    OR NEW.moc_kiem_tra IS DISTINCT FROM OLD.moc_kiem_tra
    OR NEW.dau_viec_id IS DISTINCT FROM OLD.dau_viec_id OR NEW.ket_qua IS DISTINCT FROM OLD.ket_qua;
BEGIN
  IF doi_nghiem_thu AND NOT la_bgd THEN
    RAISE EXCEPTION 'Chỉ Ban Giám đốc mới nghiệm thu được việc gối đầu';
  END IF;
  IF doi_noi_dung AND NEW.hoc_vien <> toi THEN
    RAISE EXCEPTION 'Chỉ học viên mới sửa được nội dung việc gối đầu của mình';
  END IF;
  IF doi_nghiem_thu THEN
    NEW.nguoi_nghiem_thu := toi;
    NEW.nghiem_thu_luc := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

ALTER TABLE public.ttc_viec_goi_dau
  DROP COLUMN IF EXISTS dat_chuan, DROP COLUMN IF EXISTS han_nop, DROP COLUMN IF EXISTS diem_kiem,
  DROP COLUMN IF EXISTS muc_giao, DROP COLUMN IF EXISTS goi_y_cach_lam, DROP COLUMN IF EXISTS nguon_luc,
  DROP COLUMN IF EXISTS muc_giao_cuoi_ky, DROP COLUMN IF EXISTS lich_su_chuan, DROP COLUMN IF EXISTS khoa_chuan,
  DROP COLUMN IF EXISTS trang_thai, DROP COLUMN IF EXISTS nghiem_thu_ket_qua, DROP COLUMN IF EXISTS so_lan_nghiem_thu,
  DROP COLUMN IF EXISTS hoi_lai_giua_chung;

DROP POLICY IF EXISTS "ttc sua chuong trinh" ON public.ttc_chuong_trinh;
CREATE POLICY "ttc sua chuong trinh" ON public.ttc_chuong_trinh FOR UPDATE TO authenticated
  USING (public.ttc_la_quan_tri(id)) WITH CHECK (public.ttc_la_quan_tri(id));
DROP POLICY IF EXISTS "ttc ghi ngay" ON public.ttc_ngay;
CREATE POLICY "ttc ghi ngay" ON public.ttc_ngay FOR ALL TO authenticated
  USING (public.ttc_la_quan_tri(chuong_trinh_id)) WITH CHECK (public.ttc_la_quan_tri(chuong_trinh_id));
DROP POLICY IF EXISTS "ttc ghi dau viec" ON public.ttc_dau_viec;
CREATE POLICY "ttc ghi dau viec" ON public.ttc_dau_viec FOR ALL TO authenticated
  USING (public.ttc_la_quan_tri(public.ttc_ct_cua_ngay(ngay_id)))
  WITH CHECK (public.ttc_la_quan_tri(public.ttc_ct_cua_ngay(ngay_id)));
DROP FUNCTION IF EXISTS public.ttc_sua_duoc_noi_dung(uuid);
