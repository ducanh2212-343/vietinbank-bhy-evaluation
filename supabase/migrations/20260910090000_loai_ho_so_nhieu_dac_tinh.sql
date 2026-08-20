-- ─────────────────────────────────────────────────────────────────────────────
-- LOẠI HỒ SƠ: MỘT LỰA CHỌN → NHIỀU ĐẶC TÍNH · BỎ «HỒ SƠ GIẢI NGÂN»
--
-- Giám đốc chốt (07/08/2026): «bỏ giải ngân, và các loại hồ sơ kia thì thành
-- tích chọn do có thể 1 hồ sơ gồm nhiều đặc tính».
--
-- Vì sao đúng: một hồ sơ ngoài đời có thể vừa TÁI CẤP vừa ĐIỀU CHỈNH giới hạn,
-- hoặc CẤP MỚI cho một DỰ ÁN trung dài hạn. Ép chọn một là ép cán bộ bỏ mất
-- một nửa sự thật — và cái nửa bị bỏ chính là cái quyết định hồ sơ có bị cảnh
-- báo hạn mức hay không. «Hồ sơ giải ngân» thì không phải đặc tính của giới
-- hạn tín dụng mà là một BƯỚC (đã có cột «Hoàn thiện HS giải ngân»); để trong
-- danh sách loại là mời chọn nhầm. Không hồ sơ nào đang mang giá trị này.
--
-- Cách làm — thêm cột mảng, KHÔNG đổi kiểu cột cũ:
--   · `cac_loai text[]` giữ toàn bộ đặc tính đã tích, tối thiểu một.
--   · `loai_ho_so` ở lại làm ĐẶC TÍNH CHÍNH (= phần tử đầu), đồng bộ tự động
--     hai chiều bằng trigger. Nhờ vậy bản dựng cũ đang chạy trên máy cán bộ
--     (chỉ biết gửi loai_ho_so) vẫn ghi được suốt cửa sổ deploy, và mọi báo
--     cáo/đoạn mã còn đọc cột cũ không gãy.
--   · Hai RPC đang lọc `loai_ho_so IN ('TAI_CAP','DIEU_CHINH')` chuyển sang
--     giao mảng `&&` — nếu không, hồ sơ tích [Cấp mới, Điều chỉnh] sẽ tuột
--     khỏi cảnh báo hạn mức chỉ vì đặc tính chính là «Cấp mới».
--
-- CREATE OR REPLACE cho các hàm — giữ nguyên ACL.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Cột mới + backfill từ giá trị đang có (không hồ sơ nào là GIAI_NGAN)
ALTER TABLE public.ct2_ho_so_tin_dung
  ADD COLUMN IF NOT EXISTS cac_loai text[] NOT NULL DEFAULT '{}';

UPDATE public.ct2_ho_so_tin_dung
   SET cac_loai = ARRAY[loai_ho_so]
 WHERE cac_loai = '{}';

COMMENT ON COLUMN public.ct2_ho_so_tin_dung.cac_loai IS
  'Các đặc tính của hồ sơ (tích chọn nhiều). Phần tử đầu là đặc tính chính, đồng bộ với cột loai_ho_so.';
COMMENT ON COLUMN public.ct2_ho_so_tin_dung.loai_ho_so IS
  'Đặc tính CHÍNH = cac_loai[1]. Giữ lại cho tương thích; nơi cần xét đầy đủ phải đọc cac_loai.';

-- 2) Bỏ GIAI_NGAN khỏi cả hai ràng buộc
ALTER TABLE public.ct2_ho_so_tin_dung
  DROP CONSTRAINT IF EXISTS ct2_ho_so_tin_dung_loai_ho_so_check;
ALTER TABLE public.ct2_ho_so_tin_dung
  ADD CONSTRAINT ct2_ho_so_tin_dung_loai_ho_so_check
  CHECK (loai_ho_so = ANY (ARRAY['CAP_MOI','TAI_CAP','DIEU_CHINH','CO_CAU_NO','DU_AN']));

ALTER TABLE public.ct2_ho_so_tin_dung
  DROP CONSTRAINT IF EXISTS ct2_hs_cac_loai_hop_le;
ALTER TABLE public.ct2_ho_so_tin_dung
  ADD CONSTRAINT ct2_hs_cac_loai_hop_le CHECK (
    array_length(cac_loai, 1) >= 1
    AND cac_loai <@ ARRAY['CAP_MOI','TAI_CAP','DIEU_CHINH','CO_CAU_NO','DU_AN']
  );

