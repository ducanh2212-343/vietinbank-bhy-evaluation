-- Chặn tự chấm mình NGAY CẢ KHI đầu mối chưa liên kết tài khoản.
-- Trước đây bộ chặn chỉ dựa vào profile_id: nếu đầu mối chưa liên kết (profile_id IS NULL) thì
-- một thành viên Hội đồng trùng chính là đầu mối đó vẫn bỏ được phiếu tự chấm (đã xảy ra 1 lần).
-- Bổ sung: chặn thêm khi HỌ TÊN của người chấm trùng họ tên đầu mối (chuẩn hóa lowercase + bỏ khoảng trắng đầu/cuối).
DROP POLICY IF EXISTS "council_evaluations_insert_own" ON public.council_evaluations;
CREATE POLICY "council_evaluations_insert_own" ON public.council_evaluations
  FOR INSERT TO authenticated
  WITH CHECK (
    evaluator_id = public.get_my_profile_id()
    AND public.is_council_member()
    AND EXISTS (SELECT 1 FROM public.council_rounds r WHERE r.id = round_id AND r.status = 'open')
    AND EXISTS (
      SELECT 1 FROM public.council_subjects s
      WHERE s.id = subject_id AND s.round_id = council_evaluations.round_id AND s.is_active
        -- Không tự chấm mình theo tài khoản đã liên kết
        AND (s.profile_id IS NULL OR s.profile_id <> public.get_my_profile_id())
        -- Không tự chấm mình theo họ tên (bảo vệ trường hợp đầu mối chưa liên kết tài khoản)
        AND lower(btrim(s.full_name)) <> lower(btrim(COALESCE(
              (SELECT p.full_name FROM public.profiles p WHERE p.id = public.get_my_profile_id()), '')))
    )
  );
