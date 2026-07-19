-- ĐĂNG KÝ NHU CẦU KHÓA HỌC TRƯỜNG ĐT VIETINBANK
-- Khóa của Trường không phải việc cán bộ tự làm được (không phải "hành động chủ động"):
--   1) Cán bộ ĐĂNG KÝ NHU CẦU học (từ gợi ý trong phiếu tự đánh giá).
--   2) Phòng TCTH có màn hình TỔNG HỢP nhu cầu theo khóa.
--   3) TCTH quyết cách tổ chức: tự tổ chức / đề nghị Trường tổ chức / ghi danh lớp
--      Trường chuẩn bị mở — lưu ở vtb_course_training_plans (1 dòng/khóa).

CREATE TABLE IF NOT EXISTS public.vtb_course_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.vtb_courses(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES public.skill_catalog(id),  -- skill ngữ cảnh lúc đăng ký (từ D.1)
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.vtb_course_training_plans (
  course_id uuid PRIMARY KEY REFERENCES public.vtb_courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','tu_to_chuc','de_nghi_truong','lop_truong_mo','da_to_chuc','khong_to_chuc')),
  note text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vtb_course_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vtb_course_training_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vtb_course_registrations, public.vtb_course_training_plans FROM anon;

-- Cán bộ: tự đăng ký / xem / hủy đăng ký của mình
CREATE POLICY "Own registrations" ON public.vtb_course_registrations
  FOR ALL TO authenticated
  USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());
-- TP/PGĐ xem đăng ký trong phạm vi; admin quản lý tất cả
CREATE POLICY "Scoped view registrations" ON public.vtb_course_registrations
  FOR SELECT TO authenticated
  USING (public.can_view_profile(profile_id));
CREATE POLICY "Admins manage registrations" ON public.vtb_course_registrations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role));

-- Kế hoạch tổ chức: mọi người đăng nhập xem được (cán bộ biết khóa mình đăng ký đã được xếp lịch chưa); admin quản lý
CREATE POLICY "Authenticated read training plans" ON public.vtb_course_training_plans
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage training plans" ON public.vtb_course_training_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'system_admin'::app_role) OR public.has_role(auth.uid(),'bgd'::app_role) OR public.has_role(auth.uid(),'tcth_admin'::app_role));
