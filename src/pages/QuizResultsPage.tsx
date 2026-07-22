import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, CheckCircle2, Loader2, Medal, Trophy, XCircle } from 'lucide-react';
import { formatDurationMs } from '@/lib/quizzi';

interface RankingRow {
  profile_id: string;
  full_name: string;
  score: number;
  correct_count: number;
  total_questions: number;
  total_time_ms: number;
  completed_at: string;
}

interface ReviewQuestion {
  statement: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  selected_index: number | null;
  is_correct: boolean;
  elapsed_ms: number;
  points: number;
}

interface Review {
  score: number;
  correct_count: number;
  total_questions: number;
  total_time_ms: number;
  questions: ReviewQuestion[];
}

const MEDAL_CLASSES = ['text-yellow-500', 'text-slate-400', 'text-orange-600'];

/**
 * Kết quả một quiz: xếp hạng TRONG PHÒNG (top 3 nổi bật, dòng của mình được
 * tô — không có styling "bét bảng") + tab xem lại bài làm của chính mình.
 */
export default function QuizResultsPage() {
  const { id: quizId } = useParams<{ id: string }>();
  const { profileId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quizTitle, setQuizTitle] = useState('');
  const [ranking, setRanking] = useState<RankingRow[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [rankingError, setRankingError] = useState('');

  const load = useCallback(async () => {
    if (!quizId) return;
    const [quizRes, rankRes] = await Promise.all([
      supabase.from('quizzes').select('title').eq('id', quizId).maybeSingle(),
      supabase.rpc('quiz_get_ranking', { _quiz_id: quizId }),
    ]);
    setQuizTitle(quizRes.data?.title || 'Quiz');
    if (rankRes.error) {
      setRankingError(rankRes.error.message || 'Không xem được xếp hạng');
    } else {
      setRanking(((rankRes.data as unknown) || []) as RankingRow[]);
    }
    // Bài làm của tôi (nếu đã hoàn thành)
    if (profileId) {
      const { data: myAttempt } = await supabase
        .from('quiz_attempts')
        .select('id, status')
        .eq('quiz_id', quizId)
        .eq('profile_id', profileId)
        .maybeSingle();
      if (myAttempt?.status === 'completed') {
        const { data: rev } = await supabase.rpc('quiz_get_attempt_review', { _attempt_id: myAttempt.id });
        if (rev) setReview(rev as unknown as Review);
      }
    }
    setLoading(false);
  }, [quizId, profileId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/quizzi')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Quizzi
        </Button>
        <h1 className="text-lg font-bold truncate">{quizTitle}</h1>
      </div>

      <Tabs defaultValue="xephang">
        <TabsList>
          <TabsTrigger value="xephang"><Trophy className="w-4 h-4 mr-1" /> Xếp hạng phòng</TabsTrigger>
          {review && <TabsTrigger value="bailam">Bài làm của tôi</TabsTrigger>}
        </TabsList>

        <TabsContent value="xephang" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Bảng kết quả nội bộ phòng</CardTitle>
              <p className="text-xs text-muted-foreground">
                Điểm = độ chính xác + tốc độ. Kết quả chỉ hiển thị trong phòng — cùng học, cùng vui.
              </p>
            </CardHeader>
            <CardContent>
              {rankingError ? (
                <p className="text-sm text-muted-foreground py-4">{rankingError}</p>
              ) : ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Chưa có ai hoàn thành quiz này.</p>
              ) : (
                <div className="space-y-1">
                  {ranking.map((r, i) => {
                    const isMe = r.profile_id === profileId;
                    return (
                      <div
                        key={r.profile_id}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2
                          ${isMe ? 'bg-primary/5 border border-primary/30' : i < 3 ? 'bg-muted/50' : ''}`}
                      >
                        <span className="w-7 text-center shrink-0">
                          {i < 3
                            ? <Medal className={`w-5 h-5 inline ${MEDAL_CLASSES[i]}`} />
                            : <span className="text-sm text-muted-foreground">{i + 1}</span>}
                        </span>
                        <span className="flex-1 text-sm font-medium truncate">
                          {r.full_name}{isMe && <Badge variant="outline" className="ml-2">Tôi</Badge>}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {r.correct_count}/{r.total_questions} đúng · {formatDurationMs(r.total_time_ms)}
                        </span>
                        <span className="text-sm font-bold w-16 text-right shrink-0">{r.score}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {review && (
          <TabsContent value="bailam" className="mt-3 space-y-3">
            {review.questions.map((q, i) => (
              <Card key={i} className={q.is_correct ? 'border-emerald-300/60' : 'border-red-300/60'}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">Câu {i + 1}. {q.statement}</p>
                    {q.is_correct
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                  </div>
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => (
                      <p
                        key={oi}
                        className={`text-sm px-2 py-1 rounded
                          ${oi === q.correct_index ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium' : ''}
                          ${oi === q.selected_index && oi !== q.correct_index ? 'bg-red-50 dark:bg-red-950/40 text-red-600 line-through' : ''}`}
                      >
                        {String.fromCharCode(65 + oi)}. {opt}
                        {oi === q.selected_index && ' ← bạn chọn'}
                      </p>
                    ))}
                    {q.selected_index === null && (
                      <p className="text-xs text-muted-foreground italic">Hết giờ — không chọn đáp án</p>
                    )}
                  </div>
                  {q.explanation && (
                    <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">{q.explanation}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDurationMs(q.elapsed_ms)} · +{q.points} điểm
                  </p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
