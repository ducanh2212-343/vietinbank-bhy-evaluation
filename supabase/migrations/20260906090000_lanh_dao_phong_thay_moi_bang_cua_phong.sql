-- ─────────────────────────────────────────────────────────────────────────────
-- LÃNH ĐẠO PHÒNG THẤY MỌI BẢNG CỦA PHÒNG MÌNH — kể cả bảng HẠN CHẾ
--
-- Giám đốc chốt (06/08/2026, tiếp mạch vá quyền Phó phòng): «Tôi muốn Phó
-- Phòng thấy toàn bộ task kanban của Phòng mình.»
--
-- Hiện trạng đo trên production:
--   · Thẻ ở Kanban chung (bang_id NULL) và bảng chế độ PHONG: cả phòng thấy
--     sẵn — Phó phòng KHDN thấy đủ 34/34 thẻ, không phải vá.
--   · Bảng chế độ HAN_CHE: `ct2_xem_duoc_bang()` chỉ mở cho bgd, system_admin
--     và THÀNH VIÊN bảng. Trưởng phòng hay Phó phòng của CHÍNH phòng đó mà
--     không được thêm làm thành viên thì mù cả bảng lẫn thẻ trong bảng
--     (TCTH «Mảng tổ chức» là ca có thật). Cán bộ lập bảng riêng là việc
--     trong phòng biến mất khỏi mắt lãnh đạo phòng — ngược nguyên tắc Kanban
--     «việc của phòng phải nhìn thấy được».
--
-- Cách chữa: thêm một nhánh `ct2_la_lanh_dao_phong(b.phong)` — lãnh đạo phòng
-- (Trưởng + Phó, theo vai manager gắn đúng phòng, hoặc theo danh mục
-- departments.manager_id) thấy mọi bảng của phòng mình bất kể chế độ xem.
--
-- Cố ý KHÔNG dùng ct2_sua_duoc_phong ở đây dù nó bao trùm hơn: nhánh
-- can_view_all trong đó sẽ mở luôn các bảng «Việc của …» thuộc phòng BGD
-- (bảng riêng của Giám đốc/PGĐ) cho tcth_admin — rộng hơn điều Giám đốc yêu
-- cầu. Bảng của BGD giữ nguyên: ct2_la_lanh_dao_phong(BGD) không đúng với ai
-- (BGD không có manager_id, không ai mang vai manager thuộc BGD).
--
-- Một cửa sửa, hai bảng hưởng: policy SELECT của ct2_bang lẫn ct2_dau_viec
-- đều đi qua đúng hàm này.
--
-- CREATE OR REPLACE (không DROP) — giữ nguyên ACL đã REVOKE trước đây.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.ct2_xem_duoc_bang(_bang uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _bang IS NULL THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.ct2_bang b
      WHERE b.id = _bang
        AND (
          public.has_role(auth.uid(), 'bgd'::app_role)
          OR public.has_role(auth.uid(), 'system_admin'::app_role)
          -- Lãnh đạo phòng thấy mọi bảng của phòng mình — kể cả HAN_CHE
          OR public.ct2_la_lanh_dao_phong(b.phong)
          OR EXISTS (
            SELECT 1 FROM public.ct2_bang_thanh_vien tv
            WHERE tv.bang_id = b.id AND tv.profile_id = public.get_my_profile_id()
          )
          OR (b.che_do_xem = 'PHONG' AND public.ct2_xem_duoc_dau_viec(b.phong, '{}'::uuid[]))
        )
    )
  END
$function$;
