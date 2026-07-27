-- Dọn bản sao kết luận còn lại ở director_overall_review sau khi đã chuyển sang
-- pgd_overall_review (phiếu PGĐ Thùy Linh Q2 — migration 20260802100000). Lần UPDATE
-- trong migration trước bị trigger trg_protect_overall_reviews khôi phục (đúng thiết
-- kế: chống autosave ghi rỗng làm mất nhận xét) — tắt tạm trong transaction này.

ALTER TABLE public.form_submissions DISABLE TRIGGER trg_protect_overall_reviews;

UPDATE public.form_submissions
   SET director_overall_review = '{}'::jsonb
 WHERE id = 'a706ebd8-aec1-4d21-b4cf-b12de4a2a179'
   AND pgd_overall_review ? 'next_focus'
   AND director_overall_review = pgd_overall_review;

ALTER TABLE public.form_submissions ENABLE TRIGGER trg_protect_overall_reviews;
