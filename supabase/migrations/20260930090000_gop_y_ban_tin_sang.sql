-- Bản tin sáng «Góp ý BHY One» cho Phòng TCTH + Ban Giám đốc
--
-- Trước đây ba người tiếp nhận chỉ biết có góp ý mới khi tự mở trang
-- /gop-y-he-thong — góp ý ngày 15/08 và 20/08 nằm nguyên trạng thái «Mới gửi»
-- nhiều ngày là vì vậy.
--
-- GỘP MỘT TIN MỖI SÁNG, không báo từng phiếu: nhịp thực tế chưa tới 1 góp ý/
-- ngày nên báo ngay từng cái không nhanh hơn bao nhiêu, mà tốn thêm một loại
-- push giữa 21+ loại cán bộ đang nhận. Phát lúc 9h10 (không phải 7h00 như các
-- tin hoãn khác) theo yêu cầu nghiệp vụ: chờ mọi người nhập xong đầu giờ sáng.
--
-- Thân tin CẮT CỨNG tối đa 3 dòng — bản tin không bao giờ dài, kể cả ngày có
-- 20 góp ý (phần dôi ra gộp thành một dòng «… và N phiếu khác»).

-- ---------------------------------------------------------------------------
-- 1) Dấu mốc đã gộp vào bản tin — để không báo lại phiếu cũ mỗi sáng
-- ---------------------------------------------------------------------------
ALTER TABLE public.portal_gop_y
  ADD COLUMN IF NOT EXISTS bao_luc TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.portal_gop_y.bao_luc IS
  'Thời điểm phiếu này được gộp vào bản tin sáng; NULL = chưa báo';

CREATE INDEX IF NOT EXISTS idx_portal_gop_y_chua_bao
  ON public.portal_gop_y (created_at) WHERE bao_luc IS NULL;

-- ---------------------------------------------------------------------------
-- 2) Soạn và đặt bản tin sáng
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gop_y_ban_tin_sang(_that boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  SO_DONG_TOI_DA constant int := 3;
  so_phieu int;
  than text;
  tieu_de text;
  so_nhan int := 0;
BEGIN
  -- Ngày nghỉ thì bỏ qua hẳn: phiếu vẫn còn bao_luc IS NULL nên buổi sáng làm
  -- việc kế tiếp gộp luôn cả cụm. KHÔNG dùng ct2_moc_phat_gan_nhat() ở đây vì
  -- hàm đó đẩy tin về 7h00 — sớm hơn mốc 9h nghiệp vụ đã chốt.
  IF NOT public.ct2_la_ngay_lam_viec(now()) THEN
    RETURN jsonb_build_object('so_phieu', 0, 'ghi_chu', 'Ngày nghỉ — để dành cho buổi làm việc kế tiếp');
  END IF;

  SELECT count(*) INTO so_phieu FROM public.portal_gop_y WHERE bao_luc IS NULL;
  IF so_phieu = 0 THEN
    RETURN jsonb_build_object('so_phieu', 0, 'ghi_chu', 'Không có góp ý mới');
  END IF;

  -- Mỗi phiếu MỘT DÒNG «<tên người gửi>: <trích nội dung>» (chuẩn hình thức
  -- 09/08: thân tin mỗi dòng một nhãn, không nối bằng «·»).
  SELECT string_agg(dong, E'\n' ORDER BY thu_tu) INTO than
    FROM (
      SELECT row_number() OVER (ORDER BY created_at DESC) AS thu_tu,
             nguoi_gui || ': ' || public.ct2_cat(replace(noi_dung, E'\n', ' '), 70) AS dong
        FROM public.portal_gop_y
       WHERE bao_luc IS NULL
       ORDER BY created_at DESC
       LIMIT SO_DONG_TOI_DA
    ) d;

  IF so_phieu > SO_DONG_TOI_DA THEN
    than := than || E'\n… và ' || (so_phieu - SO_DONG_TOI_DA) || ' phiếu khác';
  END IF;

  tieu_de := 'Góp ý BHY One — ' || so_phieu || ' phiếu chờ xem xét';

  IF NOT _that THEN
    RETURN jsonb_build_object('so_phieu', so_phieu, 'tieu_de', tieu_de,
                              'noi_dung', than, 'ghi_chu', 'dry_run — chưa đặt tin');
  END IF;

  -- Chèn thẳng vào hàng đợi (không qua ct2_dat_thong_bao) theo đúng lối của
  -- tin PHIEN_BAN: bản tin mỗi ngày một lần không được rơi vào trần 3 tin
  -- NHE/người/ngày, mà cron cũng không có auth.uid() cho phép tự-nhắc.
  WITH nguoi_nhan AS (
    SELECT p.id
      FROM public.profiles p
     WHERE p.status = 'active'
       AND p.user_id IS NOT NULL
       AND public.la_nguoi_duyet_gop_y(p.user_id)
  ), da_chen AS (
    INSERT INTO public.ct2_thong_bao
      (ma_su_kien, nguoi_nhan, tieu_de, noi_dung, muc, kenh, phat_luc)
    SELECT 'GOP_Y', n.id, tieu_de, than, 'NHE', ARRAY['push','bell'], now()
      FROM nguoi_nhan n
    RETURNING 1
  )
  SELECT count(*) INTO so_nhan FROM da_chen;

  UPDATE public.portal_gop_y SET bao_luc = now() WHERE bao_luc IS NULL;

  PERFORM public.ct2_kich_hoat_phat_push();

  RETURN jsonb_build_object('so_phieu', so_phieu, 'so_nguoi_nhan', so_nhan,
                            'tieu_de', tieu_de, 'noi_dung', than);
END $$;

REVOKE ALL ON FUNCTION public.gop_y_ban_tin_sang(boolean) FROM PUBLIC, anon, authenticated;

-- Góp ý đã có trước đợt này coi như đã biết — không dội một bản tin 13 phiếu
-- vào sáng mai.
UPDATE public.portal_gop_y SET bao_luc = now() WHERE bao_luc IS NULL;

-- ---------------------------------------------------------------------------
-- 3) Cron 9h10 sáng thứ 2–6 (giờ Việt Nam = UTC+7 ⇒ 2h10 UTC)
-- ---------------------------------------------------------------------------
-- 9h10 chứ không phải 9h00: mốc 9h00 UTC+7 đã có hai việc nặng (ct2-chot-so-nhip,
-- bhy-ideas-hoi-dong-nhac), và nghiệp vụ chỉ yêu cầu «sau 9h».
SELECT cron.unschedule('gop-y-ban-tin-sang')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'gop-y-ban-tin-sang');

SELECT cron.schedule('gop-y-ban-tin-sang', '10 2 * * 1-5',
                     $cron$ SELECT public.gop_y_ban_tin_sang(true); $cron$);
