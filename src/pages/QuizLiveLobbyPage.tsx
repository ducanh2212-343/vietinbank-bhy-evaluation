import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, EyeOff, Loader2, Users2 } from 'lucide-react';
import { QuizPlayEngine } from '@/components/quizzi/QuizPlayEngine';
import { QuizPledgeGate } from '@/components/quizzi/QuizPledgeGate';
import { QuizLiveBoard, LiveParticipant } from '@/components/quizzi/QuizLiveBoard';

interface LiveState {
  session: {
    id: string; status: string; scope: string; anonymous: boolean;
    quiz_id: string; quiz_title: string; total_questions: number;
    host_name: string; is_host: boolean;
  };
  me: { participant_id: string; nickname: string; attempt_id: string | null } | null;
  participants: LiveParticipant[];
}

/**
 * Màn người chơi phiên Quizzi live: cam kết EQ → vào sảnh (nhận biệt danh nếu
 * ẩn danh) → chờ chủ trì bấm Bắt đầu (poll 2s) → làm bài bằng engine chung →
 * xem bảng xếp hạng phiên.
 */
export default function QuizLiveLobbyPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<LiveState | null>(null);
  const [requirePledge, setRequirePledge] = useState<boolean | null>(null);
  const [pledged, setPledged] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [finishedPlaying, setFinishedPlaying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadState = useCallback(async () => {
    if (!sessionId) return null;
    const { data, error } = await supabase.rpc('quiz_live_get_state', { _session_id: sessionId });
    if (error) { setJoinError(error.message); return null; }
    const st = data as unknown as LiveState;
    setState(st);
    return st;
  }, [sessionId]);

  // Nạp trạng thái + require_pledge của quiz
  useEffect(() => {
    (async () => {
      const st = await loadState();
      if (!st) return;
      const { data: quiz } = await supabase.from('quizzes')
        .select('require_pledge').eq('id', st.session.quiz_id).maybeSingle();
      setRequirePledge(quiz?.require_pledge ?? false);
      if (st.me) { setJoined(true); setPledged(true); }
    })();
  }, [loadState]);

  // Poll khi đang ở sảnh/xem bảng điểm (không poll trong lúc làm bài)
  useEffect(() => {
    if (playing && !finishedPlaying) return;
    pollRef.current = setInterval(loadState, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadState, playing, finishedPlaying]);

  const join = useCallback(async () => {
    if (!sessionId) return;
    const { error } = await supabase.rpc('quiz_live_join', {
      _session_id: sessionId, _pledge_accepted: true,
    });
    if (error) { setJoinError(error.message); return; }
    setJoined(true);
    await loadState();
  }, [sessionId, loadState]);

  // Sau khi cam kết → join
  useEffect(() => {
    if (pledged && !joined && requirePledge !== null && !joinError) {
      join();
    }
  }, [pledged, joined, requirePledge, join, joinError]);

  if (!sessionId) return null;

  if (joinError) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card><CardContent className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{joinError}</p>
          <Button variant="outline" onClick={() => navigate('/quizzi')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Về Quizzi
          </Button>
        </CardContent></Card>
      </div>
    );
  }

  if (!state || requirePledge === null) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang vào phiên…</div>;
  }

  const s = state.session;

  // Cổng cam kết trước khi vào sảnh
  if (requirePledge && !pledged) {
    return (
      <QuizPledgeGate
        quizTitle={s.quiz_title}
        onConfirm={() => setPledged(true)}
        onBack={() => navigate('/quizzi')}
      />
    );
  }
  if (!joined) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang vào sảnh…</div>;
  }

  // Đang làm bài (phiên running, chưa xong)
  if (s.status === 'running' && playing && !finishedPlaying) {
    return (
      <QuizPlayEngine
        start={() => supabase.rpc('quiz_live_start_my_attempt', { _session_id: sessionId })}
        answer={(attemptId, index) =>
          supabase.rpc('quiz_answer_question', { _attempt_id: attemptId, _selected_index: index })}
        backPath={`/quizzi/live/${sessionId}`}
        resultsPath={`/quizzi/live/${sessionId}`}
        completionNote="Chờ cả phòng làm xong để xem Top nhé — bảng điểm đang cập nhật trực tiếp 🏁"
      />
    );
  }

  const iCompleted = state.participants.some((p) => p.is_me && p.completed);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/quizzi')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Quizzi
        </Button>
        <h1 className="text-lg font-bold truncate">{s.quiz_title}</h1>
        {s.anonymous && <Badge variant="outline" className="gap-1"><EyeOff className="w-3 h-3" /> Ẩn danh</Badge>}
      </div>

      {s.status === 'lobby' && (
        <Card className="border-primary/40">
          <CardContent className="py-8 text-center space-y-4">
            {state.me && (
              <div>
                <p className="text-xs text-muted-foreground">Bạn tham gia với tên</p>
                <p className="text-2xl font-bold brand-gradient-text">{state.me.nickname}</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Users2 className="w-4 h-4" /> {state.participants.length} người đã vào sảnh
            </div>
            <div className="flex items-center justify-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Chờ {s.host_name} bấm bắt đầu…
            </div>
          </CardContent>
        </Card>
      )}

      {s.status === 'running' && !iCompleted && (
        <Card className="border-primary/40">
          <CardContent className="py-8 text-center space-y-4">
            <p className="text-lg font-bold">Quizzi đã bắt đầu! 🚀</p>
            <Button size="lg" onClick={() => { setPlaying(true); setFinishedPlaying(false); }}>
              Vào làm bài ngay
            </Button>
          </CardContent>
        </Card>
      )}

      {(s.status === 'running' || s.status === 'finished') && (iCompleted || s.status === 'finished') && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {s.status === 'finished' ? '🏆 Kết quả chung cuộc' : 'Bảng điểm trực tiếp'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuizLiveBoard
              participants={state.participants}
              running={s.status === 'running'}
              showPodium={s.status === 'finished'}
            />
          </CardContent>
        </Card>
      )}

      {s.status === 'cancelled' && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Phiên đã bị hủy bởi người chủ trì.
        </CardContent></Card>
      )}
    </div>
  );
}
