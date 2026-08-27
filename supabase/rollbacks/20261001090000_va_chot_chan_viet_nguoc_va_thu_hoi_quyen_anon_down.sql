-- GỠ bản vá chốt chặn viết ngược.
--
-- CẢNH BÁO: chạy tệp này là MỞ LẠI lỗ hổng cho người lạ chưa đăng nhập lấy họ tên
-- cán bộ và bắn thông báo giả. Chỉ dùng khi buộc phải khôi phục nguyên trạng cũ.
DO $$
DECLARE
  v_ham text;
  v_def text;
  v_cu   CONSTANT text := 'public.ct2_can_kiem_quyen() AND NOT (';
  v_thay CONSTANT text := 'auth.uid() IS NOT NULL AND NOT (';
BEGIN
  FOREACH v_ham IN ARRAY ARRAY[
    'public.ct2_khen_chuoi_moc(boolean, timestamptz)',
    'public.ct2_nhac_nhip_sang(boolean, timestamptz)',
    'public.ct2_chon_cau_mo_ngay(date, boolean)',
    'public.ct2_chot_so_nhip(date)'
  ] LOOP
    v_def := pg_get_functiondef(v_ham::regprocedure);
    IF position(v_cu IN v_def) > 0 THEN
      EXECUTE replace(v_def, v_cu, v_thay);
    END IF;
  END LOOP;
END
$$;

GRANT EXECUTE ON FUNCTION public.ct2_khen_chuoi_moc(boolean, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_nhac_nhip_sang(boolean, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ct2_chon_cau_mo_ngay(date, boolean) TO anon;
GRANT EXECUTE ON FUNCTION public.ct2_chot_so_nhip(date) TO anon;
GRANT EXECUTE ON FUNCTION public.ct2_chuoi_dung_gio(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.ct2_chuoi_dung_gio_cua_toi() TO anon;
DROP FUNCTION IF EXISTS public.ct2_can_kiem_quyen();
