-- ---------------------------------------------------------------------------
-- TRAINING CENTER TOOLKIT — bản vẽ trực quan gắn với từng đầu việc
--
-- Giám đốc 13/09/2026: «xây dựng tính năng Training Center Toolkit như phần mềm
-- tạo mindmap trực quan… từng lịch học, bài tập cụ thể, học viên ấn nút dùng
-- Training Center Toolkit sau đó chọn mindmap, sẽ hiện ra… thêm toolkit mô hình
-- 4 hộp (các trục có thể tuỳ chọn), thêm công cụ vẽ hình… dùng bút vẽ».
--
-- Một bảng cho cả ba công cụ, phân biệt bằng cột loai. Dữ liệu bản vẽ là jsonb
-- TỰ MÔ TẢ theo khuôn của từng công cụ (src/lib/toolkit/*.ts đọc/ghi); database
-- không cần hiểu ruột — nó chỉ gác ai đọc, ai ghi, và không cho một bản vẽ
-- phình quá 512 KB.
--
-- Vì sao bảng riêng chứ không nhét vào ttc_tien_do.tep: một đầu việc có thể có
-- nhiều bản vẽ (sơ đồ tư duy + ma trận 4 hộp cho cùng một bài), mỗi bản có vòng
-- đời riêng (sửa nhiều lần rồi mới nộp), và Ban Giám đốc cần mở xem bản vẽ ở
-- dạng sống chứ không chỉ ảnh — ảnh PNG là sản phẩm xuất ra, không phải nguồn.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ttc_toolkit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dau_viec_id   uuid NOT NULL REFERENCES public.ttc_dau_viec(id) ON DELETE CASCADE,
  nguoi         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  loai          text NOT NULL CHECK (loai IN ('MINDMAP', 'BON_HOP', 'VE_TAY')),
  tieu_de       text NOT NULL DEFAULT '',
  du_lieu       jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Đường dẫn PNG xem trước trong kho bhy-training; NULL khi chưa xuất ảnh
  anh_xem_truoc text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ttc_toolkit IS
  'Bản vẽ Training Center Toolkit (sơ đồ tư duy · mô hình 4 hộp · bảng vẽ tay) của một người cho một đầu việc. du_lieu theo khuôn src/lib/toolkit/*.ts.';

CREATE INDEX IF NOT EXISTS ttc_toolkit_dau_viec_nguoi_idx ON public.ttc_toolkit (dau_viec_id, nguoi);

-- Chuẩn hoá và chặn ở tầng dữ liệu — bảng ghi thẳng được qua PostgREST
CREATE OR REPLACE FUNCTION public.f_ttc_toolkit_truoc_ghi()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.du_lieu IS NULL OR jsonb_typeof(NEW.du_lieu) <> 'object' THEN
    NEW.du_lieu := '{}'::jsonb;
  END IF;
  -- 512 KB một bản vẽ: bản vẽ tay lưu NÉT chứ không lưu ảnh nên bình thường vài
  -- chục KB; vượt trần gần như chắc là client đang gửi nhầm ảnh base64 vào jsonb
  IF octet_length(NEW.du_lieu::text) > 524288 THEN
    RAISE EXCEPTION 'Bản vẽ quá lớn (trên 512 KB). Bớt nét vẽ hoặc tách thành hai bản.';
  END IF;
  NEW.tieu_de := left(btrim(COALESCE(NEW.tieu_de, '')), 120);
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ttc_toolkit_truoc_ghi ON public.ttc_toolkit;
CREATE TRIGGER ttc_toolkit_truoc_ghi BEFORE INSERT OR UPDATE ON public.ttc_toolkit
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_toolkit_truoc_ghi();

-- ---------------------------------------------------------------------------
-- RLS — cùng khuôn với ttc_tien_do: thành viên chương trình xem (Ban Giám đốc,
-- người hướng dẫn mở được bản vẽ của học viên), chủ bản vẽ mới sửa/xoá.
--
-- Khác ttc_tien_do ở chỗ INSERT không giới hạn vai học viên: Phó Giám đốc hay
-- Phòng TCTH cũng có lúc cần vẽ một sơ đồ cho đầu việc mình phụ trách (ví dụ
-- mẫu ma trận 4 hộp để học viên tham khảo). Chủ bản vẽ vẫn phải là chính mình.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ttc_toolkit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ttc_toolkit FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ttc_toolkit TO authenticated;

DROP POLICY IF EXISTS "ttc xem toolkit" ON public.ttc_toolkit;
CREATE POLICY "ttc xem toolkit" ON public.ttc_toolkit FOR SELECT TO authenticated
  USING (public.ttc_la_thanh_vien(public.ttc_ct_cua_dau_viec(dau_viec_id)));

DROP POLICY IF EXISTS "ttc tao toolkit" ON public.ttc_toolkit;
CREATE POLICY "ttc tao toolkit" ON public.ttc_toolkit FOR INSERT TO authenticated
  WITH CHECK (nguoi = public.get_my_profile_id()
              AND public.ttc_la_thanh_vien(public.ttc_ct_cua_dau_viec(dau_viec_id)));

DROP POLICY IF EXISTS "ttc sua toolkit" ON public.ttc_toolkit;
CREATE POLICY "ttc sua toolkit" ON public.ttc_toolkit FOR UPDATE TO authenticated
  USING (nguoi = public.get_my_profile_id())
  WITH CHECK (nguoi = public.get_my_profile_id());

DROP POLICY IF EXISTS "ttc xoa toolkit" ON public.ttc_toolkit;
CREATE POLICY "ttc xoa toolkit" ON public.ttc_toolkit FOR DELETE TO authenticated
  USING (nguoi = public.get_my_profile_id());
