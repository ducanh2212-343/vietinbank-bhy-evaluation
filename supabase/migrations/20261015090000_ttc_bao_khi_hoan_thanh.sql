-- ---------------------------------------------------------------------------
-- TRAINING CENTER — BỎ NHẮC THEO GIỜ, CHỈ BÁO KHI HỌC VIÊN TÍCH HOÀN THÀNH
-- Giám đốc 06/09/2026: «lịch chi tiết thì đây là gợi ý, bây giờ push chỉ khi
-- nào học viên ấn nút hoàn thành thì sẽ push cho toàn bộ người có liên quan
-- trong khóa học».
--
-- Vì sao bỏ hết nhắc theo giờ: bốn loại tin cũ (sắp bắt đầu ngày · sắp hết
-- phần · sắp trình bày · 17h còn việc) đều tính mốc từ cột gio_bat_dau /
-- gio_ket_thuc của lộ trình. Từ khi lịch chuyển sang tư duy buổi sáng – buổi
-- chiều, giờ trong lộ trình chỉ còn là GỢI Ý sắp xếp, không phải cam kết. Nhắc
-- theo một con số không ai cam kết thì tin luôn sai lúc: học viên đang làm việc
-- khác thì bị giục, làm xong sớm rồi vẫn bị nhắc. Bỏ hẳn chứ không tắt bằng
-- công tắc — để lại bốn loại tin chết mà vẫn còn cron chạy là cái bẫy cho người
-- đến sau.
--
-- Còn lại đúng hai nguồn tin của Training Center:
--   TTC_HOAN_THANH — học viên tích một đầu việc → toàn bộ thành viên khóa học
--   TTC_CUNG_CO    — chấm Bloom có thang dưới 60% → Ban Giám đốc (giữ nguyên)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1) Gỡ lịch chạy của các tin theo giờ
-- ---------------------------------------------------------------------------
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('ttc-nhac-theo-lich')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ttc-nhac-theo-lich');
    PERFORM cron.unschedule('ttc-nhac-sap-trinh-bay')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ttc-nhac-sap-trinh-bay');
    PERFORM cron.unschedule('ttc-nhac-con-viec')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ttc-nhac-con-viec');
  END IF;
END $cron$;

DROP FUNCTION IF EXISTS public.ttc_nhac_theo_lich(timestamptz);
DROP FUNCTION IF EXISTS public.ttc_nhac_sap_trinh_bay();
DROP FUNCTION IF EXISTS public.ttc_nhac_con_viec();
DROP FUNCTION IF EXISTS public.ttc_ten_phan(text);

-- ---------------------------------------------------------------------------
-- 2) Cấu hình mới của từng lần đào tạo
--    {"khi_hoan_thanh": {"bat": true, "nguoi": [profile_id, ...]}}
--    nguoi rỗng = TOÀN BỘ thành viên khóa học (mặc định, đúng lời Giám đốc);
--    có chọn tên thì chỉ những người đó nhận.
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.ttc_chuong_trinh.nhac IS
  'Báo khi học viên tích hoàn thành: {"khi_hoan_thanh": {"bat": bool, "nguoi": [profile_id]}} — nguoi rỗng nghĩa là toàn bộ thành viên khóa học. Hai khoá cũ truoc_ngay/truoc_het_phan đã ngừng dùng 06/09/2026 cùng lúc bỏ nhắc theo giờ.';

-- Chuyển cấu hình đang có: bật sẵn cho mọi lần đào tạo, gửi toàn bộ thành viên.
-- KHÔNG mang danh sách người của hai mốc cũ sang — người được chọn để nhận nhắc
-- «sắp hết phần» không phải là người muốn nhận tin «đã xong một đầu việc».
UPDATE public.ttc_chuong_trinh
   SET nhac = jsonb_build_object('khi_hoan_thanh', jsonb_build_object('bat', true, 'nguoi', '[]'::jsonb));

