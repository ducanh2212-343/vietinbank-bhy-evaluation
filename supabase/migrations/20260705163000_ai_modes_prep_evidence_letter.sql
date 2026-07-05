-- Ba mode AI mới (prompt để trống → dùng fallback trong edge function ai-advisor;
-- admin có thể ghi đè template tại trang Quản trị AI & Prompt):
-- - one_on_one_prep: soạn trang chuẩn bị phiên 1-1 cho quản lý
-- - evidence_review: thẩm định minh chứng khi tự chấm level cao (L3+)
-- - quarterly_letter: thư tổng kết phát triển cá nhân cuối kỳ (gửi email)

INSERT INTO public.ai_prompts (mode, description, content, model, is_active)
VALUES
  (
    'one_on_one_prep',
    'Trợ lý chuẩn bị phiên 1-1: nhận payload tổng hợp (kỹ năng nổi bật/gap, thái độ, hành động Kanban, câu trả lời 1-1 kỳ trước) và soạn trang chuẩn bị cho quản lý. Biến khả dụng: {context_block}',
    '',
    'google/gemini-2.5-flash',
    true
  ),
  (
    'evidence_review',
    'Thẩm định minh chứng level: so minh chứng cán bộ cung cấp với mô tả level của kỹ năng, nhận xét minh chứng đã khớp mức tự chấm chưa. Biến: {skill_name},{claimed_level},{evidence_block},{l1}..{l4}',
    '',
    'google/gemini-2.5-flash',
    true
  ),
  (
    'quarterly_letter',
    'Thư tổng kết phát triển cá nhân cuối kỳ (giọng tích cực, gửi email cho cán bộ). Biến khả dụng: {context_block}',
    '',
    'google/gemini-2.5-flash',
    true
  )
ON CONFLICT (mode) DO NOTHING;
