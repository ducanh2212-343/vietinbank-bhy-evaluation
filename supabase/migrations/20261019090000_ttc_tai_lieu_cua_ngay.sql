-- ---------------------------------------------------------------------------
-- TÀI LIỆU CỦA NGÀY — bộ tệp Phòng Tổ chức Tổng hợp PHÁT cho học viên
--
-- Giám đốc 07/09/2026: «mỗi ngày sẽ có một nhóm tài liệu riêng, làm tính năng
-- đính kèm file các tài liệu gửi cho học viên ngày hôm đó». Thực tế mỗi ngày có
-- một bộ biểu mẫu riêng (BM_NGAY_02 … BM_NGAY_05, ba câu hỏi định hướng ngày 1).
--
-- Phân biệt với thứ đã có, hai chiều ngược nhau:
--   ttc_tien_do.tep  — học viên NỘP LÊN cho một đầu việc (từ dưới lên)
--   ttc_ngay.tai_lieu — Phòng TCTH PHÁT XUỐNG cho cả lớp theo ngày (từ trên xuống)
-- Không gộp vào một chỗ: hai thứ khác người ghi, khác vòng đời, và gộp lại thì
-- danh sách bài nộp của học viên lẫn với biểu mẫu phát ra.
--
-- Không cần policy mới. Bảng ttc_ngay đã đúng phân quyền cần thiết:
--   đọc = ttc_la_thanh_vien   (cả lớp thấy tài liệu)
--   ghi = ttc_sua_duoc_noi_dung (Phòng TCTH quản trị + Ban Giám đốc)
-- Kho tệp cũng không cần policy mới: đường dẫn
-- <chuong_trinh_id>/<user_id>/<ngay_id>/<uuid>.<đuôi> khớp đúng ba policy đã có
-- của bucket bhy-training, vốn chỉ gác hai cấp thư mục đầu.
--
-- Cổng chặn thật nằm ở tầng dữ liệu chứ không ở kho tệp: học viên là thành viên
-- nên storage vẫn cho họ tải tệp lên thư mục của chương trình, nhưng chỉ TCTH và
-- BGĐ mới ghi được vào ttc_ngay.tai_lieu. Tệp không được ghi vào cột này thì
-- không hiện ở đâu cả.
-- ---------------------------------------------------------------------------
ALTER TABLE public.ttc_ngay
  ADD COLUMN IF NOT EXISTS tai_lieu jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.ttc_ngay.tai_lieu IS
  'Tài liệu Phòng TCTH phát cho học viên trong ngày: [{path, ten, kich_thuoc, luc}] trong kho bhy-training. Khác ttc_tien_do.tep là bài học viên nộp lên.';

-- Chuẩn hoá và chặn ngay tại tầng dữ liệu: giao diện có thể bị đi vòng
CREATE OR REPLACE FUNCTION public.f_ttc_ngay_truoc_ghi()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tai_lieu IS NULL OR jsonb_typeof(NEW.tai_lieu) <> 'array' THEN
    NEW.tai_lieu := '[]'::jsonb;
  END IF;
  -- Trần 10 tệp một ngày: bộ biểu mẫu + văn bản của ngày + vài phụ lục là đủ.
  -- Không có trần thì đây thành kho lưu trữ và học viên phải lần trong đống tệp
  -- để tìm biểu mẫu cần điền.
  IF jsonb_array_length(NEW.tai_lieu) > 10 THEN
    RAISE EXCEPTION 'Mỗi ngày tối đa 10 tài liệu. Gộp bớt hoặc bỏ tệp cũ trước khi thêm.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS ttc_ngay_truoc_ghi ON public.ttc_ngay;
CREATE TRIGGER ttc_ngay_truoc_ghi BEFORE INSERT OR UPDATE ON public.ttc_ngay
  FOR EACH ROW EXECUTE FUNCTION public.f_ttc_ngay_truoc_ghi();

-- Nhân bản chương trình: KHÔNG mang tài liệu sang đợt mới.
--
-- Đường dẫn tệp bắt đầu bằng chuong_trinh_id của đợt CŨ, mà policy đọc của kho
-- xét đúng thư mục cấp 1 đó. Chép metadata sang đợt mới thì học viên đợt mới
-- thấy tên tệp nhưng bấm vào không mở được — tệ hơn là không thấy gì. Đợt mới
-- tải lại tài liệu của đợt mình.
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
