-- ============================================================================
-- VÁ LỖ HỔNG: người lạ CHƯA ĐĂNG NHẬP chạy được hàm quản trị
--
-- Phát hiện khi rà soát bảo mật 24/08/2026. Bốn hàm SECURITY DEFINER dùng chung
-- một chốt chặn VIẾT NGƯỢC:
--
--     IF auth.uid() IS NOT NULL AND NOT (là_quản_trị) THEN RAISE EXCEPTION
--
-- Với khách vãng lai thì auth.uid() = NULL, nên vế đầu SAI, cả điều kiện SAI và
-- KHÔNG ai bị chặn. Ba trong bốn hàm còn giữ quyền EXECUTE cho `anon`
-- (ct2_khen_chuoi_moc mở tới tận PUBLIC), nghĩa là chỉ cần anon key vốn nằm sẵn
-- trong mã trang là gọi được:
--   · ct2_khen_chuoi_moc  → trả HỌ TÊN + mã của cán bộ, ghi ct2_thong_bao và bắn push
--   · ct2_nhac_nhip_sang  → trả tên cán bộ + tiêu đề đầu việc đang nợ, ghi + bắn push
--   · ct2_chon_cau_mo_ngay→ ghi đè lịch sử câu mở ngày (_ghi = true)
--
-- HAI LỚP VÁ (cố ý không chỉ một):
--   1) THU HỒI QUYỀN — hàng rào cứng của Postgres, PostgREST chặn từ cửa, không
--      phụ thuộc dòng mã nào bên trong hàm.
--   2) SỬA CHỐT CHẶN — để nếu mai này ai lỡ cấp lại quyền thì lỗ hổng không mở lại.
--
-- Vì sao KHÔNG chép tay thân hàm: hai hàm dài 3.000–4.600 ký tự, chép tay là mời
-- lỗi chính tả vào đúng chỗ phát tin cho 150 cán bộ. Ở đây đọc định nghĩa đang
-- chạy rồi thay đúng một mệnh đề, và BÁO LỖI DỪNG LẠI nếu không tìm thấy mệnh đề
-- đó — thà migration đỏ còn hơn vá hụt mà tưởng đã xong.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Hàm phụ: lời gọi này có phải từ bên ngoài và cần soi quyền không?
-- ---------------------------------------------------------------------------
-- Không thể dùng current_user để phân biệt: bên trong hàm SECURITY DEFINER thì
-- current_user LUÔN là chủ hàm (postgres), bất kể ai gọi. Dấu hiệu tin cậy là
-- JWT do PostgREST đặt vào GUC request.jwt.claims:
--   · rỗng/không có  → gọi thẳng trong CSDL, tức pg_cron ban đêm → tin cậy
--   · role=service_role → edge function / cron gọi qua REST      → tin cậy
--   · còn lại (anon, authenticated) → bên ngoài, phải soi quyền quản trị
CREATE OR REPLACE FUNCTION public.ct2_can_kiem_quyen()
RETURNS boolean
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  v_claims text := current_setting('request.jwt.claims', true);
  v_vai text;
BEGIN
  IF coalesce(v_claims, '') = '' THEN
    RETURN false;  -- pg_cron gọi trực tiếp: giữ cho nhịp sáng chạy như cũ
  END IF;
  BEGIN
    v_vai := v_claims::jsonb ->> 'role';
  EXCEPTION WHEN others THEN
    RETURN true;   -- JWT lạ không đọc được → cứ soi quyền, nghiêng về phía an toàn
  END;
  RETURN coalesce(v_vai, '') <> 'service_role';
END
$$;

COMMENT ON FUNCTION public.ct2_can_kiem_quyen() IS
  'TRUE khi lời gọi đến từ bên ngoài qua PostgREST và không phải service_role — '
  'lúc đó hàm gọi nó phải tự soi quyền quản trị. FALSE cho pg_cron và service_role.';

REVOKE ALL ON FUNCTION public.ct2_can_kiem_quyen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_can_kiem_quyen() TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Sửa chốt chặn viết ngược trong đúng bốn hàm mắc lỗi
-- ---------------------------------------------------------------------------
-- Phép thay thế giữ nguyên phần "NOT (là_quản_trị)" đang đúng, chỉ đổi vế đầu:
--   TRƯỚC: IF auth.uid() IS NOT NULL      AND NOT (quản trị)  -- khách lọt qua
--   SAU  : IF public.ct2_can_kiem_quyen() AND NOT (quản trị)  -- khách bị chặn
-- ct2_chon_cau_mo_ngay có dạng "IF _ghi AND auth.uid() IS NOT NULL AND NOT ("
-- nên cùng một phép thay vẫn ra đúng nghĩa.
DO $$
DECLARE
  v_ham text;
  v_def text;
  v_cu   CONSTANT text := 'auth.uid() IS NOT NULL AND NOT (';
  v_thay CONSTANT text := 'public.ct2_can_kiem_quyen() AND NOT (';
BEGIN
  FOREACH v_ham IN ARRAY ARRAY[
    'public.ct2_khen_chuoi_moc(boolean, timestamptz)',
    'public.ct2_nhac_nhip_sang(boolean, timestamptz)',
    'public.ct2_chon_cau_mo_ngay(date, boolean)',
    'public.ct2_chot_so_nhip(date)'
  ] LOOP
    v_def := pg_get_functiondef(v_ham::regprocedure);
    IF position(v_cu IN v_def) = 0 THEN
      RAISE EXCEPTION 'Không thấy chốt chặn cũ trong % — dừng migration để người sửa xem lại', v_ham;
    END IF;
    EXECUTE replace(v_def, v_cu, v_thay);
    RAISE NOTICE 'Đã vá chốt chặn: %', v_ham;
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 3) Thu hồi quyền của người lạ (hàng rào cứng)
-- ---------------------------------------------------------------------------
-- Giữ nguyên quyền của `authenticated` ở ct2_chuoi_dung_gio* vì cổng Chiêu thức 2
-- đang gọi ct2_chuoi_dung_gio_cua_toi() để hiện chuỗi đúng giờ của chính cán bộ
-- (src/components/one/move2/useCt2Data.ts). Các hàm còn lại không nơi nào trong
-- client gọi — chỉ cron dùng — nên cắt hẳn tới service_role.
REVOKE ALL ON FUNCTION public.ct2_khen_chuoi_moc(boolean, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_khen_chuoi_moc(boolean, timestamptz) TO service_role;

REVOKE ALL ON FUNCTION public.ct2_nhac_nhip_sang(boolean, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_nhac_nhip_sang(boolean, timestamptz) TO service_role;

REVOKE ALL ON FUNCTION public.ct2_chon_cau_mo_ngay(date, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_chon_cau_mo_ngay(date, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ct2_chot_so_nhip(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_chot_so_nhip(date) TO authenticated, service_role;

-- Hai hàm đọc chuỗi đúng giờ: người lạ không có việc gì ở đây.
REVOKE ALL ON FUNCTION public.ct2_chuoi_dung_gio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_chuoi_dung_gio(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ct2_chuoi_dung_gio_cua_toi() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ct2_chuoi_dung_gio_cua_toi() TO authenticated, service_role;