-- Nhân bản chương trình: giữ công tắc, không mang người nhận sang đợt mới
CREATE OR REPLACE FUNCTION public.ttc_nhan_ban_chuong_trinh(_nguon uuid, _ten text, _ngay_bd date)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  goc public.ttc_chuong_trinh;
  moi uuid;
  lech int;
  r record;
  ngay_moi uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'system_admin'::app_role)
          OR public.has_role(auth.uid(), 'tcth_admin'::app_role)) THEN
    RAISE EXCEPTION 'Chỉ Phòng Tổng hợp mới nhân bản được chương trình';
  END IF;
  SELECT * INTO goc FROM public.ttc_chuong_trinh WHERE id = _nguon;
  IF goc.id IS NULL THEN RAISE EXCEPTION 'Không thấy chương trình nguồn'; END IF;
  lech := _ngay_bd - goc.ngay_bd;

  INSERT INTO public.ttc_chuong_trinh
    (ten, mo_ta, ngay_bd, ngay_kt, trang_thai, nhom_doi_tuong, loai, khoi_nang_luc, la_mau,
     vi_do, kinh_do, ban_kinh_m, nguoi_tao, nhac)
  VALUES (_ten, goc.mo_ta, _ngay_bd, goc.ngay_kt + lech, 'CHUAN_BI', goc.nhom_doi_tuong, goc.loai,
          goc.khoi_nang_luc, false, goc.vi_do, goc.kinh_do, goc.ban_kinh_m, public.get_my_profile_id(),
          jsonb_build_object('khi_hoan_thanh', jsonb_build_object(
            'bat',   COALESCE((goc.nhac -> 'khi_hoan_thanh' ->> 'bat')::boolean, true),
            'nguoi', '[]'::jsonb)))
  RETURNING id INTO moi;

  FOR r IN SELECT * FROM public.ttc_ngay WHERE chuong_trinh_id = _nguon ORDER BY so_thu_tu LOOP
    INSERT INTO public.ttc_ngay
      (chuong_trinh_id, so_thu_tu, ngay, tieu_de, khoi, van_ban, nhiem_vu_van_ban, chuan_bi, lat_cat, cau_hoi_tu_soi)
    VALUES (moi, r.so_thu_tu, r.ngay + lech, r.tieu_de, r.khoi, r.van_ban, r.nhiem_vu_van_ban, r.chuan_bi, r.lat_cat, r.cau_hoi_tu_soi)
    RETURNING id INTO ngay_moi;
    INSERT INTO public.ttc_dau_viec
      (ngay_id, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam, tinh_nang)
    SELECT ngay_moi, phan, thu_tu, gio_bat_dau, gio_ket_thuc, ten, dau_ra, nguoi_phu_trach, thiet_bi, noi_nop, trong_tam, tinh_nang
      FROM public.ttc_dau_viec WHERE ngay_id = r.id;
  END LOOP;
  RETURN moi;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Báo cho cả khóa học khi học viên tích hoàn thành một đầu việc
--
-- GỘP TIN CÒN ĐANG CHỜ PHÁT. Trần thông báo đã bị bỏ (20260914090000), nên
-- không còn gì chặn mười hai lần tích trong một ngày thành mười hai tin. Trong
-- giờ làm việc thì mỗi lần tích là một tin thật — đó chính là điều Giám đốc
-- muốn: thấy tiến độ ngay lúc nó xảy ra. Nhưng tin sinh ngoài giờ nằm chờ tới
-- 7h00 hôm sau; nếu không gộp, học viên làm bù buổi tối sẽ dội cả chục tin vào
-- lúc mọi người vừa mở máy. Nên: còn tin cùng ngày lộ trình chưa phát thì cập
-- nhật tin đó thay vì đặt tin mới.
--
-- Đây là chỗ DUY NHẤT được sửa thẳng ct2_thong_bao thay vì đi qua
-- ct2_dat_thong_bao. Lý do: gộp là sửa một tin đã đặt hợp lệ, không phải sinh
-- tin mới, nên các luật của cửa duy nhất (hoãn ngoài giờ, không tự nhắc mình)
-- đã được áp lúc tin đó ra đời và vẫn giữ nguyên hiệu lực.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ttc_bao_hoan_thanh(
  _ngay_id uuid, _dau_viec_id uuid, _nguoi_lam uuid)
RETURNS int
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ngay public.ttc_ngay;
  v_bat boolean;
  v_chon uuid[];
  v_ten_hv text;
  v_ten_viec text;
  v_tong int;
  v_xong int;
  v_tieu_de text;
  v_dong_viec text;
  v_noi_dung text;
  r record;
  cu uuid;
  so_dat int := 0;
  phat_ngay boolean := false;
