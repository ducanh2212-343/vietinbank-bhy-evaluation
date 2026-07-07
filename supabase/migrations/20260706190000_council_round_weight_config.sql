-- Trọng số nhóm đánh giá điều chỉnh được theo từng kỳ.
-- NULL = dùng trọng số mặc định theo Cơ chế đánh giá:
--   Cấp PGĐ : GĐ 20 | PGĐ còn lại 15 | thành viên khác 65
--   Cấp TP  : GĐ 20 | PGĐ phụ trách 10 | PGĐ còn lại 15 | thành viên khác 55
-- Định dạng (đơn vị %):
-- {"pgd":{"giam_doc":20,"pgd_khac":15,"thanh_vien":65},
--  "truong_phong":{"giam_doc":20,"pgd_phu_trach":10,"pgd_khac":15,"thanh_vien":55}}
ALTER TABLE public.council_rounds ADD COLUMN IF NOT EXISTS weight_config jsonb;
