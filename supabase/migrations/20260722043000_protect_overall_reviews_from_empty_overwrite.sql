-- Chống mất "Đánh giá tổng thể" (sự cố 22/07): frontend cũ hydrate thiếu cột
-- *_overall_review → autosave ghi '{}' đè lên nội dung cấp trên vừa nhập.
-- Trigger này giữ giá trị cũ khi một UPDATE cố thay nội dung ĐANG CÓ bằng
-- NULL/'{}' (không có key nào chứa chữ). Xóa nội dung chủ động từ UI hợp lệ
-- vẫn được — khi đó object có key với chuỗi rỗng, không rơi vào nhánh chặn.

CREATE OR REPLACE FUNCTION public.protect_overall_reviews()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  col text;
  old_val jsonb;
  new_val jsonb;
BEGIN
  FOREACH col IN ARRAY ARRAY['manager_overall_review','pgd_overall_review','director_overall_review']
  LOOP
    old_val := to_jsonb(OLD) -> col;
    new_val := to_jsonb(NEW) -> col;
    -- Cũ có nội dung thật (ít nhất một value khác rỗng) mà mới là NULL/{} → giữ cũ.
    IF old_val IS NOT NULL AND old_val <> 'null'::jsonb AND old_val <> '{}'::jsonb
       AND EXISTS (SELECT 1 FROM jsonb_each_text(old_val) kv WHERE btrim(kv.value) <> '')
       AND (new_val IS NULL OR new_val = 'null'::jsonb OR new_val = '{}'::jsonb) THEN
      CASE col
        WHEN 'manager_overall_review'  THEN NEW.manager_overall_review  := OLD.manager_overall_review;
        WHEN 'pgd_overall_review'      THEN NEW.pgd_overall_review      := OLD.pgd_overall_review;
        WHEN 'director_overall_review' THEN NEW.director_overall_review := OLD.director_overall_review;
      END CASE;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_overall_reviews ON public.form_submissions;
CREATE TRIGGER trg_protect_overall_reviews
  BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_overall_reviews();
