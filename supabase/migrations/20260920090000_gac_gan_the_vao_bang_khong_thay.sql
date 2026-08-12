-- Rà soát bảng toàn chi nhánh (GĐ 12/08): mô hình phân quyền trên bảng chung
-- là PHÂN QUYỀN THEO THẺ — mỗi thẻ vẫn thuộc đúng một phòng (phòng của người
-- lập, không phải phòng đầu mối bảng) và một người chịu trách nhiệm, nên
-- trưởng phòng nào quản phần của phòng đó, nhịp đếm về phòng đó. Đã đúng.
--
-- Lỗ hổng lộ ra khi rà: ct2_dau_viec.bang_id KHÔNG có rào — ai tạo được thẻ
-- ở phòng mình là gắn được thẻ vào BẤT KỲ bảng nào, kể cả bảng hạn chế của
-- phòng khác mà họ không mở được (thẻ sẽ hiện trong bảng đó với thành viên).
-- Trước đây vô hại vì bảng chỉ quanh quẩn trong phòng; có bảng toàn chi nhánh
-- thì việc gắn thẻ chéo bảng thành thao tác hằng ngày — rào phải rõ.
--
-- Luật: chỉ gắn thẻ vào bảng mình XEM ĐƯỢC (ct2_xem_duoc_bang — một hàm cho
-- mọi policy). Bảng toàn chi nhánh ai cũng thấy → mọi phòng tự gắn thẻ của
-- mình lên đó, đúng kịch bản «triển khai chung, phân quyền theo từng phòng».
-- Bỏ qua khi chạy nền (auth.uid() IS NULL — nhập liệu, migration): các vai
-- đó vốn đứng ngoài RLS.

CREATE OR REPLACE FUNCTION public.f_ct2_dv_gac_bang()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.bang_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.bang_id IS DISTINCT FROM OLD.bang_id) THEN
    IF NOT public.ct2_xem_duoc_bang(NEW.bang_id) THEN
      RAISE EXCEPTION 'Không gắn được thẻ vào bảng mà anh/chị không xem được.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS t_ct2_dv_gac_bang ON public.ct2_dau_viec;
CREATE TRIGGER t_ct2_dv_gac_bang
  BEFORE INSERT OR UPDATE OF bang_id ON public.ct2_dau_viec
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_dv_gac_bang();
