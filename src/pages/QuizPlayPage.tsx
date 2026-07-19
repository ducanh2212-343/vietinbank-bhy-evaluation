import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle2, Loader2, PartyPopper, Timer, Trophy, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDurationMs } from '@/lib/quizzi';
import { getBadgeVisual } from '@/lib/quizziBadges';

interface QuestionPayload {
  id: string;
  statement: string;
  options: string[];
}

interface StepState {
  question: QuestionPayload;
  index: number;
  total: number;
  seconds: number;
}

interface Feedback {
  is_correct: boolean;
  timed_out: boolean;
  correct_index: number;
  explanation: string | null;
  points: number;
}

interface Summary {
  score: number;
  correct_count: number;
  total_questions: number;
  total_time_ms: number;
  new_badges: { code: string; name: string; description: string | null }[];
}

/**
 * Flow làm bài kiểu Duolingo: mỗi lần chỉ một câu (server phát), đồng hồ đếm
 * lùi mỗi câu, chọn đáp án → feedback tức thì (đúng/sai + giải thích + điểm)
 * → câu kế tiếp → màn kết thúc ăn mừng. Server chấm toàn bộ.
 */
export default function QuizPlayPage() {
  const { id: quizId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<'loading' | 'question' | 'feedback' | 'done' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [step, setStep] = useState<StepState | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [nextStep, setNextStep] = useState<StepState | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startTimer = useCallback((seconds: number) => {
    clearTimer();
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearTimer(); return 0; }
        return t - 1;
      });
    }, 1000);
  }, []);

  // Hết giờ ở màn câu hỏi → nộp "không chọn" (server ghi timeout)
  useEffect(() => {
    if (phase === 'question' && timeLeft === 0 && step && !submitting) {
      submitAnswer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  useEffect(() => {
    if (!quizId) return;
    (async () => {
      const { data, error } = await supabase.rpc('quiz_start_attempt', { _quiz_id: quizId });
      if (error) {
        setErrorMsg(error.message || 'Không bắt đầu được lượt làm');
        setPhase('error');
        return;
      }
      const payload = data as any;
      setAttemptId(payload.attempt_id);
      const s: StepState = {
        question: payload.question,
        index: payload.index,
        total: payload.total,
        seconds: payload.seconds,
      };
      setStep(s);
      setPhase('question');
      startTimer(s.seconds);
      if (payload.resumed) toast.info('Tiếp tục lượt làm dở dang');
    })();
    return clearTimer;
  }, [quizId, startTimer]);

  const submitAnswer = async (index: number | null) => {
    if (!attemptId || submitting) return;
    setSubmitting(true);
    clearTimer();
    setSelected(index);
    const { data, error } = await supabase.rpc('quiz_answer_question', {
      _attempt_id: attemptId,
      _selected_index: index,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || 'Không gửi được câu trả lời');
      return;
    }
    const payload = data as any;
    setFeedback({
      is_correct: payload.is_correct,
      timed_out: payload.timed_out,
      correct_index: payload.correct_index,
      explanation: payload.explanation,
      points: payload.points,
    });
    if (payload.done) {
      setSummary(payload.summary as Summary);
      setNextStep(null);
    } else {
      setNextStep({
        question: payload.next.question,
        index: payload.next.index,
        total: payload.next.total,
        seconds: payload.next.seconds,
      });
    }
    setPhase('feedback');
  };

  const goNext = () => {
    setFeedback(null);
    setSelected(null);
    if (nextStep) {
      setStep(nextStep);
      setNextStep(null);
      setPhase('question');
      startTimer(nextStep.seconds);
    } else {
      setPhase('done');
    }
  };

  if (phase === 'loading') {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang chuẩn bị quiz…</div>;
  }

  if (phase === 'error') {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Button variant="outline" onClick={() => navigate('/quizzi')}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Về Quizzi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === 'done' && summary) {
    const pct = summary.total_questions > 0
      ? Math.round((summary.correct_count / summary.total_questions) * 100) : 0;
    return (
      <div className="p-4 md:p-6 max-w-md mx-auto">
        <Card>
          <CardContent className="py-8 flex flex-col items-center gap-4 text-center">
            <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
              <PartyPopper className="w-7 h-7 text-primary" />
            </span>
            <div>
              <h2 className="text-xl font-bold brand-gradient-text">Hoàn thành!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Bạn đã giữ nhịp học tuần này — chuỗi vẫn cháy 🔥
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full">
              <div className="rounded-lg bg-muted/60 py-3">
                <p className="text-2xl font-bold">{summary.score}</p>
                <p className="text-[11px] text-muted-foreground">điểm</p>
              </div>
              <div className="rounded-lg bg-muted/60 py-3">
                <p className="text-2xl font-bold">{summary.correct_count}/{summary.total_questions}</p>
                <p className="text-[11px] text-muted-foreground">câu đúng ({pct}%)</p>
              </div>
              <div className="rounded-lg bg-muted/60 py-3">
                <p className="text-2xl font-bold">{formatDurationMs(summary.total_time_ms)}</p>
                <p className="text-[11px] text-muted-foreground">thời gian</p>
              </div>
            </div>
            {summary.new_badges.length > 0 && (
              <div className="w-full space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Huy hiệu mới mở khoá</p>
                <div className="flex justify-center gap-3 flex-wrap">
                  {summary.new_badges.map((b) => {
                    const visual = getBadgeVisual(b.code);
                    const Icon = visual.icon;
                    return (
                      <div key={b.code} className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${visual.bgClass} skill-art-pop`}>
                          <Icon className={`w-6 h-6 ${visual.colorClass}`} />
                        </span>
                        <span className="text-[10px] font-medium max-w-[80px] leading-tight">{b.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => navigate('/quizzi')}>
                Về Quizzi
              </Button>
              <Button className="flex-1" onClick={() => navigate(`/quizzi/${quizId}/ket-qua`)}>
                <Trophy className="w-4 h-4 mr-1" /> Xem xếp hạng
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!step) return null;
  const inFeedback = phase === 'feedback' && feedback !== null;
  const q = step.question;
  const progressPct = ((step.index - (inFeedback ? 0 : 1)) / step.total) * 100;
  const timerPct = step.seconds > 0 ? (timeLeft / step.seconds) * 100 : 0;

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/quizzi')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Progress value={progressPct} className="flex-1 h-2.5" />
        <span className="text-xs font-medium text-muted-foreground shrink-0">
          {step.index}/{step.total}
        </span>
      </div>

      {!inFeedback && (
        <div className="flex items-center gap-2">
          <Timer className={`w-4 h-4 ${timeLeft <= 5 ? 'text-red-500' : 'text-muted-foreground'}`} />
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? 'bg-red-500' : 'bg-primary'}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
          <span className={`text-sm font-semibold tabular-nums ${timeLeft <= 5 ? 'text-red-500' : ''}`}>
            {timeLeft}s
          </span>
        </div>
      )}

      <Card>
        <CardContent className="py-5 space-y-4">
          <p className="font-semibold text-base leading-relaxed">{q.statement}</p>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              let cls = 'border-muted-foreground/20 hover:border-primary/60 hover:bg-primary/5';
              if (inFeedback && feedback) {
                if (i === feedback.correct_index) {
                  cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
                } else if (i === selected && !feedback.is_correct) {
                  cls = 'border-red-400 bg-red-50 dark:bg-red-950/40';
                } else {
                  cls = 'border-muted-foreground/10 opacity-60';
                }
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={inFeedback || submitting}
                  onClick={() => submitAnswer(i)}
                  className={`w-full text-left rounded-lg border-2 px-4 py-3 text-sm transition-colors flex items-center gap-3 ${cls}`}
                >
                  <span className="inline-flex shrink-0 items-center justify-center w-7 h-7 rounded-full bg-muted text-xs font-semibold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {inFeedback && feedback && i === feedback.correct_index && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  )}
                  {inFeedback && feedback && i === selected && !feedback.is_correct && (
                    <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {inFeedback && feedback && (
        <Card className={feedback.is_correct ? 'border-emerald-400' : 'border-red-300'}>
          <CardContent className="py-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className={`font-bold text-sm inline-flex items-center gap-1.5 ${feedback.is_correct ? 'text-emerald-600' : 'text-red-500'}`}>
                {feedback.is_correct
                  ? (<><CheckCircle2 className="w-4 h-4" /> Chính xác!</>)
                  : feedback.timed_out
                    ? (<><XCircle className="w-4 h-4" /> Hết giờ mất rồi</>)
                    : (<><XCircle className="w-4 h-4" /> Chưa đúng</>)}
              </p>
              {feedback.points > 0 && (
                <span className="text-sm font-bold text-primary">+{feedback.points} điểm</span>
              )}
            </div>
            {feedback.explanation && (
              <p className="text-sm text-muted-foreground">{feedback.explanation}</p>
            )}
            <Button className="w-full mt-1" onClick={goNext} autoFocus>
              {nextStep ? 'Câu tiếp theo →' : 'Xem kết quả 🎉'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
