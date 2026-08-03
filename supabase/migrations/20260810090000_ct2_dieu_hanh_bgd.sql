-- ============================================================================
-- MÀN «ĐIỀU HÀNH CỦA TÔI» cho Ban Giám đốc + bằng chứng tuần cho Dấu ấn
--
-- BÀI TOÁN: một Phó Giám đốc hiện phải đi qua bốn nơi mới nắm được việc của
-- mình — trang chủ ONE, bảng Chiêu thức 2 của các phòng phụ trách, trang
-- /dau-an, và Kanban cá nhân. Chưa nơi nào cho họ thấy VIỆC ĐANG NẰM TRONG TAY
-- CHÍNH HỌ, dù đặc tả §7.4 nói rõ phải có: «tự soi ngược lên lãnh đạo, không
-- chỉ soi xuống cán bộ».
--
-- Không thêm nhịp mới. Bắc Hưng Yên Mark đã dùng chung nhịp tuần của Kanban
-- (thẻ dấu ấn nằm trong kanban_cards), nên chỉ có hai nhịp: NGÀY (Chiêu thức 2)
-- và TUẦN (Kanban + dấu ấn). Việc cần làm là gộp NƠI NHÌN, giữ nguyên NHỊP.
--
-- Ba RPC dưới đây phục vụ đúng ba tầng của màn hình, mỗi tầng một vòng gọi.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Bằng chứng tuần cho Dấu ấn — biến nhịp tuần thành cỗ máy bồi đắp STAR
--
-- Dấu ấn kéo dài cả kỳ T7–T8. Hỏi «% bao nhiêu» mỗi tuần cho một việc hai
-- tháng thì chỉ nhận lại «vẫn đang làm». Đổi câu hỏi thành «tuần này có thêm
-- bằng chứng gì?» — mỗi tuần bồi một mẩu vào Action/Result. Cuối kỳ STAR tự
-- đầy, PGĐ không phải ngồi viết lại một lượt từ trí nhớ.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ct2_bang_chung_dau_an (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_id uuid NOT NULL REFERENCES public.leadership_marks(id) ON DELETE CASCADE,
  -- Thứ Hai của tuần ghi — trùng mốc getVietnamWeekStart của Kanban
  tuan date NOT NULL,
  -- Mẩu này bồi vào phần nào của STAR. Thực tế gần như luôn là A hoặc R.
  phan_star char(1) NOT NULL DEFAULT 'A' CHECK (phan_star IN ('S','T','A','R')),
  noi_dung text NOT NULL CHECK (char_length(trim(noi_dung)) >= 15),
  nguoi_ghi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ghi_luc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ct2_bc_dau_an
  ON public.ct2_bang_chung_dau_an(mark_id, tuan DESC);

-- Append-only như mọi nhật ký khác trong Chiêu thức 2: đây là bằng chứng, ghi
-- sai thì bồi mẩu mới đính chính, không sửa đè.
GRANT SELECT, INSERT ON public.ct2_bang_chung_dau_an TO authenticated;
GRANT ALL ON public.ct2_bang_chung_dau_an TO service_role;
ALTER TABLE public.ct2_bang_chung_dau_an ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ct2 xem bang chung dau an" ON public.ct2_bang_chung_dau_an;
CREATE POLICY "ct2 xem bang chung dau an" ON public.ct2_bang_chung_dau_an
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leadership_marks m
    WHERE m.id = mark_id
      AND (m.profile_id = public.get_my_profile_id()
           OR public.can_view_all_action_plans())
  ));

DROP POLICY IF EXISTS "ct2 ghi bang chung dau an" ON public.ct2_bang_chung_dau_an;
CREATE POLICY "ct2 ghi bang chung dau an" ON public.ct2_bang_chung_dau_an
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff(auth.uid())
    AND nguoi_ghi = public.get_my_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.leadership_marks m
      WHERE m.id = mark_id AND m.profile_id = public.get_my_profile_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 2) TẦNG «ĐANG CHỜ CHÍNH TÔI» — thứ đang chặn người khác, xếp trước tiên
--
-- Gộp hai nguồn về một danh sách: đầu việc Chiêu thức 2 ở cột chờ mà tôi là
-- người giữ, và hồ sơ tín dụng đang trình lên cấp tôi. Tuổi chờ tính từ lúc
-- việc rơi vào tay tôi, không phải từ lúc tạo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_cho_toi_duyet()
RETURNS TABLE (
  loai text,            -- DAU_VIEC | HO_SO_TIN_DUNG
  id uuid,
  ma text,
  tieu_de text,
  phong uuid,
  nguoi_gui text,       -- ai đang chờ tôi
  so_tien numeric,      -- chỉ có với hồ sơ tín dụng
  tuoi_cho int,
  ngay_giu timestamptz
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT 'DAU_VIEC'::text, d.id, d.ma_hien_thi, d.tieu_de, d.phong,
         p.full_name, NULL::numeric,
         GREATEST(0, ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                      - (d.giu_tu AT TIME ZONE 'Asia/Ho_Chi_Minh')::date))::int,
         d.giu_tu
    FROM public.ct2_dau_viec d
    JOIN public.profiles p ON p.id = d.nguoi_chiu_trach_nhiem
   WHERE d.nguoi_dang_giu = public.get_my_profile_id()
     AND d.trang_thai IN ('CHO_DUYET','CHO_PHOI_HOP')

  UNION ALL

  -- Hồ sơ tín dụng: trình đích danh tôi, hoặc trình LĐ Chi nhánh mà tôi là
  -- Phó Giám đốc phụ trách chính phòng đó
  SELECT 'HO_SO_TIN_DUNG'::text, h.id, h.ma_hs, h.khach_hang, h.phong,
         p.full_name, h.so_tien,
         GREATEST(0, ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                      - (h.giu_tu AT TIME ZONE 'Asia/Ho_Chi_Minh')::date))::int,
         h.giu_tu
    FROM public.ct2_ho_so_tin_dung h
    JOIN public.profiles p ON p.id = h.can_bo
   WHERE h.trang_thai IN ('TRINH_LDP','TRINH_LDCN')
     AND (
       h.nguoi_dang_giu = public.get_my_profile_id()
       OR (h.trang_thai = 'TRINH_LDCN'
           AND h.phong = ANY(public.get_my_pgd_scope_dept_ids()))
     )

   ORDER BY 8 DESC NULLS LAST
