-- Gỡ 20261033090000: bhy_ideas_hd_ly_do_khong_cham về bản 20261032090000
-- (chạy lại đoạn 3 của migration đó — Ban Giám đốc lại bị áp nguyên tắc phòng);
-- phiếu gửi lại bắt buộc có A4.
ALTER TABLE public.portal_idea_council_votes DROP CONSTRAINT IF EXISTS phieu_gui_du_du_lieu;
ALTER TABLE public.portal_idea_council_votes ADD CONSTRAINT phieu_gui_du_du_lieu CHECK (
  status = 'draft' OR (
    conflict_status IS NOT NULL
    AND score_problem IS NOT NULL AND score_impact IS NOT NULL AND score_feasible IS NOT NULL
    AND score_safety IS NOT NULL AND score_scale IS NOT NULL AND recommendation IS NOT NULL
    AND (recommendation NOT IN ('khong_xet', 'can_bo_sung') OR btrim(coalesce(gop_y, '')) <> '')
  )
);
COMMENT ON COLUMN public.portal_idea_council_votes.conflict_status IS NULL;
