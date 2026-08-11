-- Kỷ yếu số — ấn phẩm kỷ niệm 20 năm dạng flipbook trong cổng BHY ONE.
--
-- Nguồn dữ liệu là file PDF CẬP NHẬT ĐƯỢC: Phòng TCTH thay PDF/nhạc nền qua
-- trang quản trị, flipbook tự đọc bản mới theo phien_ban — không build lại code.
-- File nằm trong bucket private `ky-yeu`, cán bộ đọc qua signed URL có hạn.

CREATE TABLE public.ky_yeu_an_pham (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ten            TEXT NOT NULL,                -- "Cây ký ức — 20 năm BHY"
  mo_ta          TEXT,
  pdf_path       TEXT NOT NULL,                -- đường dẫn trong bucket ky-yeu
  nhac_path      TEXT,                         -- nhạc nền (mp3/m4a), có thể null
  so_trang       INT,
  phien_ban      INT  NOT NULL DEFAULT 1,      -- tăng 1 mỗi lần thay PDF → cache key
  trang_thai     TEXT NOT NULL DEFAULT 'nhap'
                 CHECK (trang_thai IN ('nhap', 'xuat_ban', 'luu_tru')),
  nguoi_tao      UUID REFERENCES auth.users(id),
  ngay_tao       TIMESTAMPTZ DEFAULT now(),
  ngay_cap_nhat  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ky_yeu_an_pham ENABLE ROW LEVEL SECURITY;

-- Cán bộ (không gồm khách đối tác) đọc bản đã xuất bản; quản trị thấy cả nháp
CREATE POLICY "Staff can view published ky yeu"
  ON public.ky_yeu_an_pham FOR SELECT TO authenticated
  USING (
    (public.is_staff(auth.uid()) AND trang_thai = 'xuat_ban')
    OR has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

-- Chỉ TCTH admin / System admin được đăng tải, thay bản, đổi trạng thái
CREATE POLICY "Content admins can manage ky yeu"
  ON public.ky_yeu_an_pham FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );

-- Bucket private: mọi truy cập file qua signed URL, không có URL công khai
INSERT INTO storage.buckets (id, name, public)
VALUES ('ky-yeu', 'ky-yeu', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff can view ky-yeu objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'ky-yeu' AND public.is_staff(auth.uid()));

CREATE POLICY "Content admins can upload ky-yeu objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ky-yeu' AND (
      has_role(auth.uid(), 'system_admin'::app_role)
      OR has_role(auth.uid(), 'tcth_admin'::app_role)
    )
  );

CREATE POLICY "Content admins can update ky-yeu objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ky-yeu' AND (
      has_role(auth.uid(), 'system_admin'::app_role)
      OR has_role(auth.uid(), 'tcth_admin'::app_role)
    )
  );

CREATE POLICY "Content admins can delete ky-yeu objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ky-yeu' AND (
      has_role(auth.uid(), 'system_admin'::app_role)
      OR has_role(auth.uid(), 'tcth_admin'::app_role)
    )
  );
