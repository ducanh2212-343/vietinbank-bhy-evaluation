-- ---------------------------------------------------------------------------
-- SỬA LỖI CHẶN HỌC VIÊN TÍCH HOÀN THÀNH (07/09/2026)
--
-- Triệu chứng: Trưởng phòng KHDN tích hoàn thành một đầu việc thì cổng báo
-- «insert or update on table "ct2_thong_bao" violates foreign key constraint
-- "ct2_thong_bao_dau_viec_id_fkey"» và ô tích không lưu được.
--
-- Nguyên nhân: ct2_thong_bao.dau_viec_id có khoá ngoại tới **ct2_dau_viec** —
-- thẻ việc của Chiêu thức 2 — chứ không phải ttc_dau_viec. Hàm
-- ttc_bao_hoan_thanh (20261015090000) truyền id của ttc_dau_viec vào tham số
-- _dau_viec_id của ct2_dat_thong_bao vì hai cột trùng tên. Trigger chạy AFTER
-- INSERT nên khoá ngoại nổ làm huỷ cả lệnh ghi tiến độ: học viên không tích
-- được ô nào.
--
-- Bài học ghi lại để không lặp: ct2_thong_bao là hàng đợi DÙNG CHUNG, hai cột
-- khoá ngoại của nó (dau_viec_id, ho_so_id) đều thuộc về Chiêu thức 2. Tin của
-- phân hệ khác chỉ được để NULL ở hai cột đó. Trùng tên cột giữa hai phân hệ
-- không có nghĩa là cùng một thứ.
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
  v_dau text;
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

  -- Nhận diện tin cùng (học viên, ngày lộ trình) để gộp: hai dòng đầu của thân
  -- tin là chữ ký đủ chắc. Trước đây việc này dựa vào dau_viec_id — chính chỗ
  -- gây ra lỗi khoá ngoại. So bằng left(...) chứ không LIKE để khỏi phải thoát
  -- dấu % và _ có thể nằm trong tên người hay tiêu đề ngày.
  v_dau := format(E'Học viên: %s\nNgày: %s · %s\n',
                  COALESCE(v_ten_hv, 'Học viên'), v_ngay.so_thu_tu, v_ngay.tieu_de);

  FOR r IN
    SELECT tv.nguoi FROM public.ttc_thanh_vien tv
     WHERE tv.chuong_trinh_id = v_ngay.chuong_trinh_id
       AND (cardinality(v_chon) = 0 OR tv.nguoi = ANY(v_chon))
  LOOP
    SELECT t.id INTO cu
      FROM public.ct2_thong_bao t
     WHERE t.ma_su_kien = 'TTC_HOAN_THANH' AND t.nguoi_nhan = r.nguoi
       AND left(t.noi_dung, length(v_dau)) = v_dau
       AND t.gui_luc IS NULL AND t.phat_luc > now()
     ORDER BY t.created_at DESC LIMIT 1;

    IF cu IS NOT NULL THEN
      v_dong_viec := format('Việc: %s và các đầu việc trước đó trong ngày',
                            COALESCE(v_ten_viec, 'một đầu việc'));
    ELSE
      v_dong_viec := format('Việc: %s', COALESCE(v_ten_viec, 'một đầu việc'));
    END IF;
    v_noi_dung := v_dau || format(E'%s\nNội dung: Đã hoàn thành %s/%s đầu việc của ngày.',
                                  v_dong_viec, v_xong, v_tong);

    IF cu IS NOT NULL THEN
      UPDATE public.ct2_thong_bao SET tieu_de = v_tieu_de, noi_dung = v_noi_dung WHERE id = cu;
      so_dat := so_dat + 1;
    -- dau_viec_id để NULL: cột đó thuộc về thẻ việc Chiêu thức 2, đầu việc lộ
    -- trình không có chỗ trong đó. Tin vẫn mở đúng màn Lộ trình vì notify-ct2
    -- định tuyến theo tiền tố TTC_ của mã sự kiện, không theo cột này.
    ELSIF public.ct2_dat_thong_bao('TTC_HOAN_THANH', r.nguoi, v_tieu_de, v_noi_dung, 'NHE') THEN
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

COMMENT ON FUNCTION public.ttc_bao_hoan_thanh(uuid, uuid, uuid) IS
  'Báo cho toàn bộ thành viên khóa học khi học viên tích hoàn thành một đầu việc. Gộp vào tin cùng (học viên, ngày lộ trình) còn đang chờ phát, nhận diện bằng hai dòng đầu thân tin. KHÔNG ghi dau_viec_id: cột đó có khoá ngoại tới ct2_dau_viec của Chiêu thức 2.';
