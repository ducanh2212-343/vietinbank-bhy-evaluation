-- «Đến hạn GHTD 2 tháng tới» thành TRẠNG THÁI THẬT, không còn là cột dẫn xuất
--
-- Giám đốc chốt 08/2026: cột giữ nguyên, nhưng mỗi khách hàng chỉ được xuất
-- hiện ở ĐÚNG MỘT chỗ. «Đến hạn GHTD 2 tháng tới» là trạng thái DỰ KIẾN, đứng
-- đầu đường ống; bắt tay làm thì chuyển sang «Thu thập hồ sơ» và rời cột cũ.
--
-- Trước đợt này nó là cột dẫn xuất tính từ ngày hạn mức, nên một hồ sơ đang ở
-- TRINH_TSC vẫn hiện thêm một thẻ nữa ở cột đến hạn — cùng một khách, hai chỗ,
-- đếm hai lần. Nay là trạng thái thật thì chuyện đó không xảy ra được nữa.
--
-- HÀNG RÀO ĐƯỢC DỜI CHỖ, KHÔNG BỊ GỠ. `f_ct2_hs_truoc_tao` vốn bắt buộc số
-- tiền + hạn xử lý + kỳ hạn ngay lúc mở hồ sơ. Thẻ dự kiến sinh ra từ đúng MỘT
-- sự thật — hạn mức của khách sắp hết — nên lúc đó chưa thể biết ba thứ kia.
-- Bắt điền ngay là ép người ta bịa số. Vì vậy cổng chuyển sang cột dự kiến bỏ
-- ba điều kiện đó, và `f_ct2_hs_truoc_sua` hỏi lại đủ ba khi thẻ RỜI cột dự
-- kiến để vào Thu thập hồ sơ. Không có đoạn nào hồ sơ thật đi qua mà không bị
-- hỏi — chỉ đổi chỗ hỏi cho đúng lúc người ta biết câu trả lời.

-- ---------------------------------------------------------------------------
-- 1. Cho phép trạng thái mới
-- ---------------------------------------------------------------------------
ALTER TABLE public.ct2_ho_so_tin_dung
  DROP CONSTRAINT IF EXISTS ct2_ho_so_tin_dung_trang_thai_check;

ALTER TABLE public.ct2_ho_so_tin_dung
  ADD CONSTRAINT ct2_ho_so_tin_dung_trang_thai_check
  CHECK (trang_thai = ANY (ARRAY[
    'DEN_HAN_GHTD','THU_THAP','TRINH_LDP','TRINH_LDCN','TRINH_TSC',
    'HOAN_THIEN_GN','HOAN_THANH','TU_CHOI'
  ]));