-- 3) Đồng bộ hai chiều — chốt chặn cho cửa sổ deploy
CREATE OR REPLACE FUNCTION public.f_ct2_hs_dong_bo_loai()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.cac_loai IS NOT DISTINCT FROM OLD.cac_loai
     AND NEW.loai_ho_so IS DISTINCT FROM OLD.loai_ho_so THEN
    -- Bản dựng CŨ vừa đổi đặc tính chính (nó không biết cột mảng). Nếu ở đây
    -- cứ máy móc lấy cac_loai[1] thì thay đổi của người dùng bị ghi đè ngược
    -- — đúng cái bẫy đã lộ ra khi thử. Thay đặc tính chính, giữ các đặc tính
    -- phụ mà bản mới đã tích.
    NEW.cac_loai := ARRAY[NEW.loai_ho_so]
      || array_remove(array_remove(OLD.cac_loai, NEW.loai_ho_so), OLD.loai_ho_so);
  ELSIF NEW.cac_loai IS NULL OR array_length(NEW.cac_loai, 1) IS NULL THEN
    -- Bản dựng cũ TẠO hồ sơ: chỉ gửi loai_ho_so → dựng mảng từ nó
    NEW.cac_loai := ARRAY[NEW.loai_ho_so];
  ELSE
    -- Bản mới gửi mảng → đặc tính chính là phần tử đầu
    NEW.loai_ho_so := NEW.cac_loai[1];
  END IF;
  -- Bỏ trùng, giữ nguyên thứ tự người tích (phần tử đầu = đặc tính chính)
  SELECT array_agg(x ORDER BY thu_tu) INTO NEW.cac_loai
    FROM (SELECT DISTINCT ON (x) x, thu_tu
            FROM unnest(NEW.cac_loai) WITH ORDINALITY AS t(x, thu_tu)
           ORDER BY x, thu_tu) d;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_ct2_hs_dong_bo_loai ON public.ct2_ho_so_tin_dung;
CREATE TRIGGER trg_ct2_hs_dong_bo_loai
  BEFORE INSERT OR UPDATE ON public.ct2_ho_so_tin_dung
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_hs_dong_bo_loai();

-- 4) Hai RPC xét theo GIAO MẢNG, không còn xét một giá trị
CREATE OR REPLACE FUNCTION public.ct2_pdtd_sap_den_han(_phong uuid, _so_ngay integer DEFAULT 60)
 RETURNS TABLE(id uuid, ma_hs text, khach_hang text, so_tien numeric, ngay_den_han_ghtd date, con_lai integer, da_co_ho_so_moi boolean, da_xong_ho_so_moi boolean)
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
              AND m.cac_loai && ARRAY['TAI_CAP','DIEU_CHINH']
              AND m.trang_thai NOT IN ('HOAN_THANH','TU_CHOI','DEN_HAN_GHTD')
         ) AS da_co_ho_so_moi,
         EXISTS (
           SELECT 1 FROM public.ct2_ho_so_tin_dung m
            WHERE m.phong = h.phong
              AND m.khach_hang = h.khach_hang
              AND m.id <> h.id
              AND m.cac_loai && ARRAY['TAI_CAP','DIEU_CHINH']
              AND m.trang_thai = 'HOAN_THANH'
              AND COALESCE(m.ngay_den_han_ghtd > h.ngay_den_han_ghtd, true)
         ) AS da_xong_ho_so_moi
    FROM public.ct2_ho_so_tin_dung h
   WHERE h.phong = _phong
     AND h.ngay_den_han_ghtd IS NOT NULL
     AND h.ngay_den_han_ghtd <= (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date + _so_ngay
     AND h.trang_thai NOT IN ('TU_CHOI','HOAN_THANH')
   ORDER BY h.ngay_den_han_ghtd
$function$;

CREATE OR REPLACE FUNCTION public.ct2_pdtd_thieu_du_lieu(_phong uuid)
 RETURNS TABLE(tong bigint, thieu_so_tien bigint, thieu_han_xu_ly bigint, thieu_den_han_ghtd bigint, chua_ghi_nhip bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT count(*) AS tong,
         count(*) FILTER (WHERE h.so_tien IS NULL)   AS thieu_so_tien,
         count(*) FILTER (WHERE h.han_xu_ly IS NULL) AS thieu_han_xu_ly,
         count(*) FILTER (
           WHERE h.ngay_den_han_ghtd IS NULL
             AND h.cac_loai && ARRAY['TAI_CAP','DIEU_CHINH']
         ) AS thieu_den_han_ghtd,
         count(*) FILTER (WHERE h.nhip_gan_nhat IS NULL) AS chua_ghi_nhip
    FROM public.ct2_ho_so_tin_dung h
   WHERE h.phong = _phong
     AND h.trang_thai NOT IN ('HOAN_THANH','TU_CHOI')
$function$;

-- 5) Ghi vết khi đổi bộ đặc tính — cùng lý lẽ với tên khách / cán bộ / thẩm quyền
CREATE OR REPLACE FUNCTION public.f_ct2_hs_vet_cac_loai()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.cac_loai IS DISTINCT FROM OLD.cac_loai THEN
    INSERT INTO public.ct2_nhat_ky_thay_doi(bang, ban_ghi_id, truong, gia_tri_cu, gia_tri_moi, nguoi_thuc_hien)
    VALUES ('ct2_ho_so_tin_dung', NEW.id, 'cac_loai',
            array_to_string(OLD.cac_loai, ' + '), array_to_string(NEW.cac_loai, ' + '),
            public.get_my_profile_id());
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_ct2_hs_vet_cac_loai ON public.ct2_ho_so_tin_dung;
CREATE TRIGGER trg_ct2_hs_vet_cac_loai
  AFTER UPDATE ON public.ct2_ho_so_tin_dung
  FOR EACH ROW EXECUTE FUNCTION public.f_ct2_hs_vet_cac_loai();

REVOKE ALL ON FUNCTION public.f_ct2_hs_dong_bo_loai() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.f_ct2_hs_vet_cac_loai() FROM PUBLIC, anon;
