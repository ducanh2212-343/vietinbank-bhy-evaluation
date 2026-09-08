-- ============================================================================
-- DÒNG THỜI GIAN KẾT NỐI — Bắc Hưng Yên Connect
--
-- Giám đốc 08/09/2026: «hình ảnh các chương trình, thư mời của chương trình AI
-- cũng chỉ là một phần trong dòng thời gian của chương trình… để mỗi lần thêm
-- hoạt động là Phòng KHDN / Tổ chức Tổng hợp chủ động đăng thêm dòng lịch sử».
--
-- Trước đây trang Connect là chữ tĩnh trong mã: mỗi hội nghị mới là một lần
-- sửa mã và chờ deploy. Nay mỗi hoạt động là MỘT DÒNG trong bảng này, gắn được
-- với một bài trong kho tư liệu (portal_uploads) để mượn ảnh và bài đầy đủ,
-- hoặc mang ảnh riêng, hoặc chỉ là một dấu mốc có chữ.
--
-- Không gộp vào portal_uploads: bài viết là TƯ LIỆU (ai cũng đăng, nhiều
-- chuyên mục, có like), còn dòng thời gian là LỊCH SỬ CHƯƠNG TRÌNH (ít dòng,
-- có thứ tự ngày, chỉ hai phòng chủ trì được ghi). Một dòng có thể trỏ tới
-- một bài, nhưng một bài không tự thành một dòng.
-- ============================================================================

