-- ---------------------------------------------------------------------------
-- TRẢ TIN «TÍCH HOÀN THÀNH» VỀ BẢN NGẮN GỌN
--
-- Giám đốc 07/09/2026: «phần push khi học viên ấn tích đã hoàn thành chuyển về
-- bản cũ cho nó ngắn gọn, dài quá không hiển thị được trên điện thoại».
--
-- Bản liệt kê từng đầu việc (20261018090000) đúng về nội dung nhưng sai về
-- phương tiện: màn hình khoá điện thoại chỉ hiện hai đến ba dòng đầu, nên phần
-- «Nội dung:» mang con số N/M — thứ đáng giá nhất của tin — bị đẩy khuất sau
-- danh sách. Người nhận phải mở ứng dụng mới đọc được điều lẽ ra chỉ cần liếc.
--
-- Danh sách việc đã xong KHÔNG mất đi: nó vẫn ở màn Lộ trình, nơi có chỗ để
-- trình bày tử tế. Push chỉ cần trả lời «ai, ngày nào, xong bao nhiêu».
--
-- Giữ nguyên phép gộp tin của mục 15: hai dòng đầu vẫn là chữ ký nhận diện tin
-- cùng (học viên, ngày lộ trình) còn đang chờ phát.
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
  -- Cắt ngắn hơn bản trước (70 → 50): dòng «Việc:» tràn là đẩy khuất dòng
  -- «Nội dung:» mang con số, đúng cái lỗi đang phải sửa
  IF char_length(COALESCE(v_ten_viec, '')) > 50 THEN
    v_ten_viec := left(v_ten_viec, 49) || '…';
  END IF;
  SELECT count(*) INTO v_tong FROM public.ttc_dau_viec WHERE ngay_id = _ngay_id;
  SELECT count(*) INTO v_xong FROM public.ttc_tien_do t
    JOIN public.ttc_dau_viec d ON d.id = t.dau_viec_id
   WHERE d.ngay_id = _ngay_id AND t.nguoi = _nguoi_lam AND t.hoan_thanh;

  -- Chuẩn hình thức push 09/08/2026: tiêu đề ngắn mang con số, thân tin mỗi
  -- dòng một nhãn, không nối bằng «·»
  v_tieu_de := format('Ngày %s: đã xong %s/%s đầu việc', v_ngay.so_thu_tu, v_xong, v_tong);

  -- Hai dòng đầu là chữ ký nhận diện tin cùng (học viên, ngày lộ trình) để gộp
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
      v_dong_viec := format('Việc: %s và các đầu việc trước đó',
                            COALESCE(v_ten_viec, 'một đầu việc'));
    ELSE
      v_dong_viec := format('Việc: %s', COALESCE(v_ten_viec, 'một đầu việc'));
    END IF;
    v_noi_dung := v_dau || format(E'%s\nNội dung: Đã hoàn thành %s/%s đầu việc của ngày.',
                                  v_dong_viec, v_xong, v_tong);

    IF cu IS NOT NULL THEN
      UPDATE public.ct2_thong_bao SET tieu_de = v_tieu_de, noi_dung = v_noi_dung WHERE id = cu;
      so_dat := so_dat + 1;
    -- dau_viec_id để NULL: cột đó có khoá ngoại tới ct2_dau_viec của Chiêu thức 2
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
  'Báo cho toàn bộ thành viên khóa học khi học viên tích hoàn thành. Thân tin bốn dòng để màn hình khoá điện thoại hiện đủ; danh sách chi tiết việc đã xong nằm ở màn Lộ trình. Gộp vào tin cùng (học viên, ngày) còn chờ phát. KHÔNG ghi dau_viec_id: cột đó thuộc Chiêu thức 2.';
