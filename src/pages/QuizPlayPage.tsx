import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { QuizPlayEngine } from '@/components/quizzi/QuizPlayEngine';
import { QuizPledgeGate } from '@/components/quizzi/QuizPledgeGate';

/** Làm quiz tuần của phòng — qua cổng cam kết EQ (nếu quiz yêu cầu) rồi vào engine. */
export default function QuizPlayPage() {
  const { id: quizId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<{ title: string; require_pledge: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pledged, setPledged] = useState(false);

  useEffect(() => {
    if (!quizId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('quizzes')
        .select('title, require_pledge').eq('id', quizId).maybeSingle();
      if (cancelled) return;
      setQuiz(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [quizId]);

  if (!quizId) return null;
  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  if (quiz?.require_pledge && !pledged) {
    return (
      <QuizPledgeGate
        quizTitle={quiz.title}
        onConfirm={() => setPledged(true)}
        onBack={() => navigate('/quizzi')}
      />
    );
  }

  return (
    <QuizPlayEngine
      start={() => supabase.rpc('quiz_start_attempt', { _quiz_id: quizId, _pledge_accepted: true })}
      answer={(attemptId, index) =>
        supabase.rpc('quiz_answer_question', { _attempt_id: attemptId, _selected_index: index })}
      backPath="/quizzi"
      resultsPath={`/quizzi/${quizId}/ket-qua`}
    />
  );
}
