-- Đợt 5 BHY one: phiếu Sao Xứng Đáng (port từ siteSettings/starRecords của Firestore).
-- Mỗi phiếu một dòng (bản gốc dồn cả mảng vào 1 document — giới hạn 1MB).
-- is_collective tính lúc nhập (sửa lỗ hổng 23 sao "mồ côi" của bản gốc).

CREATE TABLE public.star_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  stars NUMERIC NOT NULL CHECK (stars > 0),
  reason TEXT,
  result TEXT,
  awarded_on DATE NOT NULL,
  sender TEXT,
  serial TEXT,
  is_collective BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'import' CHECK (source IN ('import', 'form')),
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_star_records_department ON public.star_records (department);
CREATE INDEX idx_star_records_awarded_on ON public.star_records (awarded_on DESC);

ALTER TABLE public.star_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view star records"
  ON public.star_records FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- Cán bộ gửi phiếu ghi nhận từ form (source='form'); nhập hàng loạt là việc của admin
CREATE POLICY "Staff can submit form star records"
  ON public.star_records FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) AND source = 'form' AND created_by = auth.uid());

CREATE POLICY "Admins can manage star records"
  ON public.star_records FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'system_admin'::app_role)
    OR has_role(auth.uid(), 'tcth_admin'::app_role)
  );
