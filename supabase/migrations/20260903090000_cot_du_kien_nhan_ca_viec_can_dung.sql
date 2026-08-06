-- Cột dự kiến nhận CẢ hai loại việc sắp tới — và 5 thẻ Miro chưa xếp vào đúng chỗ
--
-- Giám đốc chốt 06/08: đổi tên cột thành «Đến hạn GHTD hoặc cần sử dụng trong
-- 2 tháng tới», và đưa 5 thẻ Miro chưa xếp cột nào vào đó.
--
-- Vì sao phải nới định nghĩa chứ không chỉ đổi chữ: soi 5 thẻ ấy thì KHÔNG thẻ
-- nào có ngày hạn mức đến hạn — chúng là nhu cầu CẦN DÙNG vốn (Ngành Ong 290
-- tỷ hạn xử lý 31/8, Đài Loan 10/8, Minh Anh Đô Lương 20/8), hai thẻ còn lại
-- (Ngân Hà, Mặt Trời Việt) chưa có mốc nào. Cổng tạo cũ đòi bằng được
-- ngay_den_han_ghtd, nên giữ nguyên thì chính 5 thẻ GĐ muốn đưa vào lại không
-- vào được — hàng rào chặn đúng thứ nó sinh ra để phục vụ.
--
-- Luật mới: thẻ dự kiến phải neo vào cửa sổ 2 tháng bằng ÍT NHẤT MỘT mốc —
-- ngay_den_han_ghtd (hạn mức sắp hết) HOẶC han_xu_ly (ngày khách cần dùng).
-- Không có mốc nào thì không biết «2 tháng tới» là tới bao giờ.

-- ---------------------------------------------------------------------------
-- 1. Cổng TẠO nhận cả hai loại mốc
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
    -- Thẻ dự kiến neo vào cửa sổ 2 tháng bằng một trong hai mốc. Thiếu cả hai
    -- thì không ai biết «2 tháng tới» tính từ đâu — thẻ trôi nổi trên bảng.
    IF NEW.ngay_den_han_ghtd IS NULL AND NEW.han_xu_ly IS NULL THEN
      RAISE EXCEPTION 'Thẻ dự kiến cần ngày hạn mức đến hạn HOẶC ngày khách cần dùng vốn — đó là lý do nó nằm trên bảng';
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
-- 2. Năm thẻ Miro chưa xếp cột → cột dự kiến
-- ---------------------------------------------------------------------------
-- Đây là SỬA LỖI NHẬP, không phải chuyển bước nghiệp vụ: đợt nhập 08/2026 gặp
-- thẻ nằm ngoài mọi cột trên Miro nên tạm xếp «Thu thập hồ sơ» và ghi rõ «cần
-- xác nhận bước thật» trong ghi chú. Nay GĐ xác nhận bước thật là cột dự kiến.
UPDATE public.ct2_ho_so_tin_dung
   SET trang_thai = 'DEN_HAN_GHTD',
       ghi_chu = ghi_chu || ' — GĐ xác nhận 06/08: thuộc cột dự kiến (đến hạn GHTD hoặc cần sử dụng trong 2 tháng tới).'
 WHERE ma_hs IN ('KHDN-TD-2608-048',  -- Mặt Trời Việt
                 'KHDN-TD-2608-049',  -- May Minh Anh Đô Lương
                 'KHDN-TD-2608-050',  -- Ngành Ong (KS Thành Công)
                 'KHDN-TD-2608-051',  -- Dinh dưỡng Quốc tế Đài Loan
                 'KHDN-TD-2608-053')  -- Ngân Hà
   AND trang_thai = 'THU_THAP'
   -- Chưa ai bắt tay làm thì mới lùi được về dự kiến; có nhịp rồi là việc thật
   AND NOT EXISTS (SELECT 1 FROM public.ct2_nhip_ho_so n
                    WHERE n.ho_so_id = ct2_ho_so_tin_dung.id);
