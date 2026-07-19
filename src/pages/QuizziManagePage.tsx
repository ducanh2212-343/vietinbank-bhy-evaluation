import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Building2, EyeOff, Loader2, MonitorPlay, Pencil, Play, Plus, Trophy, Users2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getVnWeekStart, formatWeekLabel } from '@/lib/quizzi';

interface QuizRow {
  id: string;
  title: string;
  source_ref: string | null;
  status: string;
  week_start: string;
  created_by: string;
}

interface SessionRow {
  id: string;
  quiz_id: string;
  status: string;
  scope: string;
  anonymous: boolean;
  created_at: string;
  finished_at: string | null;
}

/**
 * Quản trị Quizzi (Quản trị đội ngũ): mở và điều hành phiên Quizzi tại cuộc
 * họp phòng / giao ban chi nhánh, theo dõi phiên đang sống và kết quả các
 * phiên gần đây.
 */
export default function QuizziManagePage() {
  const { profileId, isManager, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [openTarget, setOpenTarget] = useState<QuizRow | null>(null);
  const [scope, setScope] = useState<'department' | 'branch'>('department');
  const [anonymous, setAnonymous] = useState(false);
  const [acting, setActing] = useState(false);

  const thisWeek = getVnWeekStart();

  const load = useCallback(async () => {
    const [quizRes, sessRes] = await Promise.all([
      supabase.from('quizzes').select('id, title, source_ref, status, week_start, created_by')
        .eq('week_start', thisWeek).order('created_at', { ascending: false }),
      supabase.from('quiz_live_sessions')
        .select('id, quiz_id, status, scope, anonymous, created_at, finished_at')
        .order('created_at', { ascending: false }).limit(20),
    ]);
    setQuizzes((quizRes.data || []) as QuizRow[]);
    setSessions((sessRes.data || []) as SessionRow[]);
    setLoading(false);
  }, [thisWeek]);

  useEffect(() => { load(); }, [load]);

  const openSession = async () => {
    if (!openTarget) return;
    setActing(true);
    const { data, error } = await supabase.rpc('quiz_live_open', {
      _quiz_id: openTarget.id, _scope: scope, _anonymous: anonymous,
    });
    setActing(false);
    if (error) { toast.error(error.message); return; }
    const payload = data as any;
    if (payload.existing) toast.info('Quiz này đang có phiên mở — vào điều hành tiếp');
    else toast.success('Đã mở sảnh chờ — mời mọi người vào!');
    navigate(`/quizzi/live/${payload.session_id}/dieu-hanh`);
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  const activeByQuiz = new Map(
    sessions.filter((s) => s.status === 'lobby' || s.status === 'running').map((s) => [s.quiz_id, s]),
  );
  const recentFinished = sessions.filter((s) => s.status === 'finished').slice(0, 8);
  const quizTitle = new Map(quizzes.map((q) => [q.id, q.title]));

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MonitorPlay className="w-5 h-5 text-primary" /> Quản trị Quizzi
          </h1>
          <p className="text-sm text-muted-foreground">
            Mở Quizzi tại cuộc họp phòng hoặc giao ban chi nhánh — {formatWeekLabel(thisWeek)}.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/quizzi/tao-moi')}>
          <Plus className="w-4 h-4 mr-1" /> Tạo quiz
        </Button>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold">Quiz tuần này của phòng</h2>
        {quizzes.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
            Tuần này phòng chưa có quiz — tạo quiz trước rồi mở tại cuộc họp.
          </CardContent></Card>
        ) : (
          quizzes.map((q) => {
            const live = activeByQuiz.get(q.id);
            const canHost = q.created_by === profileId || isManager || isAdmin;
            return (
              <Card key={q.id} className={live ? 'border-primary/50' : undefined}>
                <CardContent className="py-4 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{q.title}</p>
                      {q.status === 'unpublished' && <Badge variant="outline">Đã gỡ</Badge>}
                      {live && (
                        <Badge className="gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/70" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                          </span>
                          {live.status === 'lobby' ? 'Sảnh chờ đang mở' : 'Đang diễn ra'}
                        </Badge>
                      )}
                    </div>
                    {q.source_ref && <p className="text-xs text-muted-foreground">Nguồn: {q.source_ref}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/quizzi/${q.id}/ket-qua`}><Trophy className="w-4 h-4 mr-1" /> Xếp hạng tuần</Link>
                    </Button>
                    {live ? (
                      <Button size="sm" onClick={() => navigate(`/quizzi/live/${live.id}/dieu-hanh`)}>
                        <MonitorPlay className="w-4 h-4 mr-1" /> Điều hành
                      </Button>
                    ) : canHost && q.status === 'published' ? (
                      <Button size="sm" onClick={() => {
                        setOpenTarget(q); setScope('department'); setAnonymous(false);
                      }}>
                        <Play className="w-4 h-4 mr-1" /> Mở tại cuộc họp
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {recentFinished.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Phiên gần đây</h2>
          {recentFinished.map((s) => (
            <Card key={s.id}>
              <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{quizTitle.get(s.quiz_id) || 'Quiz tuần trước'}</p>
                  {s.scope === 'branch' && <Badge variant="secondary" className="gap-1"><Building2 className="w-3 h-3" /> Giao ban</Badge>}
                  {s.anonymous && <Badge variant="outline" className="gap-1"><EyeOff className="w-3 h-3" /> Ẩn danh</Badge>}
                  <span className="text-xs text-muted-foreground">
                    {s.finished_at ? new Date(s.finished_at).toLocaleString('vi-VN') : ''}
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/quizzi/live/${s.id}/dieu-hanh`)}>
                  <Trophy className="w-4 h-4 mr-1" /> Kết quả
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!openTarget} onOpenChange={(o) => { if (!o) setOpenTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mở Quizzi tại cuộc họp — "{openTarget?.title}"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phạm vi tham gia</Label>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as 'department' | 'branch')} className="gap-2">
                <label className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer">
                  <RadioGroupItem value="department" className="mt-0.5" />
                  <span className="text-sm">
                    <span className="font-medium flex items-center gap-1.5"><Users2 className="w-4 h-4" /> Họp phòng</span>
                    <span className="text-xs text-muted-foreground">Chỉ thành viên phòng vào được sảnh</span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer">
                  <RadioGroupItem value="branch" className="mt-0.5" />
                  <span className="text-sm">
                    <span className="font-medium flex items-center gap-1.5"><Building2 className="w-4 h-4" /> Giao ban chi nhánh</span>
                    <span className="text-xs text-muted-foreground">
                      Cán bộ mọi phòng vào được — dành cho quiz cán bộ chủ chốt tại giao ban tuần
                    </span>
                  </span>
                </label>
              </RadioGroup>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-1.5"><EyeOff className="w-4 h-4" /> Ẩn danh người chơi</Label>
                <p className="text-xs text-muted-foreground">
                  Hệ thống tự đặt biệt danh vui ("Đại Bàng Thần Tốc"…) — không ai biết ai, thoải mái thi đấu.
                </p>
              </div>
              <Switch checked={anonymous} onCheckedChange={setAnonymous} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpenTarget(null)}>Huỷ</Button>
              <Button onClick={openSession} disabled={acting}>
                {acting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                <Play className="w-4 h-4 mr-1" /> Mở sảnh chờ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
