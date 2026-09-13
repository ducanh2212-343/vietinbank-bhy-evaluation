-- Training Center: THẨM ĐỊNH ĐỊNH VỊ trước khi mở luồng điểm danh bằng định vị
--
-- Yêu cầu của Giám đốc 06/09/2026: «một số lớp sẽ chỉ mở QR; sau khi test định
-- vị chính xác mới mở phần định vị diện rộng».
--
-- Cách làm: mở luồng định vị KHÔNG còn là một công tắc bấm là xong. Phải đứng
-- tại phòng học bấm «Thử định vị» ít nhất ba lần ở các chỗ ngồi khác nhau, và
-- ba lần gần nhất đều phải nằm trong bán kính đang đặt. Chưa đủ thì máy chủ từ
-- chối bật — không phải giao diện làm mờ nút, mà là trigger chặn.
--
-- Vì sao chặn ở tầng dữ liệu chứ không chỉ làm mờ nút: mở nhầm luồng định vị
-- cho một lớp mà toạ độ chưa đúng thì cả lớp không điểm danh được, và người
-- phát hiện ra là học viên đang đứng ở cửa phòng lúc 7h30 — quá muộn để sửa.
--
-- Vì sao lưu KHOẢNG CÁCH chứ không lưu kết luận đạt/không đạt: bán kính còn
-- được chỉnh. Lưu con số thô thì đổi bán kính là các lần thử cũ tự được xét
-- lại theo bán kính mới; lưu kết luận thì phải đi sửa lại cả lịch sử.

-- ---------------------------------------------------------------------------
-- 1) Nhật ký các lần thử định vị
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ttc_thu_dinh_vi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chuong_trinh_id uuid NOT NULL REFERENCES public.ttc_chuong_trinh(id) ON DELETE CASCADE,
  nguoi uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  luc timestamptz NOT NULL DEFAULT now(),
  vi_do double precision NOT NULL,
  kinh_do double precision NOT NULL,
  do_chinh_xac_m int,
  khoang_cach_m int NOT NULL,
  /* Chỗ đứng khi thử: «giữa phòng», «cuối phòng», «cửa ra vào»… */
  vi_tri text
);
CREATE INDEX IF NOT EXISTS ttc_thu_dinh_vi_ct_idx ON public.ttc_thu_dinh_vi(chuong_trinh_id, luc DESC);

COMMENT ON TABLE public.ttc_thu_dinh_vi IS
  'Các lần thử định vị tại phòng học. Ba lần gần nhất đều trong bán kính thì mới bật được luồng điểm danh bằng định vị.';

-- ---------------------------------------------------------------------------
-- 2) Số lần thử tối thiểu — một chỗ ngồi không nói lên điều gì về cả phòng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_so_lan_thu_toi_thieu()
RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT 3 $$;

/* Luồng định vị của một chương trình đã thẩm định xong chưa (theo bán kính đang xét) */
CREATE OR REPLACE FUNCTION public.ttc_dinh_vi_da_tham_dinh(_ct uuid, _ban_kinh int)
RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    (SELECT count(*) = public.ttc_so_lan_thu_toi_thieu()
        AND bool_and(t.khoang_cach_m <= COALESCE(_ban_kinh, 150))
       FROM (SELECT khoang_cach_m FROM public.ttc_thu_dinh_vi
              WHERE chuong_trinh_id = _ct
              ORDER BY luc DESC
              LIMIT public.ttc_so_lan_thu_toi_thieu()) t),
    false)
$$;

-- ---------------------------------------------------------------------------
-- 3) Ghi một lần thử — KHÔNG ghi điểm danh, chỉ đo và lưu lại con số
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_thu_dinh_vi(
  _ct uuid, _vi_do double precision, _kinh_do double precision,
  _do_chinh_xac int DEFAULT NULL, _vi_tri text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  toi uuid := public.get_my_profile_id();
  c public.ttc_chuong_trinh;
  cach int;
  ban_kinh int;
BEGIN
  IF toi IS NULL THEN RETURN jsonb_build_object('ok', false, 'thong_bao', 'Chưa đăng nhập.'); END IF;
  IF NOT public.ttc_la_thanh_vien(_ct) THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Chỉ thành viên chương trình mới thử định vị được.');
  END IF;
  SELECT * INTO c FROM public.ttc_chuong_trinh WHERE id = _ct;
  IF c.vi_do IS NULL OR c.kinh_do IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao',
      'Chưa có toạ độ phòng học. Bấm «Lấy toạ độ tại đây» khi đang đứng giữa phòng, lưu lại rồi mới thử.');
  END IF;
  IF _vi_do IS NULL OR _kinh_do IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'thong_bao', 'Chưa lấy được vị trí của máy.');
  END IF;

  ban_kinh := COALESCE(c.ban_kinh_m, 150);
  cach := round(public.ttc_khoang_cach_m(c.vi_do, c.kinh_do, _vi_do, _kinh_do));

  INSERT INTO public.ttc_thu_dinh_vi (chuong_trinh_id, nguoi, vi_do, kinh_do, do_chinh_xac_m, khoang_cach_m, vi_tri)
  VALUES (_ct, toi, _vi_do, _kinh_do, _do_chinh_xac, cach, NULLIF(btrim(COALESCE(_vi_tri, '')), ''));

  RETURN jsonb_build_object(
    'ok', true, 'khoang_cach_m', cach, 'do_chinh_xac_m', _do_chinh_xac,
    'ban_kinh_m', ban_kinh, 'trong_vung', cach <= ban_kinh,
    'da_tham_dinh', public.ttc_dinh_vi_da_tham_dinh(_ct, ban_kinh),
    'thong_bao', CASE WHEN cach <= ban_kinh
                      THEN format('Đo được %s m, nằm trong bán kính %s m.', cach, ban_kinh)
                      ELSE format('Đo được %s m, VƯỢT bán kính %s m. Kiểm tra lại toạ độ phòng học hoặc nới bán kính.', cach, ban_kinh)
                 END);