$$;

-- ---------------------------------------------------------------------------
-- 3) TẦNG «PHÒNG TÔI PHỤ TRÁCH HÔM NAY» — một dòng cho mỗi phòng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_bgd_phong_cua_toi()
RETURNS TABLE (
  phong uuid, ten_phong text,
  so_nguoi_can_ghi bigint, so_nguoi_da_ghi bigint,
  so_the_dang_chay bigint, so_the_do bigint, so_the_qua_han bigint
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH pham_vi AS (
    SELECT d.id, d.name
      FROM public.departments d
     WHERE public.can_view_all_action_plans()
        OR d.id = ANY(public.get_my_pgd_scope_dept_ids())
        OR d.id = public.get_my_department_id()
  ), the AS (
    SELECT v.id AS phong, t.id AS the_id, t.nguoi_chiu_trach_nhiem,
           t.co_tinh_trang, t.han_hoan_thanh, t.trang_thai, t.loai_dau_viec
      FROM pham_vi v
      JOIN public.ct2_dau_viec t ON t.phong = v.id
     WHERE t.trang_thai IN ('CHUAN_BI','DANG_LAM','CHO_PHOI_HOP','CHO_DUYET')
  ), nguoi AS (
    SELECT th.phong, th.nguoi_chiu_trach_nhiem,
           bool_or(EXISTS (
             SELECT 1 FROM public.ct2_nhip_pdca n
              WHERE n.dau_viec_id = th.the_id
                AND (n.ghi_luc AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
                    = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
           )) AS da_ghi
      FROM the th
     WHERE th.loai_dau_viec = 'TIEN_TRINH' AND th.trang_thai = 'DANG_LAM'
     GROUP BY th.phong, th.nguoi_chiu_trach_nhiem
  )
  SELECT v.id, v.name,
         (SELECT count(*) FROM nguoi n WHERE n.phong = v.id),
         (SELECT count(*) FROM nguoi n WHERE n.phong = v.id AND n.da_ghi),
         (SELECT count(*) FROM the t WHERE t.phong = v.id),
         (SELECT count(*) FROM the t WHERE t.phong = v.id AND t.co_tinh_trang = 'DO'),
         (SELECT count(*) FROM the t WHERE t.phong = v.id
            AND t.han_hoan_thanh < (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)
    FROM pham_vi v
   ORDER BY v.name
$$;

-- ---------------------------------------------------------------------------
-- 4) TẦNG «DẤU ẤN CỦA TÔI TUẦN NÀY»
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ct2_dau_an_tuan_nay()
RETURNS TABLE (
  mark_id uuid, tieu_de text, deadline date, trang_thai text,
  da_boi_tuan_nay boolean, so_manh_da_boi bigint, boi_gan_nhat timestamptz
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH dau_tuan AS (
    -- Thứ Hai của tuần hiện tại theo giờ VN — trùng getVietnamWeekStart
    SELECT (date_trunc('week', now() AT TIME ZONE 'Asia/Ho_Chi_Minh'))::date AS d
  )
  SELECT m.id, m.title, m.deadline, m.status,
         EXISTS (
           SELECT 1 FROM public.ct2_bang_chung_dau_an b, dau_tuan
            WHERE b.mark_id = m.id AND b.tuan = dau_tuan.d
         ),
         (SELECT count(*) FROM public.ct2_bang_chung_dau_an b WHERE b.mark_id = m.id),
         (SELECT max(b.ghi_luc) FROM public.ct2_bang_chung_dau_an b WHERE b.mark_id = m.id)
    FROM public.leadership_marks m
   WHERE m.profile_id = public.get_my_profile_id()
     AND m.status IN ('active','confirmed')
   ORDER BY m.sort_order NULLS LAST, m.created_at
$$;

REVOKE ALL ON FUNCTION public.ct2_cho_toi_duyet() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ct2_bgd_phong_cua_toi() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ct2_dau_an_tuan_nay() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_cho_toi_duyet() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_bgd_phong_cua_toi() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_dau_an_tuan_nay() TO authenticated;

COMMENT ON TABLE public.ct2_bang_chung_dau_an IS
  'Bằng chứng tuần của Dấu ấn Bắc Hưng Yên Mark — mỗi tuần bồi một mẩu vào STAR, append-only. Cuối kỳ STAR tự đầy thay vì phải viết lại từ trí nhớ.';