-- ---------------------------------------------------------------------------
-- 2. Cổng TẠO — thẻ dự kiến chỉ cần khách hàng + ngày hạn mức đến hạn
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_hs_truoc_tao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE ma_phong text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NOT public.ct2_phong_co_pdtd(NEW.phong) THEN
    RAISE EXCEPTION 'Phòng này chưa bật bàn Phê duyệt tín dụng. Liên hệ Phòng TCTH để bật.';
  END IF;
  IF NOT public.ct2_sua_duoc_phong(NEW.phong)
     AND NOT (NEW.can_bo = public.get_my_profile_id()
              AND NEW.phong = public.get_my_department_id()) THEN
    RAISE EXCEPTION 'Anh/chị chỉ mở được hồ sơ do chính mình phụ trách, trong phòng mình';
  END IF;

  IF NEW.trang_thai = 'DEN_HAN_GHTD' THEN
    -- Thẻ dự kiến: thứ DUY NHẤT làm nó có nghĩa là ngày hạn mức đến hạn.
    -- Không có ngày thì không biết nó dự kiến cho lúc nào, thành thẻ trôi nổi.
    IF NEW.ngay_den_han_ghtd IS NULL THEN
      RAISE EXCEPTION 'Thẻ dự kiến phải có ngày hạn mức đến hạn — đó là lý do nó nằm trên bảng';
    END IF;
  ELSE
    IF NEW.so_tien IS NULL THEN
      RAISE EXCEPTION 'Hồ sơ mở mới phải có số tiền (đơn vị triệu đồng)';
    END IF;
    IF NEW.han_xu_ly IS NULL THEN
      RAISE EXCEPTION 'Hồ sơ mở mới phải có hạn xử lý — không có hạn thì không đo được đúng hẹn';
    END IF;
    IF NEW.ky_han IS NULL THEN
      RAISE EXCEPTION 'Hồ sơ mở mới phải chọn kỳ hạn (ngắn hạn / trung dài hạn)';
    END IF;
  END IF;

  NEW.ngay_nhan := COALESCE(NEW.ngay_nhan, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);

  IF NEW.ma_hs IS NULL THEN
    SELECT d.code INTO ma_phong FROM public.departments d WHERE d.id = NEW.phong;
    NEW.ma_hs := COALESCE(ma_phong, 'CN') || '-TD-'
      || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-'
      || lpad(nextval('public.ct2_ma_hs_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END $function$;

-- ---------------------------------------------------------------------------
-- 3. Cổng CHUYỂN BƯỚC — hỏi lại đủ ba trường khi rời cột dự kiến
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.f_ct2_hs_truoc_sua()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  la_lanh_dao boolean := public.ct2_sua_duoc_phong(OLD.phong);
  la_can_bo boolean := (public.get_my_profile_id() = OLD.can_bo);
  thieu text[];
BEGIN
  IF auth.uid() IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF NOT la_lanh_dao AND NOT la_can_bo THEN
    RAISE EXCEPTION 'Anh/chị không có quyền sửa hồ sơ này';
  END IF;

  IF NOT la_lanh_dao AND (
       (NEW.so_tien IS DISTINCT FROM OLD.so_tien AND OLD.so_tien IS NOT NULL)
    OR NEW.cap_phe_duyet IS DISTINCT FROM OLD.cap_phe_duyet
    OR NEW.can_bo IS DISTINCT FROM OLD.can_bo
    OR NEW.khach_hang IS DISTINCT FROM OLD.khach_hang) THEN
    RAISE EXCEPTION 'Đổi khách hàng, số tiền, cấp phê duyệt hay cán bộ phụ trách cần lãnh đạo Phòng';
  END IF;

  IF NEW.trang_thai IS DISTINCT FROM OLD.trang_thai THEN
    -- Cột dự kiến một chiều: đã bắt tay làm thì không quay lại «dự kiến» được.
    -- Kéo ngược sẽ xoá mất sự thật «đã có người nhận việc» và làm đồng hồ xử lý
    -- chạy lại từ đầu. Muốn dừng thì có Từ chối/Dừng — cửa đó ghi lý do, giữ vết.
    IF NEW.trang_thai = 'DEN_HAN_GHTD' THEN
      RAISE EXCEPTION 'Cột «Đến hạn GHTD» là điểm xuất phát — hồ sơ đã bắt đầu không quay lại được. Cần dừng thì dùng Từ chối/Dừng.';
    END IF;

    IF OLD.trang_thai = 'DEN_HAN_GHTD' THEN
      IF NEW.trang_thai NOT IN ('THU_THAP','TU_CHOI') THEN
        RAISE EXCEPTION 'Từ cột dự kiến chỉ đi sang «Thu thập hồ sơ» — chưa thu thập thì chưa có gì để trình';
      END IF;
      IF NEW.trang_thai = 'THU_THAP' THEN
        -- Hàng rào của cổng tạo, hỏi lại đúng lúc người ta biết câu trả lời
        -- array_append chứ KHÔNG phải `thieu || 'chuỗi'`: với text[] và một hằng
        -- chưa định kiểu, Postgres chọn toán tử array||array rồi cố đọc chuỗi
        -- tiếng Việt như mảng và ném «malformed array literal» — người dùng nhận
        -- lỗi kiểu dữ liệu thay vì câu hướng dẫn. Đã dính đúng bẫy này khi kiểm thử.
        thieu := ARRAY[]::text[];
        IF NEW.so_tien IS NULL THEN thieu := array_append(thieu, 'số tiền'); END IF;
        IF NEW.han_xu_ly IS NULL THEN thieu := array_append(thieu, 'hạn xử lý'); END IF;
        IF NEW.ky_han IS NULL THEN thieu := array_append(thieu, 'kỳ hạn'); END IF;
        IF array_length(thieu, 1) > 0 THEN
          RAISE EXCEPTION 'Bắt tay làm thì cần điền % — thẻ dự kiến chưa có các thông tin này',
            array_to_string(thieu, ' · ');
        END IF;
        -- Đồng hồ xử lý bắt đầu từ hôm nay, không phải từ ngày thẻ dự kiến sinh ra
        NEW.ngay_nhan := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
      END IF;
    END IF;

    IF NEW.trang_thai = 'TRINH_TSC' AND NEW.cap_phe_duyet <> 'TSC' THEN
      RAISE EXCEPTION 'Hồ sơ này thuộc thẩm quyền % — không trình lên cấp PDTD Trụ sở chính', OLD.cap_phe_duyet;
    END IF;

    IF NEW.trang_thai = 'HOAN_THANH' AND OLD.trang_thai NOT IN ('HOAN_THIEN_GN','HOAN_THANH') THEN
      RAISE EXCEPTION 'Chưa qua bước «Hoàn thiện hồ sơ giải ngân» — không thể chốt Hoàn thành';
    END IF;

    IF NEW.trang_thai = 'TU_CHOI' THEN
      IF NOT la_lanh_dao THEN
        RAISE EXCEPTION 'Chỉ lãnh đạo Phòng được chuyển hồ sơ sang Từ chối/Dừng';
      END IF;
      IF COALESCE(char_length(trim(NEW.ly_do_tu_choi)), 0) < 20 THEN
        RAISE EXCEPTION 'Từ chối/dừng hồ sơ phải ghi rõ lý do (tối thiểu 20 ký tự)';
      END IF;
    END IF;

    IF NEW.trang_thai IN ('TRINH_LDP','TRINH_LDCN','TRINH_TSC') THEN
      IF NEW.nguoi_dang_giu IS NULL AND NEW.trang_thai <> 'TRINH_TSC' THEN
        RAISE EXCEPTION 'Trình cấp trên phải chọn người đang giữ hồ sơ — để đồng hồ chờ tính đúng người';
      END IF;
      NEW.giu_tu := COALESCE(NEW.giu_tu, now());
    ELSE
      NEW.nguoi_dang_giu := NULL;
      NEW.giu_tu := NULL;
    END IF;

    IF NEW.trang_thai = 'HOAN_THANH' THEN
      NEW.ngay_hoan_thanh := COALESCE(NEW.ngay_hoan_thanh, (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
    END IF;

    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'trang_thai', OLD.trang_thai, NEW.trang_thai, public.get_my_profile_id());
  END IF;

  IF NEW.so_tien IS DISTINCT FROM OLD.so_tien THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'so_tien', OLD.so_tien::text, NEW.so_tien::text, public.get_my_profile_id());
  END IF;
  IF NEW.han_xu_ly IS DISTINCT FROM OLD.han_xu_ly THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'han_xu_ly', OLD.han_xu_ly::text, NEW.han_xu_ly::text, public.get_my_profile_id());
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END $function$;

-- ---------------------------------------------------------------------------
-- 4. Cảnh báo «Hạn mức sắp hết» biết thẻ dự kiến
-- ---------------------------------------------------------------------------
-- Thẻ ở cột dự kiến là hồ sơ nối tiếp CHƯA BẮT ĐẦU — nó phải tính vào nhóm
-- «chưa xong», nhưng không được coi là «đã có hồ sơ đang chạy», vì chưa ai làm.
DROP FUNCTION IF EXISTS public.ct2_pdtd_sap_den_han(uuid, integer);

CREATE OR REPLACE FUNCTION public.ct2_pdtd_sap_den_han(_phong uuid, _so_ngay integer DEFAULT 60)
 RETURNS TABLE(id uuid, ma_hs text, khach_hang text, so_tien numeric,
               ngay_den_han_ghtd date, con_lai integer,
               da_co_ho_so_moi boolean, da_xong_ho_so_moi boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT h.id, h.ma_hs, h.khach_hang, h.so_tien, h.ngay_den_han_ghtd,
         (h.ngay_den_han_ghtd - (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::int AS con_lai,
         EXISTS (
           SELECT 1 FROM public.ct2_ho_so_tin_dung m
            WHERE m.phong = h.phong
              AND m.khach_hang = h.khach_hang
              AND m.id <> h.id
              AND m.loai_ho_so IN ('TAI_CAP','DIEU_CHINH')
              -- DEN_HAN_GHTD không tính: thẻ dự kiến chưa phải hồ sơ đang chạy
              AND m.trang_thai NOT IN ('HOAN_THANH','TU_CHOI','DEN_HAN_GHTD')
         ) AS da_co_ho_so_moi,
         EXISTS (
           SELECT 1 FROM public.ct2_ho_so_tin_dung m
            WHERE m.phong = h.phong
              AND m.khach_hang = h.khach_hang
              AND m.id <> h.id
              AND m.loai_ho_so IN ('TAI_CAP','DIEU_CHINH')
              AND m.trang_thai = 'HOAN_THANH'
              AND COALESCE(m.ngay_den_han_ghtd > h.ngay_den_han_ghtd, true)
         ) AS da_xong_ho_so_moi
    FROM public.ct2_ho_so_tin_dung h
   WHERE h.phong = _phong
     AND h.ngay_den_han_ghtd IS NOT NULL
     AND h.ngay_den_han_ghtd <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + _so_ngay
     AND h.trang_thai <> 'TU_CHOI'
   ORDER BY h.ngay_den_han_ghtd
$function$;

REVOKE EXECUTE ON FUNCTION public.ct2_pdtd_sap_den_han(uuid, integer) FROM PUBLIC, anon;
