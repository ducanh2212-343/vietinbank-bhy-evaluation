-- ============================================================================
-- CHIÊU THỨC 2 — Nhiều bảng Kanban một phòng (mảng / liên phòng) + cấp phụ trách
--
-- Yêu cầu của Giám đốc Chi nhánh:
--  1. Một phòng tách được nhiều bảng Kanban cùng mẫu: mỗi mảng công việc một
--     bảng (VD TCTH: hành chính · tổ chức · tổng hợp), có bảng LIÊN PHÒNG.
--  2. Bảng liên phòng ĐẶT Ở PHÒNG ĐẦU MỐI — người phòng khác được thêm làm
--     thành viên thì tự thấy bảng trong màn của mình. Không treo lên trang
--     chủ: trang chủ là nơi tổng hợp, không phải nơi sở hữu việc.
--  3. Bảng HẠN CHẾ (VD mảng tổ chức — nhân sự): chỉ thành viên được thêm
--     đích danh + Ban Giám đốc thấy. Trưởng phòng tạo bảng tự là thành viên,
--     tự thêm Phó phụ trách — DANH SÁCH THÀNH VIÊN CHÍNH LÀ HÀNG RÀO, không
--     đoán ai là "phó phụ trách" từ chức danh.
--  4. Mỗi đầu việc ghi được ba cấp phụ trách: Phó phòng · Trưởng phòng · PGĐ
--     phụ trách (tự link từ PGĐ của phòng, sửa được).
--
-- Toàn bộ là BỔ SUNG (bảng mới, cột mới nullable) — bản web đang chạy không
-- bị ảnh hưởng, nên áp trước khi triển khai mã là an toàn.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Bảng Kanban
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct2_bang (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Phòng đầu mối — bảng liên phòng cũng có đúng một phòng chịu trách nhiệm
  phong uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  ten text NOT NULL CHECK (char_length(trim(ten)) >= 3),
  mo_ta text,
  loai text NOT NULL DEFAULT 'MANG' CHECK (loai IN ('MANG', 'LIEN_PHONG')),
  -- PHONG: ai xem được bảng phòng thì xem được. HAN_CHE: chỉ thành viên + BGĐ.
  che_do_xem text NOT NULL DEFAULT 'PHONG' CHECK (che_do_xem IN ('PHONG', 'HAN_CHE')),
  nguoi_tao uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ct2_bang_thanh_vien (
  bang_id uuid NOT NULL REFERENCES public.ct2_bang(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nguoi_them uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bang_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- 2) Cột mới trên đầu việc — đều nullable, không phá dữ liệu cũ
-- ---------------------------------------------------------------------------
ALTER TABLE public.ct2_dau_viec
  ADD COLUMN IF NOT EXISTS bang_id uuid REFERENCES public.ct2_bang(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pho_phong uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS truong_phong uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pgd_phu_trach uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ct2_dv_bang ON public.ct2_dau_viec(bang_id) WHERE bang_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3) Ai xem được bảng nào — MỘT hàm, mọi policy cùng đọc
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_xem_duoc_bang(_bang uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _bang IS NULL THEN true          -- Kanban chung của phòng: luật cũ lo
    ELSE EXISTS (
      SELECT 1 FROM public.ct2_bang b
      WHERE b.id = _bang
        AND (
          -- BGĐ và quản trị hệ thống thấy mọi bảng — kể cả bảng hạn chế:
          -- Giám đốc phải thấy được mảng tổ chức, đó là yêu cầu gốc
          public.has_role(auth.uid(), 'bgd'::app_role)
          OR public.has_role(auth.uid(), 'system_admin'::app_role)
          -- Thành viên được thêm đích danh
          OR EXISTS (
            SELECT 1 FROM public.ct2_bang_thanh_vien tv
            WHERE tv.bang_id = b.id AND tv.profile_id = public.get_my_profile_id()
          )
          -- Bảng chế độ PHÒNG: ai xem được bảng phòng thì xem được bảng này
          OR (b.che_do_xem = 'PHONG' AND public.ct2_xem_duoc_dau_viec(b.phong, '{}'::uuid[]))
        )
    )
  END
$$;
REVOKE ALL ON FUNCTION public.ct2_xem_duoc_bang(uuid) FROM PUBLIC, anon;

-- Ai quản trị bảng: lãnh đạo phòng đầu mối, người tạo, BGĐ/quản trị
CREATE OR REPLACE FUNCTION public.ct2_quan_tri_bang(_bang uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ct2_bang b
    WHERE b.id = _bang
      AND (
        public.ct2_sua_duoc_phong(b.phong)
        OR b.nguoi_tao = public.get_my_profile_id()
        OR public.has_role(auth.uid(), 'bgd'::app_role)
        OR public.has_role(auth.uid(), 'system_admin'::app_role)
      )
  )
$$;
REVOKE ALL ON FUNCTION public.ct2_quan_tri_bang(uuid) FROM PUBLIC, anon;

-- ---------------------------------------------------------------------------
-- 4) RLS
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.ct2_bang TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.ct2_bang_thanh_vien TO authenticated;
GRANT ALL ON public.ct2_bang, public.ct2_bang_thanh_vien TO service_role;

ALTER TABLE public.ct2_bang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ct2_bang_thanh_vien ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ct2 xem bang" ON public.ct2_bang FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) AND public.ct2_xem_duoc_bang(id));

-- Tạo bảng: lãnh đạo phòng đầu mối (hoặc BGĐ). Không mở cho cán bộ thường —
-- bảng mọc tự do là bảng chết tự do.
CREATE POLICY "ct2 tao bang" ON public.ct2_bang FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid())
    AND (
      public.ct2_sua_duoc_phong(phong)
      OR public.has_role(auth.uid(), 'bgd'::app_role)
      OR public.has_role(auth.uid(), 'system_admin'::app_role)
    )
  );

