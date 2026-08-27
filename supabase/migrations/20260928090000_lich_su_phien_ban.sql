-- ---------------------------------------------------------------------------
-- LỊCH SỬ PHIÊN BẢN — báo cho cán bộ biết hệ thống vừa lên tính năng gì
--
-- Nội dung từng mục cập nhật nằm TRONG MÃ NGUỒN (src/data/changelog/), không
-- nằm ở database: mục lịch sử sinh ra cùng lúc với tính năng, cùng một PR, nên
-- để chung một chỗ thì không bao giờ có cảnh mã lên rồi mà lịch sử quên cập
-- nhật. Database chỉ giữ hai thứ mà mã nguồn không giữ được:
--   1. phien_ban_da_xem   — mỗi cán bộ đã đọc tới mục nào (theo người, đồng bộ
--                            giữa điện thoại và máy tính).
--   2. phien_ban_cong_bo  — đợt cập nhật nào ĐÃ báo cho cán bộ rồi, để không
--                            bao giờ báo lại lần hai dù ai bấm nút.
-- ---------------------------------------------------------------------------

-- 1) Mốc "đã xem tới đâu" của từng cán bộ ------------------------------------
-- Mốc là MÃ MỤC chứ không phải số phiên bản: mã gắn chết với một lần cập nhật,
-- còn số phiên bản là thứ hệ thống tự tính nên có thể dịch nếu về sau có mục
-- được bổ sung lùi ngày.
CREATE TABLE IF NOT EXISTS public.phien_ban_da_xem (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  ma_moi_nhat text NOT NULL,
  xem_luc timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.phien_ban_da_xem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Moi nguoi tu quan ly moc da xem cua minh" ON public.phien_ban_da_xem;
CREATE POLICY "Moi nguoi tu quan ly moc da xem cua minh"
  ON public.phien_ban_da_xem FOR ALL TO authenticated
  USING (profile_id = public.get_my_profile_id())
  WITH CHECK (profile_id = public.get_my_profile_id());

REVOKE ALL ON public.phien_ban_da_xem FROM anon;

-- 2) Sổ các đợt đã công bố ---------------------------------------------------
-- Một dòng = một mục cập nhật ĐÃ báo tới cán bộ. Khoá chính là mã mục nên bấm
-- nút công bố hai lần (hoặc hai quản trị viên cùng bấm) cũng chỉ ra một tin.
CREATE TABLE IF NOT EXISTS public.phien_ban_cong_bo (
  ma text PRIMARY KEY,
  phien_ban text NOT NULL,
  ngay date NOT NULL,
  loai text NOT NULL CHECK (loai IN ('lon', 'tinh-nang', 'sua-loi')),
  tieu_de text NOT NULL,
  -- Kênh đã dùng: 'bell' luôn có, 'push' chỉ khi đợt đủ đáng để rung điện thoại
  kenh text[] NOT NULL DEFAULT '{bell}',
  so_nguoi_nhan int NOT NULL DEFAULT 0,
  cong_bo_luc timestamptz NOT NULL DEFAULT now(),
  cong_bo_boi uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.phien_ban_cong_bo ENABLE ROW LEVEL SECURITY;

-- Cán bộ đọc được (để giao diện biết mục nào đã báo, mục nào chưa); chỉ quản
-- trị mới ghi, và cũng chỉ ghi qua RPC bên dưới.
DROP POLICY IF EXISTS "Can bo doc so cong bo" ON public.phien_ban_cong_bo;
CREATE POLICY "Can bo doc so cong bo"
  ON public.phien_ban_cong_bo FOR SELECT TO authenticated USING (public.is_staff());

REVOKE ALL ON public.phien_ban_cong_bo FROM anon, authenticated;
GRANT SELECT ON public.phien_ban_cong_bo TO authenticated;

-- 3) Đánh dấu đã xem ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.phien_ban_danh_dau_da_xem(_ma text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toi uuid := public.get_my_profile_id();
BEGIN
  IF toi IS NULL OR _ma IS NULL OR btrim(_ma) = '' THEN RETURN; END IF;
  INSERT INTO public.phien_ban_da_xem (profile_id, ma_moi_nhat, xem_luc)
  VALUES (toi, _ma, now())
  ON CONFLICT (profile_id) DO UPDATE
    SET ma_moi_nhat = EXCLUDED.ma_moi_nhat, xem_luc = now();
END $$;

REVOKE ALL ON FUNCTION public.phien_ban_danh_dau_da_xem(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.phien_ban_danh_dau_da_xem(text) TO authenticated;

-- 4) Công bố một ĐỢT cập nhật tới cán bộ -------------------------------------
--
-- Vì sao là "đợt" chứ không phải từng mục: cán bộ đã nhận push nhắc nhịp sáng,
-- push giao việc, push trao đổi, push hồ sơ. Bắn thêm một push mỗi lần lập
-- trình viên merge xong một việc thì thứ bị bỏ qua đầu tiên chính là các tin
-- CẦN HÀNH ĐỘNG. Một đợt cập nhật = một tin, gộp mọi mục chưa công bố.
--
-- _cac_muc: mảng JSON [{ma, phien_ban, ngay, loai, tieu_de}, ...] lấy thẳng từ
--           lịch sử trong mã nguồn — database không cần biết nội dung chi tiết.
-- _vai_tro: rỗng = gửi mọi cán bộ; có giá trị = chỉ gửi người mang một trong
--           các vai trò đó (mục chỉ dành cho quản trị thì đừng làm phiền cả
--           Chi nhánh).
-- _co_push: false = chỉ hiện ở chuông trong ứng dụng, điện thoại không rung.
-- _gui_tin: false = CHỈ ghi vào sổ, không sinh tin nào. Dùng để dọn tồn đọng —
--           ví dụ 17 mục từ 30/07–19/08 vốn đã lên hệ thống từ lâu, cán bộ đã
--           dùng rồi, báo lại lúc này chỉ là nhiễu; nhưng vẫn phải đóng sổ để
--           lần cập nhật sau không bị lẫn vào.
CREATE OR REPLACE FUNCTION public.phien_ban_cong_bo_dot(
  _cac_muc jsonb,
  _tieu_de text,
  _noi_dung text,
  _co_push boolean DEFAULT true,
  _vai_tro text[] DEFAULT '{}',
  _gui_tin boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toi uuid := public.get_my_profile_id();
  moc timestamptz;
  cac_kenh text[];
  so_nhan int := 0;
  moi jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role)
       OR public.has_role(auth.uid(), 'tcth_admin'::app_role)
       OR public.has_role(auth.uid(), 'bgd'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ Ban Giám đốc / Phòng Tổ chức Tổng hợp mới công bố được phiên bản';
  END IF;

  IF _cac_muc IS NULL OR jsonb_array_length(_cac_muc) = 0 THEN
    RETURN jsonb_build_object('so_muc', 0, 'so_nguoi_nhan', 0);
  END IF;

  -- Mục nào đã công bố rồi thì loại ra — bấm nút lần hai không sinh tin thứ hai
  SELECT COALESCE(jsonb_agg(m), '[]'::jsonb) INTO moi
    FROM jsonb_array_elements(_cac_muc) m
   WHERE NOT EXISTS (
     SELECT 1 FROM public.phien_ban_cong_bo c WHERE c.ma = m->>'ma'
   );

  IF jsonb_array_length(moi) = 0 THEN
    RETURN jsonb_build_object('so_muc', 0, 'so_nguoi_nhan', 0, 'ghi_chu', 'Các mục này đã công bố trước đó');
  END IF;

  cac_kenh := CASE
    WHEN NOT _gui_tin THEN ARRAY[]::text[]
    WHEN _co_push THEN ARRAY['push','bell']
    ELSE ARRAY['bell']
  END;
  -- Ngoài giờ làm việc / ngày nghỉ thì tin nằm chờ tới 7h00 buổi làm việc kế
  -- tiếp — dùng đúng luật im lặng ngoài giờ của mọi tin khác, không mở ngoại lệ.
  moc := public.ct2_moc_phat_gan_nhat();

  IF _gui_tin THEN
    WITH nguoi_nhan AS (
      SELECT p.id
        FROM public.profiles p
       WHERE p.status = 'active'
         AND p.user_id IS NOT NULL
         -- Khách đối tác không nhận tin nội bộ
         AND NOT EXISTS (
           SELECT 1 FROM public.user_roles r
            WHERE r.user_id = p.user_id AND r.role = 'guest'::app_role
         )
         AND (
           cardinality(_vai_tro) = 0
           OR EXISTS (
             SELECT 1 FROM public.user_roles r
              WHERE r.user_id = p.user_id AND r.role::text = ANY(_vai_tro)
           )
         )
    ), da_chen AS (
      INSERT INTO public.ct2_thong_bao
        (ma_su_kien, nguoi_nhan, tieu_de, noi_dung, muc, kenh, phat_luc)
      SELECT 'PHIEN_BAN', n.id, _tieu_de, _noi_dung, 'NHE', cac_kenh, moc
        FROM nguoi_nhan n
      RETURNING 1
    )
    SELECT count(*) INTO so_nhan FROM da_chen;
  END IF;

  INSERT INTO public.phien_ban_cong_bo
    (ma, phien_ban, ngay, loai, tieu_de, kenh, so_nguoi_nhan, cong_bo_boi)
  SELECT m->>'ma', m->>'phien_ban', (m->>'ngay')::date, m->>'loai', m->>'tieu_de',
         cac_kenh, so_nhan, toi
    FROM jsonb_array_elements(moi) m
  ON CONFLICT (ma) DO NOTHING;

  IF _gui_tin AND _co_push THEN
    PERFORM public.ct2_kich_hoat_phat_push();
  END IF;

  RETURN jsonb_build_object(
    'so_muc', jsonb_array_length(moi),
    'so_nguoi_nhan', so_nhan,
    'phat_luc', moc
  );
END $$;

REVOKE ALL ON FUNCTION public.phien_ban_cong_bo_dot(jsonb, text, text, boolean, text[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.phien_ban_cong_bo_dot(jsonb, text, text, boolean, text[], boolean) TO authenticated;
