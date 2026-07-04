import { useEffect, useState } from 'react';
import { DEFAULT_ONE_ON_ONE_QUESTIONS, type OneOnOneQuestion } from '@/lib/oneOnOneDefaults';
import { loadOneOnOneQuestions } from '@/lib/oneOnOneQuestions';

/** Bộ câu hỏi 1-1 của kỳ đang chọn; kỳ chưa cấu hình → bộ mặc định. */
export function useCycleOneOnOneQuestions(cycleId: string | null | undefined): OneOnOneQuestion[] {
  const [questions, setQuestions] = useState<OneOnOneQuestion[]>(DEFAULT_ONE_ON_ONE_QUESTIONS);
  useEffect(() => {
    let cancelled = false;
    loadOneOnOneQuestions(cycleId).then((qs) => { if (!cancelled) setQuestions(qs); });
    return () => { cancelled = true; };
  }, [cycleId]);
  return questions;
}