CREATE POLICY "ct2 sua bang" ON public.ct2_bang FOR UPDATE TO authenticated
  USING (public.ct2_quan_tri_bang(id))
  WITH CHECK (public.ct2_quan_tri_bang(id));

-- KHÔNG có policy DELETE: bảng chứa lịch sử đầu việc, xoá bảng là xoá bối
-- cảnh. Muốn ngừng dùng thì để trống — sẽ cân nhắc cờ "đã đóng" khi có nhu cầu.

CREATE POLICY "ct2 xem thanh vien bang" ON public.ct2_bang_thanh_vien FOR SELECT TO authenticated
  USING (public.ct2_xem_duoc_bang(bang_id));
CREATE POLICY "ct2 them thanh vien bang" ON public.ct2_bang_thanh_vien FOR INSERT TO authenticated
  WITH CHECK (public.ct2_quan_tri_bang(bang_id) AND nguoi_them = public.get_my_profile_id());
CREATE POLICY "ct2 xoa thanh vien bang" ON public.ct2_bang_thanh_vien FOR DELETE TO authenticated
  USING (public.ct2_quan_tri_bang(bang_id));

-- Đầu việc trên bảng hạn chế phải ẩn theo bảng. Thành viên bảng liên phòng
-- (người phòng khác) phải THẤY được thẻ của bảng dù không thuộc phòng đầu mối.
DROP POLICY IF EXISTS "ct2 xem dau viec" ON public.ct2_dau_viec;
CREATE POLICY "ct2 xem dau viec" ON public.ct2_dau_viec FOR SELECT TO authenticated
  USING (
    CASE
      WHEN bang_id IS NULL THEN public.ct2_xem_duoc_dau_viec(phong, cac_phong_tham_gia)
      ELSE public.ct2_xem_duoc_bang(bang_id)
    END
  );

-- ---------------------------------------------------------------------------
-- 5) PGĐ phụ trách một phòng — suy từ pgd_id của Trưởng phòng, để client
--    tự điền sẵn (người dùng vẫn sửa được trước khi lưu)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_pgd_cua_phong(_phong uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.pgd_id
    FROM public.departments d
    JOIN public.profiles p ON p.id = d.manager_id
   WHERE d.id = _phong
$$;
REVOKE ALL ON FUNCTION public.ct2_pgd_cua_phong(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_pgd_cua_phong(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Ba mảng mẫu cho Phòng TCTH — đúng ví dụ trong yêu cầu.
--    Mảng tổ chức HẠN CHẾ: chỉ gieo Trưởng phòng làm thành viên; Trưởng phòng
--    tự thêm Phó PHỤ TRÁCH (hệ thống không đoán được phó nào phụ trách mảng).
-- ---------------------------------------------------------------------------
DO $seed$
DECLARE
  tcth uuid;
  tp uuid;
BEGIN
  SELECT d.id, d.manager_id INTO tcth, tp
    FROM public.departments d WHERE d.code = 'TCTH' LIMIT 1;
  IF tcth IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.ct2_bang WHERE phong = tcth) THEN
    INSERT INTO public.ct2_bang (phong, ten, mo_ta, loai, che_do_xem)
    VALUES
      (tcth, 'Mảng hành chính', 'Hành chính – quản trị, văn thư, hậu cần', 'MANG', 'PHONG'),
      (tcth, 'Mảng tổng hợp', 'Tổng hợp – báo cáo, thi đua, truyền thông nội bộ', 'MANG', 'PHONG'),
      (tcth, 'Mảng tổ chức', 'Tổ chức – nhân sự. Chỉ thành viên được thêm đích danh và BGĐ xem được.', 'MANG', 'HAN_CHE');

    IF tp IS NOT NULL THEN
      INSERT INTO public.ct2_bang_thanh_vien (bang_id, profile_id)
      SELECT b.id, tp FROM public.ct2_bang b
       WHERE b.phong = tcth AND b.che_do_xem = 'HAN_CHE'
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $seed$;

COMMENT ON TABLE public.ct2_bang IS
  'Nhiều bảng Kanban cùng mẫu cho một phòng: mỗi mảng công việc một bảng, hoặc bảng liên phòng đặt ở phòng đầu mối. Đầu việc bang_id NULL thuộc «Kanban chung» của phòng. HAN_CHE = chỉ thành viên đích danh + BGĐ.';
