-- ---------------------------------------------------------------------------
-- 1) SỬA: đã nộp tệp rồi vẫn không tích hoàn thành được
--
-- Triệu chứng: đầu việc «Ký cam kết ba bên» hiện rõ «TỆP ĐÃ NỘP (1)» nhưng bấm ô
-- tích thì báo «Đầu việc này yêu cầu nộp trước khi tích hoàn thành. Còn thiếu:
-- tệp đính kèm».
--
-- Nguyên nhân: client tích bằng upsert — INSERT ... ON CONFLICT (dau_viec_id,
-- nguoi) DO UPDATE — và chỉ gửi hoan_thanh + thoi_diem, không gửi lại tep.
-- Postgres chạy trigger BEFORE INSERT trên hàng mới **trước khi** phát hiện
-- xung đột, nên tại thời điểm kiểm tra NEW.tep là mảng rỗng mặc định dù hàng cũ
-- trong bảng đã có tệp. Trigger ném lỗi và huỷ cả lệnh.
--
-- Đây là lý do vì sao lỗi chỉ xảy ra ở đầu việc có bật tính năng nộp: đầu việc
-- không bật gì thì trigger không xét tới tep nên tích bình thường.
--
-- Cách sửa: ở nhánh INSERT, lấy phần đã nộp từ hàng đang có (nếu có) rồi mới
-- kiểm. Gán ngược vào NEW để file_url tính đúng; ON CONFLICT DO UPDATE chỉ SET
-- những cột client gửi nên tep trong bảng không bị đụng tới.
--
-- KHÔNG nới lỏng cổng chặn: đầu việc chưa nộp gì thì vẫn không tích được, và
-- người xoá hết tệp rồi tích cũng vẫn bị chặn — vì lúc đó hàng cũ cũng rỗng.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ttc_tien_do_truoc_ghi()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tn text[];
  thieu text[] := ARRAY[]::text[];
  cu public.ttc_tien_do;
BEGIN
  IF NEW.tep IS NULL OR jsonb_typeof(NEW.tep) <> 'array' THEN NEW.tep := '[]'::jsonb; END IF;

  -- Upsert: hàng cũ có thể đã mang phần nộp mà lệnh này không gửi lại
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO cu FROM public.ttc_tien_do t
     WHERE t.dau_viec_id = NEW.dau_viec_id AND t.nguoi = NEW.nguoi;
    IF cu.id IS NOT NULL THEN
      IF jsonb_array_length(NEW.tep) = 0 THEN NEW.tep := COALESCE(cu.tep, '[]'::jsonb); END IF;
      IF NEW.ghi_chu IS NULL THEN NEW.ghi_chu := cu.ghi_chu; END IF;
      IF NEW.duong_dan IS NULL THEN NEW.duong_dan := cu.duong_dan; END IF;
    END IF;
  END IF;

  NEW.file_url := NEW.tep -> 0 ->> 'path';

  IF NEW.hoan_thanh THEN
    SELECT tinh_nang INTO tn FROM public.ttc_dau_viec WHERE id = NEW.dau_viec_id;
    IF 'NOP_TEP' = ANY(tn) AND jsonb_array_length(NEW.tep) = 0 THEN
      thieu := array_append(thieu, 'tệp đính kèm');
    END IF;
    IF 'GHI_CHU' = ANY(tn) AND char_length(btrim(COALESCE(NEW.ghi_chu, ''))) < 10 THEN
      thieu := array_append(thieu, 'ghi chú kết quả (≥ 10 ký tự)');
    END IF;
    IF 'DUONG_DAN' = ANY(tn) AND btrim(COALESCE(NEW.duong_dan, '')) = '' THEN
      thieu := array_append(thieu, 'đường dẫn');
    END IF;
    IF cardinality(thieu) > 0 THEN
      RAISE EXCEPTION 'Đầu việc này yêu cầu nộp trước khi tích hoàn thành. Còn thiếu: %', array_to_string(thieu, ', ');
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Tin báo liệt kê rõ những đầu việc ĐÃ XONG, không chỉ việc vừa tích
--
-- Giám đốc 07/09/2026: «nội dung push không chi tiết phần việc nào đã xong, cần
-- bổ sung». Bản cũ chỉ có một dòng «Việc: <tên việc vừa tích>» nên người nhận
-- biết con số 3/12 mà không biết ba việc nào.
--
-- Mỗi việc một dòng có đánh số, theo đúng thứ tự trong lộ trình để đối chiếu
-- được với lịch trên màn hình. Trần 8 dòng: một ngày có tới 13 đầu việc, liệt kê
-- hết thì phần đuôi bị điện thoại cắt mất mà chẳng ai đọc.
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
  v_tong int;
  v_xong int;
  v_ds text;
  v_tieu_de text;
  v_dau text;
  v_noi_dung text;
  r record;
  cu uuid;
  so_dat int := 0;
  phat_ngay boolean := false;
  TRAN_DONG constant int := 8;
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
  SELECT count(*) INTO v_tong FROM public.ttc_dau_viec WHERE ngay_id = _ngay_id;

  -- Danh sách việc đã xong, đánh số theo thứ tự lộ trình
  WITH xong AS (
    SELECT d.ten, row_number() OVER (ORDER BY d.thu_tu) AS stt, count(*) OVER () AS tong_xong
      FROM public.ttc_tien_do t JOIN public.ttc_dau_viec d ON d.id = t.dau_viec_id
     WHERE d.ngay_id = _ngay_id AND t.nguoi = _nguoi_lam AND t.hoan_thanh
  )
  SELECT max(tong_xong)::int,
         string_agg(format('%s. %s', stt,
                           CASE WHEN char_length(ten) > 60 THEN left(ten, 59) || '…' ELSE ten END),
                    E'\n' ORDER BY stt) FILTER (WHERE stt <= TRAN_DONG)
    INTO v_xong, v_ds
    FROM xong;
  v_xong := COALESCE(v_xong, 0);
  IF v_xong > TRAN_DONG THEN
    v_ds := v_ds || format(E'\n… và %s việc nữa', v_xong - TRAN_DONG);
  END IF;

  -- Chuẩn hình thức push 09/08/2026: tiêu đề ngắn mang con số, thân tin mỗi
  -- dòng một nhãn, không nối bằng «·»
  v_tieu_de := format('Ngày %s: đã xong %s/%s đầu việc', v_ngay.so_thu_tu, v_xong, v_tong);

  -- Hai dòng đầu là chữ ký nhận diện tin cùng (học viên, ngày lộ trình) để gộp.
  -- So bằng left(...) chứ không LIKE, khỏi phải thoát dấu % và _ có thể nằm
  -- trong tên người hay tiêu đề ngày.
  v_dau := format(E'Học viên: %s\nNgày: %s · %s\n',
                  COALESCE(v_ten_hv, 'Học viên'), v_ngay.so_thu_tu, v_ngay.tieu_de);
  v_noi_dung := v_dau
    || format(E'Đã xong %s/%s:\n%s', v_xong, v_tong, COALESCE(v_ds, '(chưa có)'))
    || CASE WHEN v_tong > v_xong
            THEN format(E'\nCòn %s đầu việc chưa tích.', v_tong - v_xong)
            ELSE E'\nĐã xong toàn bộ đầu việc của ngày.' END;

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
  'Báo cho toàn bộ thành viên khóa học khi học viên tích hoàn thành. Thân tin liệt kê từng đầu việc đã xong theo thứ tự lộ trình, tối đa 8 dòng. Gộp vào tin cùng (học viên, ngày) còn chờ phát. KHÔNG ghi dau_viec_id: cột đó thuộc Chiêu thức 2.';