BEGIN
  SELECT * INTO v_ngay FROM public.ttc_ngay WHERE id = _ngay_id;
  IF v_ngay.id IS NULL THEN RETURN 0; END IF;

  SELECT COALESCE((c.nhac -> 'khi_hoan_thanh' ->> 'bat')::boolean, true),
         COALESCE(ARRAY(SELECT jsonb_array_elements_text(c.nhac -> 'khi_hoan_thanh' -> 'nguoi')::uuid),
                  ARRAY[]::uuid[])
    INTO v_bat, v_chon
    FROM public.ttc_chuong_trinh c WHERE c.id = v_ngay.chuong_trinh_id;
  IF NOT v_bat THEN RETURN 0; END IF;

  SELECT full_name INTO v_ten_hv FROM public.profiles WHERE id = _nguoi_lam;
  SELECT ten INTO v_ten_viec FROM public.ttc_dau_viec WHERE id = _dau_viec_id;
  -- Tên đầu việc trong lộ trình có cái dài hơn 120 ký tự; push mà dòng «Việc:»
  -- tràn thì phần «Nội dung:» mang con số bị đẩy khuất khỏi màn hình khoá
  IF char_length(COALESCE(v_ten_viec, '')) > 70 THEN
    v_ten_viec := left(v_ten_viec, 69) || '…';
  END IF;
  SELECT count(*) INTO v_tong FROM public.ttc_dau_viec WHERE ngay_id = _ngay_id;
  SELECT count(*) INTO v_xong FROM public.ttc_tien_do t
    JOIN public.ttc_dau_viec d ON d.id = t.dau_viec_id
   WHERE d.ngay_id = _ngay_id AND t.nguoi = _nguoi_lam AND t.hoan_thanh;

  -- Chuẩn hình thức push 09/08/2026: tiêu đề ngắn mang con số, thân tin mỗi
  -- dòng một nhãn, không nối bằng «·»
  v_tieu_de := format('Ngày %s: đã xong %s/%s đầu việc', v_ngay.so_thu_tu, v_xong, v_tong);

  FOR r IN
    SELECT tv.nguoi FROM public.ttc_thanh_vien tv
     WHERE tv.chuong_trinh_id = v_ngay.chuong_trinh_id
       AND (cardinality(v_chon) = 0 OR tv.nguoi = ANY(v_chon))
  LOOP
    -- Tin cùng ngày lộ trình còn nằm chờ phát của đúng người này
    SELECT t.id INTO cu
      FROM public.ct2_thong_bao t
      JOIN public.ttc_dau_viec d ON d.id = t.dau_viec_id
     WHERE t.ma_su_kien = 'TTC_HOAN_THANH' AND t.nguoi_nhan = r.nguoi
       AND d.ngay_id = _ngay_id
       AND t.gui_luc IS NULL AND t.phat_luc > now()
     ORDER BY t.created_at DESC LIMIT 1;

    IF cu IS NOT NULL THEN
      v_dong_viec := format('Việc: %s và các đầu việc trước đó trong ngày',
                            COALESCE(v_ten_viec, 'một đầu việc'));
    ELSE
      v_dong_viec := format('Việc: %s', COALESCE(v_ten_viec, 'một đầu việc'));
    END IF;
    v_noi_dung := format(E'Học viên: %s\nNgày: %s · %s\n%s\nNội dung: Đã hoàn thành %s/%s đầu việc của ngày.',
                         COALESCE(v_ten_hv, 'Học viên'), v_ngay.so_thu_tu, v_ngay.tieu_de,
                         v_dong_viec, v_xong, v_tong);

    IF cu IS NOT NULL THEN
      UPDATE public.ct2_thong_bao
         SET tieu_de = v_tieu_de, noi_dung = v_noi_dung, dau_viec_id = _dau_viec_id
       WHERE id = cu;
      so_dat := so_dat + 1;
    ELSIF public.ct2_dat_thong_bao('TTC_HOAN_THANH', r.nguoi, v_tieu_de, v_noi_dung,
                                   'NHE', _dau_viec_id) THEN
      so_dat := so_dat + 1;
      phat_ngay := true;
    ELSE
      so_dat := so_dat + 1;
    END IF;
    cu := NULL;
  END LOOP;

  IF phat_ngay THEN PERFORM public.ct2_kich_hoat_phat_push(); END IF;
  RETURN so_dat;
END $$;
REVOKE ALL ON FUNCTION public.ttc_bao_hoan_thanh(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.ttc_bao_hoan_thanh(uuid, uuid, uuid) IS
  'Báo cho toàn bộ thành viên khóa học khi học viên tích hoàn thành một đầu việc. Gộp vào tin cùng ngày lộ trình còn đang chờ phát để tin làm bù buổi tối không dội cả chục cái vào 7h00 hôm sau.';

-- Thay mốc cũ «đủ cả ngày mới báo cho BGĐ» bằng «mỗi lần tích đều báo cả lớp».
-- Tin mới đã mang sẵn con số N/M nên khi N = M nó tự nói là đã xong đủ ngày —
-- giữ thêm TTC_DU_NGAY chỉ là gửi hai tin cho cùng một sự việc.
CREATE OR REPLACE FUNCTION public.f_ttc_sau_tich_tien_do()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ngay_id uuid;
BEGIN
  IF NOT NEW.hoan_thanh THEN RETURN NEW; END IF;
  -- Đổi từ chưa → đã tích mới báo; sửa ghi chú của ô đã tích thì không
  IF TG_OP = 'UPDATE' AND OLD.hoan_thanh THEN RETURN NEW; END IF;

  SELECT ngay_id INTO v_ngay_id FROM public.ttc_dau_viec WHERE id = NEW.dau_viec_id;
  IF v_ngay_id IS NULL THEN RETURN NEW; END IF;
  PERFORM public.ttc_bao_hoan_thanh(v_ngay_id, NEW.dau_viec_id, NEW.nguoi);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ttc_sau_tich_tien_do ON public.ttc_tien_do;
CREATE TRIGGER ttc_sau_tich_tien_do AFTER INSERT OR UPDATE OF hoan_thanh ON public.ttc_tien_do
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_sau_tich_tien_do();
