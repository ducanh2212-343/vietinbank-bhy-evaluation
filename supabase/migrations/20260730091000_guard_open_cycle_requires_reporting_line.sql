-- CHỈ MỞ KỲ ĐÁNH GIÁ KHI MỌI CÁN BỘ ĐÃ CÓ TUYẾN DUYỆT (27/07/2026)
--
-- Yêu cầu Giám đốc: phải gán hết người đánh giá (trừ Giám đốc — không có cấp trên)
-- rồi mới được mở kỳ. Nếu mở kỳ khi còn hồ sơ trống tuyến, cán bộ đó nộp phiếu xong
-- sẽ không ai rà soát/phê duyệt được (sự cố Dương Thị Thanh Thúy 25/07).
--
-- "Có tuyến" = có ít nhất một trong ba: Quản lý trực tiếp / PGĐ phụ trách / Giám đốc
-- phụ trách. (Trưởng phòng không có Quản lý trực tiếp là bình thường — PGĐ phụ trách
-- chính là cấp trên của họ.)
--
-- Áp dụng khi TẠO kỳ ở trạng thái 'in_progress' hoặc MỞ LẠI kỳ đang đóng.
-- Đóng kỳ / sửa hạn nộp không bị chặn.

CREATE OR REPLACE FUNCTION public.guard_open_cycle_requires_reporting_line()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_missing text;
  v_count integer;
BEGIN
  -- Chỉ xét lúc CHUYỂN SANG mở kỳ
  IF NEW.status <> 'in_progress' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'in_progress' THEN RETURN NEW; END IF;

  SELECT count(*), string_agg(x.full_name, ', ' ORDER BY x.full_name)
    INTO v_count, v_missing
    FROM (
      SELECT p.full_name
        FROM public.profiles p
       WHERE p.status = 'active'
         AND p.manager_id IS NULL
         AND p.pgd_id IS NULL
         AND p.director_id IS NULL
         -- Giám đốc chi nhánh không có cấp trên → miễn trừ
         AND COALESCE(lower(btrim(p.position)), '') NOT IN ('giám đốc', 'giám đốc chi nhánh')
       LIMIT 20
    ) x;

  IF COALESCE(v_count, 0) > 0 THEN
    RAISE EXCEPTION 'Chưa mở được kỳ: còn % cán bộ chưa gán người đánh giá (%). Vào "Phân công người đánh giá" gán Quản lý trực tiếp / PGĐ phụ trách rồi mở kỳ lại.',
      v_count, v_missing;
  END IF;

  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.guard_open_cycle_requires_reporting_line() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_open_cycle_reporting_line_tr ON public.evaluation_cycles;
CREATE TRIGGER guard_open_cycle_reporting_line_tr
  BEFORE INSERT OR UPDATE ON public.evaluation_cycles
  FOR EACH ROW EXECUTE FUNCTION public.guard_open_cycle_requires_reporting_line();
