// Nạp bộ câu hỏi 1-1 theo kỳ đánh giá; kỳ chưa cấu hình → dùng bộ mặc định.
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_ONE_ON_ONE_QUESTIONS, type OneOnOneQuestion } from '@/lib/oneOnOneDefaults';

export async function loadOneOnOneQuestions(cycleId: string | null | undefined): Promise<OneOnOneQuestion[]> {
  if (!cycleId) return DEFAULT_ONE_ON_ONE_QUESTIONS;
  const { data, error } = await supabase
    .from('one_on_one_questions')
    .select('question_key, question_text, sort_order, is_active')
    .eq('cycle_id', cycleId)
    .eq('is_active', true)
    .order('sort_order');
  if (error || !data?.length) return DEFAULT_ONE_ON_ONE_QUESTIONS;
  return data.map((r) => ({ key: r.question_key, text: r.question_text }));
}
