import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { QuizPlayEngine } from '@/components/quizzi/QuizPlayEngine';

/** Làm quiz tuần của phòng — engine dùng chung với chiến dịch chi nhánh. */
export default function QuizPlayPage() {
  const { id: quizId } = useParams<{ id: string }>();
  if (!quizId) return null;
  return (
    <QuizPlayEngine
      start={() => supabase.rpc('quiz_start_attempt', { _quiz_id: quizId })}
      answer={(attemptId, index) =>
        supabase.rpc('quiz_answer_question', { _attempt_id: attemptId, _selected_index: index })}
      backPath="/quizzi"
      resultsPath={`/quizzi/${quizId}/ket-qua`}
    />
  );
}
