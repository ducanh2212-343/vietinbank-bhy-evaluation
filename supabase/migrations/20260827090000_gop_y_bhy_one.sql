-- Góp ý cải thiện hệ thống BHY One
--
-- Mọi cán bộ bấm nút «Góp ý» trên thanh điều hướng là gửi được ngay: nội dung
-- tự do + tick chọn menu/tính năng liên quan (lưu jsonb, không FK vì cây menu
-- sống trong mã nguồn). Người tiếp nhận là Phòng Tổ chức Tổng hợp (tcth_admin)
-- và Giám đốc Chi nhánh (bgd): xem toàn bộ, tích «Đã xem xét»/«Đã xử lý»,
-- kết xuất Excel. Cán bộ gửi thấy lại góp ý của chính mình kèm trạng thái.

-- Ai được tiếp nhận góp ý: TCTH admin + System admin + Ban Giám đốc.
-- Viết bằng has_role trực tiếp (không gọi is_content_admin — hàm đó chỉ có
-- trong file migration bhy_ways, chưa từng được áp vào database này).
CREATE OR REPLACE FUNCTION public.la_nguoi_duyet_gop_y(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'system_admin'::app_role)
      OR public.has_role(_user_id, 'tcth_admin'::app_role)
      OR public.has_role(_user_id, 'bgd'::app_role)
$$;

REVOKE ALL ON FUNCTION public.la_nguoi_duyet_gop_y(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.la_nguoi_duyet_gop_y(uuid) TO authenticated, service_role;

CREATE TABLE public.portal_gop_y (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  noi_dung TEXT NOT NULL,
  -- Menu/tính năng được tick trên form: [{"path": "/one/y-tuong", "label": "Bắc Hưng Yên Ideas"}]
  muc_lien_quan JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Trang đang mở lúc bấm nút góp ý — giúp người xử lý hình dung bối cảnh
  trang_gui TEXT,
  -- Chụp lại tên/phòng lúc gửi để file kết xuất không phụ thuộc RLS bảng profiles
  nguoi_gui TEXT NOT NULL,
  phong_ban TEXT,
  trang_thai TEXT NOT NULL DEFAULT 'moi'
    CHECK (trang_thai IN ('moi', 'da_xem_xet', 'da_xu_ly')),
  danh_dau_boi UUID,
  danh_dau_luc TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_gop_y_created_at ON public.portal_gop_y (created_at DESC);
CREATE INDEX idx_portal_gop_y_trang_thai ON public.portal_gop_y (trang_thai);

ALTER TABLE public.portal_gop_y ENABLE ROW LEVEL SECURITY;

-- Người gửi thấy góp ý của mình (kèm trạng thái); người duyệt thấy tất cả
CREATE POLICY "Nguoi gui hoac nguoi duyet xem gop y"
  ON public.portal_gop_y FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.la_nguoi_duyet_gop_y(auth.uid()));

-- Chỉ cán bộ (không phải khách đối tác) gửi được, và chỉ đứng tên chính mình
CREATE POLICY "Can bo gui gop y cua minh"
  ON public.portal_gop_y FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_staff(auth.uid()));

-- Người gửi rút lại được khi chưa ai đụng tới; người duyệt dọn được mục rác
CREATE POLICY "Rut lai gop y chua xu ly hoac nguoi duyet xoa"
  ON public.portal_gop_y FOR DELETE TO authenticated
  USING (
    (created_by = auth.uid() AND trang_thai = 'moi')
    OR public.la_nguoi_duyet_gop_y(auth.uid())
  );

-- KHÔNG có policy UPDATE: đổi trạng thái đi qua RPC bên dưới để người duyệt
-- không sửa được nội dung góp ý của cán bộ (giữ nguyên lời người gửi).

CREATE TRIGGER update_portal_gop_y_updated_at
  BEFORE UPDATE ON public.portal_gop_y
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tích «Đã xem xét» / «Đã xử lý» (hoặc bỏ tích về 'moi').
-- SECURITY DEFINER + tự kiểm quyền, cùng khuôn với admin_update_idea_status.
CREATE OR REPLACE FUNCTION public.gop_y_cap_nhat_trang_thai(
  _id UUID,
  _trang_thai TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.la_nguoi_duyet_gop_y(auth.uid()) THEN
    RAISE EXCEPTION 'Chỉ Phòng TCTH hoặc Ban Giám đốc được cập nhật trạng thái góp ý';
  END IF;
  IF _trang_thai NOT IN ('moi', 'da_xem_xet', 'da_xu_ly') THEN
    RAISE EXCEPTION 'Trạng thái không hợp lệ: %', _trang_thai;
  END IF;
  UPDATE public.portal_gop_y SET
    trang_thai = _trang_thai,
    danh_dau_boi = CASE WHEN _trang_thai = 'moi' THEN NULL ELSE auth.uid() END,
    danh_dau_luc = CASE WHEN _trang_thai = 'moi' THEN NULL ELSE now() END
  WHERE id = _id;
END;
$$;

REVOKE ALL ON FUNCTION public.gop_y_cap_nhat_trang_thai(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gop_y_cap_nhat_trang_thai(uuid, text) TO authenticated, service_role;
