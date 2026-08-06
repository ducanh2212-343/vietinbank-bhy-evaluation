-- ─────────────────────────────────────────────────────────────────────────────
-- BẢNG HẠN CHẾ LÀ BẢO MẬT THEO THÀNH VIÊN — gỡ nhánh «lãnh đạo phòng thấy hết»
--
-- Giám đốc chỉnh lại ngay trong ngày (06/08/2026): bảng «Mảng tổ chức» của
-- TCTH là việc riêng giữa Trưởng phòng Vũ Thị Thu Hà và Giám đốc, cần bảo
-- mật — Phó phòng Vũ Thị Năm KHÔNG được thấy.
--
-- Migration liền trước (20260906090000) thêm nhánh ct2_la_lanh_dao_phong vào
-- ct2_xem_duoc_bang để «Phó phòng thấy toàn bộ task của phòng». Nhánh đó
-- đúng cho bảng chế độ PHONG (vốn cả phòng thấy sẵn) nhưng thừa, và làm hở
-- chính ca bảo mật đầu tiên gặp ngoài đời. Hai yêu cầu dung hòa như sau:
--
--   · Việc CHUNG của phòng nằm ở Kanban chung + bảng chế độ PHONG — lãnh đạo
--     phòng (và cả phòng) thấy đủ, không cần nhánh riêng nào.
--   · Bảng HAN_CHE nghĩa là BẢO MẬT: chỉ thành viên được thêm đích danh,
--     Ban Giám đốc và system_admin. Muốn Phó phòng nào thấy một bảng hạn chế
--     cụ thể thì THÊM họ làm thành viên bảng đó — cái van sẵn có, chỉnh được
--     từng bảng một, không phải luật chung toàn hệ thống.
--
-- Vậy hàm quay về đúng định nghĩa trước 20260906090000. Ai thấy «Mảng tổ
-- chức» sau migration này: Vũ Thị Thu Hà (thành viên duy nhất), Giám đốc
-- (vai bgd), system_admin — khớp từng người với yêu cầu bảo mật.
--
-- CREATE OR REPLACE (không DROP) — giữ nguyên ACL.
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
          OR EXISTS (
            SELECT 1 FROM public.ct2_bang_thanh_vien tv
            WHERE tv.bang_id = b.id AND tv.profile_id = public.get_my_profile_id()
          )
          OR (b.che_do_xem = 'PHONG' AND public.ct2_xem_duoc_dau_viec(b.phong, '{}'::uuid[]))
        )
    )
  END
$function$;
