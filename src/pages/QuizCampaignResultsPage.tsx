import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, BarChart3, CheckCircle2, EyeOff, Loader2, Users2, XCircle,
} from 'lucide-react';
import { formatDurationMs } from '@/lib/quizzi';

interface QuestionStat {
  question_id: string;
  statement: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  answered: number;
  correct: number;
  wrong: number;
  timeouts: number;
  pct_correct: number;
  distribution: number[];
}

interface Results {
  campaign: {
    id: string; title: string; status: string;
    anonymous_results: boolean; question_pool_size: number | null;
    shuffle_options: boolean; is_organizer: boolean;
  };
  my_result: {
    score: number; correct_count: number; total_questions: number;
    total_time_ms: number; attempt_id: string;
  } | null;
  totals: { completed: number; in_progress: number; avg_score: number; avg_correct_pct: number };
  departments: { name: string; members: number; completed: number; pct: number }[];
  question_stats?: QuestionStat[];
  participants?: {
    full_name: string; department: string | null; score: number;
    correct_count: number; total_questions: number; total_time_ms: number;
  }[];
}

interface ReviewQuestion {
  statement: string;
  options: string[];
  correct_index: number;
  selected_index: number | null;
  explanation: string | null;
  is_correct: boolean;
  elapsed_ms: number;
  points: number;
}

/**
 * Tổng hợp kết quả chiến dịch kiểu Wooclap/Mentimeter: câu sai nhiều nhất lên
 * đầu, phân bố lựa chọn từng phương án, tham gia theo phòng. Ẩn danh nếu người
 * khởi tạo bật.
 */
export default function QuizCampaignResultsPage() {
  const { id: campaignId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Results | null>(null);
  const [review, setReview] = useState<{ questions: ReviewQuestion[] } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const load = useCallback(async () => {
    if (!campaignId) return;
    const { data, error } = await supabase.rpc('quiz_campaign_get_results', { _campaign_id: campaignId });
    if (error) {
      setErrorMsg(error.message || 'Không tải được kết quả');
      setLoading(false);
      return;
    }
    const r = data as unknown as Results;
    setResults(r);
    if (r.my_result?.attempt_id) {
      const { data: rev } = await supabase.rpc('quiz_campaign_get_review', { _attempt_id: r.my_result.attempt_id });
      if (rev) setReview(rev as any);
    }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }
  if (errorMsg || !results) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card><CardContent className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button variant="outline" onClick={() => navigate('/quizzi/chien-dich')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  const c = results.campaign;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/quizzi/chien-dich')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Chiến dịch
        </Button>
        <h1 className="text-lg font-bold truncate">{c.title}</h1>
        {c.anonymous_results && (
          <Badge variant="outline" className="gap-1"><EyeOff className="w-3 h-3" /> Ẩn danh</Badge>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">{results.totals.completed}</p>
          <p className="text-[11px] text-muted-foreground">người hoàn thành</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">{results.totals.avg_correct_pct}%</p>
          <p className="text-[11px] text-muted-foreground">tỷ lệ đúng TB</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          <p className="text-2xl font-bold">{results.totals.avg_score}</p>
          <p className="text-[11px] text-muted-foreground">điểm TB</p>
        </CardContent></Card>
        <Card><CardContent className="py-3 text-center">
          {results.my_result ? (
            <>
              <p className="text-2xl font-bold text-primary">{results.my_result.score}</p>
              <p className="text-[11px] text-muted-foreground">
                điểm của tôi ({results.my_result.correct_count}/{results.my_result.total_questions} đúng)
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-muted-foreground">—</p>
              <p className="text-[11px] text-muted-foreground">tôi chưa làm</p>
            </>
          )}
        </CardContent></Card>
      </div>

      <Tabs defaultValue={results.question_stats ? 'thongke' : 'phong'}>
        <TabsList>
          {results.question_stats && (
            <TabsTrigger value="thongke"><BarChart3 className="w-4 h-4 mr-1" /> Thống kê câu hỏi</TabsTrigger>
          )}
          <TabsTrigger value="phong"><Users2 className="w-4 h-4 mr-1" /> Theo phòng</TabsTrigger>
          {review && <TabsTrigger value="bailam">Bài làm của tôi</TabsTrigger>}
          {results.participants && <TabsTrigger value="canhan">Người tham gia</TabsTrigger>}
        </TabsList>

        {results.question_stats && (
          <TabsContent value="thongke" className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Sắp xếp theo tỷ lệ đúng tăng dần — câu trên cùng là câu cả chi nhánh hay sai nhất,
              nên đưa vào nội dung đào tạo tiếp theo.
            </p>
            {results.question_stats.map((q, qi) => {
              const maxCount = Math.max(1, ...q.distribution);
              return (
                <Card key={q.question_id} className={q.pct_correct < 50 ? 'border-red-300/70' : undefined}>
                  <CardContent className="py-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold">{qi + 1}. {q.statement}</p>
                      <span className={`shrink-0 text-sm font-bold ${q.pct_correct < 50 ? 'text-red-500' : q.pct_correct < 80 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {q.pct_correct}% đúng
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => {
                        const count = q.distribution[oi] ?? 0;
                        const isCorrect = oi === q.correct_index;
                        const pct = q.answered > 0 ? Math.round((100 * count) / q.answered) : 0;
                        return (
                          <div key={oi} className="flex items-center gap-2">
                            <span className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold
                              ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-xs truncate ${isCorrect ? 'font-medium' : ''}`}>{opt}</span>
                                <span className="text-[11px] text-muted-foreground shrink-0">{count} ({pct}%)</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted overflow-hidden mt-0.5">
                                <div
                                  className={`h-full rounded-full ${isCorrect ? 'bg-emerald-500' : 'bg-red-400/70'}`}
                                  style={{ width: `${(count / maxCount) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {q.timeouts > 0 && (
                        <p className="text-[11px] text-muted-foreground">⏱ {q.timeouts} lượt hết giờ (tính là sai)</p>
                      )}
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">{q.explanation}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        )}

        <TabsContent value="phong" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Tỷ lệ tham gia theo phòng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {results.departments.map((d) => (
                <div key={d.name} className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium truncate">{d.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {d.completed}/{d.members} ({d.pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${d.pct}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {review && (
          <TabsContent value="bailam" className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              Đề của riêng bạn{c.shuffle_options ? ' (thứ tự đáp án hiển thị như lúc bạn làm)' : ''}.
            </p>
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
                      <p key={oi} className={`text-sm px-2 py-1 rounded
                        ${oi === q.correct_index ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-medium' : ''}
                        ${oi === q.selected_index && oi !== q.correct_index ? 'bg-red-50 dark:bg-red-950/40 text-red-600 line-through' : ''}`}>
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

        {results.participants && (
          <TabsContent value="canhan" className="mt-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Người tham gia ({results.participants.length})</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Chỉ người tổ chức thấy danh sách này. Chiến dịch ẩn danh sẽ không có mục này.
                </p>
              </CardHeader>
              <CardContent className="space-y-1">
                {results.participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm even:bg-muted/40">
                    <span className="w-6 text-center text-xs text-muted-foreground shrink-0">{i + 1}</span>
                    <span className="flex-1 font-medium truncate">{p.full_name}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{p.department || ''}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {p.correct_count}/{p.total_questions} · {formatDurationMs(p.total_time_ms)}
                    </span>
                    <span className="font-bold w-14 text-right shrink-0">{p.score}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
