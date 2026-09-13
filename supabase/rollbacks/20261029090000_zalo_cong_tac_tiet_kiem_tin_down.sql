-- Gỡ 20261029090000: trigger quay về luôn gom theo gom_phut, bỏ gọi tức thì.
CREATE OR REPLACE FUNCTION public.sao_xep_hang_zalo()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bat text;
  phut integer;
BEGIN
  IF NEW.entry_mode = 'backfill' THEN RETURN NEW; END IF;
  SELECT gia_tri INTO bat FROM public.zalo_cau_hinh WHERE khoa = 'bat_sao_xung_dang';
  IF bat IS DISTINCT FROM 'true' THEN RETURN NEW; END IF;
  SELECT COALESCE(NULLIF(gia_tri, '')::int, 2) INTO phut FROM public.zalo_cau_hinh WHERE khoa = 'gom_phut';
  INSERT INTO public.zalo_hang_doi (star_record_id, san_sang_luc)
  VALUES (NEW.id, now() + make_interval(mins => GREATEST(0, COALESCE(phut, 2))))
  ON CONFLICT (star_record_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;
DROP FUNCTION IF EXISTS public.zalo_kich_hoat_gui_sao();
DELETE FROM public.zalo_cau_hinh WHERE khoa = 'tiet_kiem_tin';
