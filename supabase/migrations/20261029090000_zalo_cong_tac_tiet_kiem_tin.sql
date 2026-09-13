-- Công tắc «Tiết kiệm tin» cho kênh Zalo (13/09/2026, GĐ yêu cầu ngay sau khi bật kênh).
--
-- Bật: phiếu chờ `gom_phut` (2 phút) để phiếu nhập liền nhau đi chung một tin.
-- Tắt (mặc định lúc mới chuyển đổi — GĐ muốn tin lên ngay để cán bộ thấy kênh
-- sống): phiếu vào hàng với mốc sẵn sàng = ngay, và trigger gọi luôn hàm gửi
-- qua pg_net thay vì chờ cron mỗi phút. Gọi hỏng thì cron vẫn vớt — không mất tin.
INSERT INTO public.zalo_cau_hinh (khoa, gia_tri, mo_ta) VALUES
  ('tiet_kiem_tin', 'false', 'true: gom phiếu trong cửa sổ gom_phut rồi gửi · false: đẩy tức thì từng phiếu')
ON CONFLICT (khoa) DO NOTHING;

CREATE OR REPLACE FUNCTION public.zalo_kich_hoat_gui_sao()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://whlysprzsguehxmrjwha.supabase.co/functions/v1/zalo-gui-sao',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets
                                     WHERE name = 'email_queue_service_role_key')
    ),
    body := '{"hanh_dong": "phat"}'::jsonb
  );
EXCEPTION WHEN OTHERS THEN
  NULL; -- cron mỗi phút sẽ vớt
END $$;
REVOKE ALL ON FUNCTION public.zalo_kich_hoat_gui_sao() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sao_xep_hang_zalo()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bat text;
  tiet_kiem text;
  phut integer;
BEGIN
  IF NEW.entry_mode = 'backfill' THEN RETURN NEW; END IF;
  SELECT gia_tri INTO bat FROM public.zalo_cau_hinh WHERE khoa = 'bat_sao_xung_dang';
  IF bat IS DISTINCT FROM 'true' THEN RETURN NEW; END IF;
  SELECT gia_tri INTO tiet_kiem FROM public.zalo_cau_hinh WHERE khoa = 'tiet_kiem_tin';
  IF tiet_kiem = 'true' THEN
    SELECT COALESCE(NULLIF(gia_tri, '')::int, 2) INTO phut FROM public.zalo_cau_hinh WHERE khoa = 'gom_phut';
  ELSE
    phut := 0;
  END IF;
  INSERT INTO public.zalo_hang_doi (star_record_id, san_sang_luc)
  VALUES (NEW.id, now() + make_interval(mins => GREATEST(0, COALESCE(phut, 0))))
  ON CONFLICT (star_record_id) DO NOTHING;
  IF COALESCE(phut, 0) = 0 THEN
    PERFORM public.zalo_kich_hoat_gui_sao();
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;
