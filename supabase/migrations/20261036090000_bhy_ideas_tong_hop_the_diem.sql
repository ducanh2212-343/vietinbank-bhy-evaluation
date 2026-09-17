-- 20261036090000 — Tổng hợp Thẻ điểm Đổi mới sáng tạo theo PHÒNG và theo CÁN BỘ
--
-- Giám đốc chốt 17/09/2026: TCTH và Ban Giám đốc xem được báo cáo toàn chi
-- nhánh theo từng phòng, từng cán bộ với số ý tưởng từng cấp, số quy đổi và
-- tỷ lệ hoàn thành theo Thẻ điểm; đồng đề xuất tính trọn cho từng người; mẫu
-- số là danh bạ hiện tại trừ cán bộ khoán gọn; kỳ tính là mọi ý tưởng đã nhập.
--
-- Hàm này CHỈ đếm và trả nguyên liệu. Luật Thẻ điểm (nhóm vị trí, chỉ tiêu,
-- hệ số quy đổi, ngưỡng 90%, trần 130%) nằm ở MỘT nơi duy nhất là
-- src/lib/ideaKpi.ts + src/lib/ideaTheDiem.ts — không chép luật vào SQL để
-- khỏi có hai bản lệch nhau.
--
-- Vì sao đếm theo CẤP CAO NHẤT của từng ý tưởng chứ không đếm lũy kế: lũy kế
-- (10 Ươm mầm · 2 Vươn cành · 1 Lan tỏa) suy ra được từ cấp cao nhất, còn
-- chiều ngược lại thì không; và điểm quy đổi Bén rễ (1/2/3) chỉ đúng khi mỗi
-- ý tưởng tính ở đúng một cấp. Client tự suy lũy kế để hiển thị.
--
-- Ý tưởng «của một người» = người đó tạo phiếu HOẶC tên nằm trong ô Người đề
-- xuất và khớp đúng một hồ sơ — cùng luật với bhy_ideas_y_tuong_cua_toi.
-- Ý tưởng «của một phòng» = phòng đề xuất trên phiếu (portal_ideas.phong_id).

CREATE OR REPLACE FUNCTION public.bhy_ideas_tong_hop_the_diem()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_phong jsonb;
  v_can_bo jsonb;
BEGIN
  IF v_uid IS NULL OR NOT (public.is_content_admin(v_uid) OR public.bhy_ideas_la_giam_doc()) THEN
    RAISE EXCEPTION 'Chỉ Phòng TCTH và Ban Giám đốc xem được Thẻ điểm Đổi mới sáng tạo'
      USING ERRCODE = '42501';
  END IF;

  -- Theo phòng: mẫu số + số ý tưởng theo cấp cao nhất
  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.ma), '[]'::jsonb) INTO v_phong
  FROM (
    SELECT d.id AS phong_id, d.code AS ma, d.name AS ten,
           (SELECT count(*) FROM public.profiles p
             WHERE p.department_id = d.id AND p.status = 'active' AND NOT p.khoan_gon)::int AS so_cb,
           count(i.id) FILTER (WHERE i.development_level = 'Ươm mầm')::int AS um,
           count(i.id) FILTER (WHERE i.development_level = 'Bén rễ')::int AS br,
           count(i.id) FILTER (WHERE i.development_level = 'Vươn cành')::int AS vc,
           count(i.id) FILTER (WHERE i.development_level = 'Lan tỏa')::int AS lt
    FROM public.departments d
    LEFT JOIN public.portal_ideas i ON i.phong_id = d.id
    WHERE d.is_active
    GROUP BY d.id, d.code, d.name
  ) t;

  -- Theo cán bộ đang làm việc: chức danh + số ý tưởng theo cấp cao nhất
  WITH nguoi AS (
    SELECT p.id, p.user_id, p.full_name, p.department_id, p.position_id, p.position, p.khoan_gon,
           lower(btrim(coalesce(p.full_name, ''))) AS ten
    FROM public.profiles p
    WHERE p.status = 'active'
  ),
  ten_duy_nhat AS (
    SELECT n.id, n.ten FROM nguoi n
    WHERE n.ten <> ''
      AND (SELECT count(*) FROM public.profiles p2 WHERE lower(btrim(p2.full_name)) = n.ten) = 1
  ),
  gan AS (
    SELECT i.id AS idea_id, n.id AS profile_id
    FROM public.portal_ideas i JOIN nguoi n ON n.user_id = i.created_by
    UNION
    SELECT i.id, t.id
    FROM public.portal_ideas i
    JOIN ten_duy_nhat t ON t.ten = ANY (public.bhy_ideas_tach_ten_de_xuat(i.proposer))
  )
  SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.ma_phong, t.ho_ten), '[]'::jsonb) INTO v_can_bo
  FROM (
    SELECT n.id AS profile_id, n.full_name AS ho_ten, n.department_id AS phong_id,
           d.code AS ma_phong, d.name AS ten_phong,
           coalesce(po.name, n.position, '') AS chuc_danh,
           n.khoan_gon,
           count(i.id) FILTER (WHERE i.development_level = 'Ươm mầm')::int AS um,
           count(i.id) FILTER (WHERE i.development_level = 'Bén rễ')::int AS br,
           count(i.id) FILTER (WHERE i.development_level = 'Vươn cành')::int AS vc,
           count(i.id) FILTER (WHERE i.development_level = 'Lan tỏa')::int AS lt
    FROM nguoi n
    LEFT JOIN public.departments d ON d.id = n.department_id
    LEFT JOIN public.positions po ON po.id = n.position_id
    LEFT JOIN gan g ON g.profile_id = n.id
    LEFT JOIN public.portal_ideas i ON i.id = g.idea_id
    GROUP BY n.id, n.full_name, n.department_id, d.code, d.name, po.name, n.position, n.khoan_gon
  ) t;

  RETURN jsonb_build_object(
    'tinh_luc', now(),
    'dang_ap_kpi', coalesce((SELECT c.dang_ap_kpi FROM public.bhy_ideas_cau_hinh c LIMIT 1), false),
    'phong', v_phong,
    'can_bo', v_can_bo
  );
END $$;
REVOKE ALL ON FUNCTION public.bhy_ideas_tong_hop_the_diem() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bhy_ideas_tong_hop_the_diem() TO authenticated, service_role;
