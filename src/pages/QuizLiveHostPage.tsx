import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Ban, EyeOff, Flag, Loader2, Play, Users2 } from 'lucide-react';
import { toast } from 'sonner';
import { QuizLiveBoard, LiveParticipant } from '@/components/quizzi/QuizLiveBoard';

interface LiveState {
  session: {
    id: string; status: string; scope: string; anonymous: boolean;
    quiz_id: string; quiz_title: string; total_questions: number;
    host_name: string; is_host: boolean; started_at: string | null; finished_at: string | null;
  };
  me: { participant_id: string; nickname: string; attempt_id: string | null } | null;
  participants: LiveParticipant[];
}

/**
 * Màn điều hành phiên Quizzi live (chủ trì cuộc họp): sảnh chờ hiện người tham
 * gia join theo thời gian thực (poll 2s), bấm Bắt đầu khi đủ người, theo dõi
 * leaderboard sống, Kết thúc → bục vinh danh Top 3.
 */
export default function QuizLiveHostPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<LiveState | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [acting, setActing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    const { data, error } = await supabase.rpc('quiz_live_get_state', { _session_id: sessionId });
    if (error) {
      setErrorMsg(error.message || 'Không tải được phiên');
      return;
    }
    setState(data as unknown as LiveState);
  }, [sessionId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const setStatus = async (status: string) => {
    if (!sessionId) return;
    setActing(true);
    const { error } = await supabase.rpc('quiz_live_set_status', { _session_id: sessionId, _status: status });
    setActing(false);
    if (error) { toast.error(error.message); return; }
    if (status === 'running') toast.success('Quizzi bắt đầu — mọi người vào bài! 🚀');
    if (status === 'finished') toast.success('Đã kết thúc phiên — công bố Top!');
    if (status === 'cancelled') { toast.info('Đã hủy phiên'); navigate('/quan-tri-quizzi'); return; }
    await load();
  };

  if (errorMsg) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <Card><CardContent className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button variant="outline" onClick={() => navigate('/quan-tri-quizzi')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
          </Button>
        </CardContent></Card>
      </div>
    );
  }
  if (!state) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải phiên…</div>;
  }

  const s = state.session;
  const joined = state.participants.length;
  const completed = state.participants.filter((p) => p.completed).length;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/quan-tri-quizzi')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Quản trị
        </Button>
        <h1 className="text-lg font-bold truncate">{s.quiz_title}</h1>
        <Badge variant={s.status === 'running' ? 'default' : 'outline'}>
          {s.status === 'lobby' ? 'Sảnh chờ' : s.status === 'running' ? 'Đang diễn ra' : s.status === 'finished' ? 'Đã kết thúc' : 'Đã hủy'}
        </Badge>
        {s.scope === 'branch' && <Badge variant="secondary">Giao ban chi nhánh</Badge>}
        {s.anonymous && <Badge variant="outline" className="gap-1"><EyeOff className="w-3 h-3" /> Ẩn danh</Badge>}
      </div>

      {s.status === 'lobby' && (
        <Card className="border-primary/40">
          <CardContent className="py-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Mời mọi người mở <b>BHY Quizzi</b> trên máy của mình — sẽ thấy nút
              <b> "Vào sảnh cuộc họp"</b>. {s.anonymous ? 'Phiên ẩn danh: hệ thống tự đặt biệt danh cho từng người.' : ''}
            </p>
            <div className="flex items-center justify-center gap-2">
              <Users2 className="w-6 h-6 text-primary" />
              <span className="text-4xl font-bold tabular-nums">{joined}</span>
              <span className="text-sm text-muted-foreground">người đã vào sảnh</span>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5 max-h-40 overflow-y-auto">
              {state.participants.map((p, i) => (
                <span key={i} className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium animate-in fade-in">
                  {p.nickname}
                </span>
              ))}
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" disabled={acting} onClick={() => setStatus('cancelled')}>
                <Ban className="w-4 h-4 mr-1" /> Hủy phiên
              </Button>
              <Button size="lg" disabled={acting || joined === 0} onClick={() => setStatus('running')}>
                <Play className="w-4 h-4 mr-1" /> Bắt đầu ({joined} người)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(s.status === 'running' || s.status === 'finished') && (
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">
              {s.status === 'running'
                ? `Bảng điểm trực tiếp — ${completed}/${joined} đã xong`
                : '🏆 Kết quả chung cuộc'}
            </CardTitle>
            {s.status === 'running' && (
              <Button size="sm" variant="outline" disabled={acting} onClick={() => setStatus('finished')}>
                <Flag className="w-4 h-4 mr-1" /> Kết thúc
              </Button>
            )}
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
    </div>
  );
}