END $$;
REVOKE ALL ON FUNCTION public.ttc_thu_dinh_vi(uuid, double precision, double precision, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ttc_thu_dinh_vi(uuid, double precision, double precision, int, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Cổng chặn: chỉ bật được luồng định vị sau khi đã thẩm định
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_bat_dinh_vi(_cfg jsonb)
RETURNS boolean
LANGUAGE sql IMMUTABLE
AS $$
  SELECT COALESCE((_cfg ->> 'bat')::boolean, false)
     AND COALESCE(_cfg -> 'luong' @> '"DINH_VI"'::jsonb, false)
$$;

CREATE OR REPLACE FUNCTION public.f_ttc_chuong_trinh_truoc_sua()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.diem_danh IS DISTINCT FROM OLD.diem_danh OR NEW.ban_kinh_m IS DISTINCT FROM OLD.ban_kinh_m THEN
    IF public.ttc_bat_dinh_vi(NEW.diem_danh) AND NOT public.ttc_bat_dinh_vi(OLD.diem_danh) THEN
      IF NEW.vi_do IS NULL OR NEW.kinh_do IS NULL THEN
        RAISE EXCEPTION 'Chưa có toạ độ phòng học thì chưa bật được điểm danh bằng định vị';
      END IF;
      IF NOT public.ttc_dinh_vi_da_tham_dinh(NEW.id, NEW.ban_kinh_m) THEN
        RAISE EXCEPTION 'Chưa thẩm định xong định vị. Cần % lần thử tại phòng học và cả % lần gần nhất đều nằm trong bán kính % m.',
          public.ttc_so_lan_thu_toi_thieu(), public.ttc_so_lan_thu_toi_thieu(), COALESCE(NEW.ban_kinh_m, 150);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ttc_chuong_trinh_truoc_sua ON public.ttc_chuong_trinh;
CREATE TRIGGER ttc_chuong_trinh_truoc_sua BEFORE UPDATE ON public.ttc_chuong_trinh
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_chuong_trinh_truoc_sua();

-- ---------------------------------------------------------------------------
-- 5) RLS — thành viên chương trình đọc và thử; ghi chỉ qua RPC
-- ---------------------------------------------------------------------------
ALTER TABLE public.ttc_thu_dinh_vi ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ttc_thu_dinh_vi FROM anon;
GRANT SELECT ON public.ttc_thu_dinh_vi TO authenticated;
GRANT DELETE ON public.ttc_thu_dinh_vi TO authenticated;

DROP POLICY IF EXISTS "ttc xem thu dinh vi" ON public.ttc_thu_dinh_vi;
CREATE POLICY "ttc xem thu dinh vi" ON public.ttc_thu_dinh_vi FOR SELECT TO authenticated
  USING (public.ttc_la_thanh_vien(chuong_trinh_id));
-- Xoá để làm lại đợt thử khi đổi phòng học — chỉ quản trị / BGĐ
DROP POLICY IF EXISTS "ttc xoa thu dinh vi" ON public.ttc_thu_dinh_vi;
CREATE POLICY "ttc xoa thu dinh vi" ON public.ttc_thu_dinh_vi FOR DELETE TO authenticated
  USING (public.ttc_sua_duoc_noi_dung(chuong_trinh_id));

-- ---------------------------------------------------------------------------
-- 6) Lớp đang chạy về CHỈ QR cho tới khi thẩm định xong
--
-- Toạ độ đang dùng là toạ độ TẠM TÍNH khu vực Phường Mỹ Hào (nạp từ migration
-- 20261008), chưa ai đứng tại phòng học đo lại. Để nguyên luồng định vị đang
-- bật là để một luồng chưa được kiểm chứng chạy thật vào sáng ngày học.
-- ---------------------------------------------------------------------------
UPDATE public.ttc_chuong_trinh
   SET diem_danh = jsonb_set(diem_danh, '{luong}', '["QR"]'::jsonb)
 WHERE public.ttc_bat_dinh_vi(diem_danh)
   AND NOT public.ttc_dinh_vi_da_tham_dinh(id, ban_kinh_m);