CREATE TABLE public.connect_dong_thoi_gian (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ngay date NOT NULL,
  -- hoi-nghi: hội nghị khách hàng · dien-dan: diễn đàn/hội thảo tri thức
  -- ket-noi: hoạt động kết nối/hợp tác cụ thể · thu-vien: tài liệu, thư ngỏ, hồ sơ
  -- dau-moc: mốc chương trình (khởi động, tổng kết…)
  loai text NOT NULL CHECK (loai IN ('hoi-nghi', 'dien-dan', 'ket-noi', 'thu-vien', 'dau-moc')),
  tieu_de text NOT NULL CHECK (length(btrim(tieu_de)) BETWEEN 5 AND 160),
  mo_ta text,
  -- Mỗi phần tử một điểm nhấn/con số («+795 tỷ đồng GHTD đã cấp»). Tối đa 6.
  diem_nhan text[] NOT NULL DEFAULT '{}',
  -- Ảnh riêng của dòng, đường dẫn trong kho bhy-one dưới shared/ (xem ghi chú
  -- policy bên dưới). Dòng gắn bài viết thì mượn ảnh của bài, không cần cột này.
  anh text[] NOT NULL DEFAULT '{}',
  bai_viet_id uuid REFERENCES public.portal_uploads(id) ON DELETE SET NULL,
  lien_ket text,
  -- Dòng nổi bật dựng to hơn trên trang (hội nghị lớn, diễn đàn)
  noi_bat boolean NOT NULL DEFAULT false,
  -- Khách đối tác (guest) chỉ thấy dòng bật cờ này — mặc định KHÔNG
  mo_cho_khach boolean NOT NULL DEFAULT false,
  nguoi_tao uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.connect_dong_thoi_gian IS
  'Dòng thời gian Bắc Hưng Yên Connect: mỗi hoạt động một dòng, Phòng KHDN / TCTH / BGĐ ghi; gắn được bài trong portal_uploads.';

CREATE INDEX connect_dong_thoi_gian_ngay_idx ON public.connect_dong_thoi_gian (ngay DESC);

ALTER TABLE public.connect_dong_thoi_gian ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.connect_dong_thoi_gian FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connect_dong_thoi_gian TO authenticated;

-- ---------------------------------------------------------------------------
-- Ai ghi được: Phòng KHDN (chủ trì chương trình), Phòng Tổ chức Tổng hợp
-- (truyền thông, admin nội dung cổng) và Ban Giám đốc. Xét theo PHÒNG của hồ
-- sơ cán bộ chứ không theo vai trò đăng nhập: cán bộ KHDN là employee thường,
-- không có vai riêng, và không nên đẻ thêm vai chỉ để ghi một bảng.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.connect_soan_duoc(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_content_admin(_user_id)
      OR public.has_role(_user_id, 'bgd'::app_role)
      OR EXISTS (
        SELECT 1
          FROM public.profiles p
          JOIN public.departments d ON d.id = p.department_id
         WHERE p.user_id = _user_id
           AND d.code IN ('KHDN', 'TCTH')
      )
$$;
REVOKE ALL ON FUNCTION public.connect_soan_duoc(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.connect_soan_duoc(uuid) TO authenticated, service_role;

-- Cán bộ đọc hết; khách đối tác đang còn hạn chỉ đọc dòng mở cho khách
CREATE POLICY "Can bo doc dong thoi gian Connect"
  ON public.connect_dong_thoi_gian FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR (public.guest_active(auth.uid()) AND mo_cho_khach)
  );

CREATE POLICY "KHDN TCTH BGD them dong thoi gian Connect"
  ON public.connect_dong_thoi_gian FOR INSERT TO authenticated
  WITH CHECK (public.connect_soan_duoc(auth.uid()));

CREATE POLICY "KHDN TCTH BGD sua dong thoi gian Connect"
  ON public.connect_dong_thoi_gian FOR UPDATE TO authenticated
  USING (public.connect_soan_duoc(auth.uid()))
  WITH CHECK (public.connect_soan_duoc(auth.uid()));

CREATE POLICY "KHDN TCTH BGD xoa dong thoi gian Connect"
  ON public.connect_dong_thoi_gian FOR DELETE TO authenticated
  USING (public.connect_soan_duoc(auth.uid()));

-- Chuẩn hoá ngay tại tầng dữ liệu: giao diện có thể bị đi vòng
CREATE OR REPLACE FUNCTION public.f_connect_dong_thoi_gian_truoc_ghi()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.tieu_de := btrim(NEW.tieu_de);
  NEW.diem_nhan := COALESCE(NEW.diem_nhan, '{}');
  NEW.anh := COALESCE(NEW.anh, '{}');
  IF array_length(NEW.diem_nhan, 1) > 6 THEN
    RAISE EXCEPTION 'Mỗi hoạt động tối đa 6 điểm nhấn — giữ con số đắt nhất.';
  END IF;
  IF array_length(NEW.anh, 1) > 8 THEN
    RAISE EXCEPTION 'Mỗi hoạt động tối đa 8 ảnh — bộ ảnh đầy đủ nên đăng thành bài trong kho tư liệu rồi gắn vào.';
  END IF;
  IF TG_OP = 'INSERT' AND NEW.nguoi_tao IS NULL THEN
    NEW.nguoi_tao := public.get_my_profile_id();
  END IF;
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS connect_dong_thoi_gian_truoc_ghi ON public.connect_dong_thoi_gian;
CREATE TRIGGER connect_dong_thoi_gian_truoc_ghi
  BEFORE INSERT OR UPDATE ON public.connect_dong_thoi_gian
  FOR EACH ROW EXECUTE FUNCTION public.f_connect_dong_thoi_gian_truoc_ghi();

-- ---------------------------------------------------------------------------
-- Ghi chú kho ảnh: ảnh riêng của dòng đặt dưới shared/ vì khách đối tác chỉ ký
-- được đường dẫn shared/% (policy bucket bhy-one, 08/2026). Connect là chương
-- trình hướng ra khách hàng, nên ảnh hoạt động không phải bí mật nội bộ; thứ
-- gác khách là cờ mo_cho_khach trên DÒNG (khách không thấy dòng thì không có
-- đường dẫn để ký).
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Nạp lịch sử đã có — trùng với bản dự phòng trong mã
-- (src/data/one/connectDongThoiGian.ts) để trang không trống trước khi áp.
-- Bài «Chạm AI» đã có trong kho tư liệu (đăng 07/09/2026) — gắn theo tiêu đề,
-- không gắn theo id để migration chạy được ở môi trường khác.
-- ---------------------------------------------------------------------------
INSERT INTO public.connect_dong_thoi_gian (ngay, loai, tieu_de, mo_ta, diem_nhan, noi_bat, mo_cho_khach)
VALUES
  ('2024-10-01', 'dau-moc', 'Khởi động chương trình VietinBank Bắc Hưng Yên Connect',
   'Thư ngỏ và Onepage «Kết nối kinh doanh» gửi tới khách hàng doanh nghiệp: Chi nhánh đứng ra tìm kiếm, giới thiệu và kết nối đối tác theo ngành hàng, đi kèm sản phẩm tài trợ chuỗi cung ứng.',
   ARRAY['10 ngành hàng trọng tâm trên địa bàn', 'Đầu mối Phòng Khách hàng doanh nghiệp'], true, true),
  ('2024-11-15', 'hoi-nghi', 'Hội nghị kết nối kinh doanh KHDN chủ đề «Thu» tại Melia Ba Vì',
   'Hội nghị đầu tiên của chương trình: khách hàng doanh nghiệp chia sẻ kế hoạch dự án, chọn VietinBank Bắc Hưng Yên đồng hành từ pháp lý tới phương án tài chính; các nhóm ngành nước giải khát, bao bì, nhựa, gỗ bắt đầu giao dịch chuỗi với nhau.',
   ARRAY['+795 tỷ đồng giới hạn tín dụng đã cấp', '~915 tỷ đồng chuẩn bị cấp', '6 khách hàng doanh nghiệp mới', '3 dự án mới xin đồng hành', '5 nhóm khách hàng giao dịch chuỗi'], true, true),
  ('2025-03-15', 'hoi-nghi', 'Hội nghị khách hàng bán lẻ chủ đề «Xuân»',
   'Mở rộng Connect sang khách hàng bán lẻ và chủ doanh nghiệp: duy trì nhịp hội nghị hai mùa Thu – Xuân, gắn kết hệ sinh thái khách hàng cá nhân với doanh nghiệp trên địa bàn.',
   ARRAY['Nhịp hội nghị hai mùa Thu – Xuân được xác lập'], false, true),
  ('2025-08-15', 'ket-noi', 'Chương trình «Sóng 25» — gắn kết khách hàng mùa hè 2025',
   'Hoạt động trải nghiệm khách hàng của chương trình Connect trong năm 2025: giữ nhịp kết nối giữa hai mùa hội nghị.',
   ARRAY['Hoạt động trải nghiệm khách hàng (CX) đầu tiên của Connect'], false, true),
  ('2026-03-15', 'ket-noi', 'Hành trình «Mặt trời mọc» — khám phá Nhật Bản cùng khách hàng',
   'Chuyến đi trải nghiệm cùng khách hàng thân thiết: nâng cao trải nghiệm và gắn kết, hướng tới Tin cậy – Hài lòng – Gắn bó.',
   ARRAY['Tin cậy – Hài lòng – Gắn bó'], false, true),
  ('2026-08-26', 'dien-dan', 'Diễn đàn «Chạm AI, Chạm tương lai» — ứng dụng AI trong doanh nghiệp',
   'Doanh nghiệp, đơn vị hành chính sự nghiệp và cán bộ chủ chốt cùng nghe câu chuyện AI từ thực tế sản xuất (Nhựa Mai Phương, Symper), trải nghiệm Bắc Hưng Yên KitLab và góc nhìn VietinBank «AI mở ra cơ hội gì cho doanh nghiệp?». Thông điệp: AI thật – Việc thật – Giá trị thật.',
   ARRAY['3 diễn giả từ doanh nghiệp sản xuất và chuyển đổi số', 'KitLab: thực hành AI, kính AI Rokid, Bắc Hưng Yên One', 'Tọa đàm, Quizzi và tiệc kết nối'], true, true);

UPDATE public.connect_dong_thoi_gian t
   SET bai_viet_id = u.id
  FROM public.portal_uploads u
 WHERE t.ngay = '2026-08-26' AND t.bai_viet_id IS NULL
   AND u.title ILIKE 'CHẠM AI, CHẠM TƯƠNG LAI%';
