import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CheckCircle2, Flame, Loader2, Pencil, Play, Plus, Trophy, Zap } from 'lucide-react';
import { StreakFlame } from '@/components/quizzi/StreakFlame';
import { QuizBadgeGrid } from '@/components/quizzi/QuizBadgeGrid';
import { QuizBadgeReveal } from '@/components/quizzi/QuizBadgeReveal';
import { getVnWeekStart, formatWeekLabel } from '@/lib/quizzi';

interface QuizRow {
  id: string;
  title: string;
  description: string | null;
  source_ref: string | null;
  skill_id: string | null;
  status: string;
  week_start: string;
  per_question_seconds: number;
  created_by: string;
  created_at: string;
}

interface MyStreak {
  current_streak: number;
  longest_streak: number;
  freezes_available: number;
  this_week_done: boolean;
}

interface DeptStreak {
  department_id: string;
  code: string | null;
  name: string;
  streak: number;
  this_week_published: boolean;
}

interface BranchDept {
  department_id: string;
  code: string | null;
  name: string;
  quizzes_published: number;
  members: number;
  participants: number;
  participation_pct: number;
  avg_score: number;
}

export default function QuizziHomePage() {
  const { profileId, departmentId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [myAttempts, setMyAttempts] = useState<Map<string, { status: string; score: number }>>(new Map());
  const [streak, setStreak] = useState<MyStreak | null>(null);
  const [deptStreaks, setDeptStreaks] = useState<DeptStreak[]>([]);
  const [branch, setBranch] = useState<BranchDept[]>([]);
  const [authorNames, setAuthorNames] = useState<Map<string, string>>(new Map());

  const thisWeek = getVnWeekStart();

  const load = useCallback(async () => {
    if (!profileId) return;
    const [quizRes, attemptRes, streakRes, deptStreakRes, branchRes] = await Promise.all([
      supabase.from('quizzes').select('*').order('week_start', { ascending: false }).order('created_at', { ascending: false }).limit(30),
      supabase.from('quiz_attempts').select('quiz_id, status, score').eq('profile_id', profileId),
      supabase.rpc('quiz_get_my_streak'),
      supabase.rpc('quiz_get_department_streaks'),
      supabase.rpc('quiz_get_branch_overview'),
    ]);
    const rows = (quizRes.data || []) as QuizRow[];
    setQuizzes(rows);
    setMyAttempts(new Map((attemptRes.data || []).map((a: any) => [a.quiz_id, { status: a.status, score: a.score }])));
    setStreak((streakRes.data as unknown as MyStreak) || null);
    setDeptStreaks(((deptStreakRes.data as unknown) || []) as DeptStreak[]);
    setBranch(((branchRes.data as unknown) || []) as BranchDept[]);

    const authorIds = [...new Set(rows.map((q) => q.created_by))];
    if (authorIds.length > 0) {
      const { data: authors } = await supabase.from('profiles').select('id, full_name').in('id', authorIds);
      setAuthorNames(new Map((authors || []).map((p) => [p.id, p.full_name])));
    }
    setLoading(false);
  }, [profileId]);

  useEffect(() => { load(); }, [load]);

  const myDeptStreak = useMemo(
    () => deptStreaks.find((d) => d.department_id === departmentId) || null,
    [deptStreaks, departmentId],
  );

  const thisWeekQuizzes = quizzes.filter((q) => q.week_start === thisWeek && q.status === 'published');
  const pastQuizzes = quizzes.filter((q) => q.week_start !== thisWeek);

  if (!profileId) {
    return <div className="p-6 text-sm text-muted-foreground">Đang tải hồ sơ…</div>;
  }
  if (!departmentId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Tài khoản của bạn chưa gắn với phòng nào nên chưa tham gia được Quizzi của phòng.
            Bạn vẫn xem được tổng quan toàn chi nhánh khi phong trào bắt đầu chạy.
          </CardContent>
        </Card>
      </div>
    );
  }
  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  const renderQuizCard = (q: QuizRow) => {
    const attempt = myAttempts.get(q.id);
    const isAuthor = q.created_by === profileId;
    const isThisWeek = q.week_start === thisWeek;
    return (
      <Card key={q.id}>
        <CardContent className="py-4 flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{q.title}</p>
              {q.status === 'unpublished' && <Badge variant="outline">Đã gỡ</Badge>}
              {!isThisWeek && <Badge variant="secondary">{formatWeekLabel(q.week_start)}</Badge>}
            </div>
            {q.source_ref && <p className="text-xs text-muted-foreground">Nguồn: {q.source_ref}</p>}
            <p className="text-xs text-muted-foreground">
              Soạn bởi {authorNames.get(q.created_by) || '—'} · {q.per_question_seconds}s/câu
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {attempt?.status === 'completed' ? (
              <>
                <span className="inline-flex items-center gap-1 text-sm text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> {attempt.score} điểm
                </span>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/quizzi/${q.id}/ket-qua`}><Trophy className="w-4 h-4 mr-1" /> Xếp hạng</Link>
                </Button>
              </>
            ) : isAuthor ? (
              <>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/quizzi/${q.id}/sua`}><Pencil className="w-4 h-4 mr-1" /> Sửa</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/quizzi/${q.id}/ket-qua`}><Trophy className="w-4 h-4 mr-1" /> Kết quả</Link>
                </Button>
              </>
            ) : isThisWeek && q.status === 'published' ? (
              <Button size="sm" onClick={() => navigate(`/quizzi/${q.id}`)}>
                <Play className="w-4 h-4 mr-1" /> Làm ngay
              </Button>
            ) : (
              <Button size="sm" variant="outline" asChild>
                <Link to={`/quizzi/${q.id}/ket-qua`}><Trophy className="w-4 h-4 mr-1" /> Xếp hạng</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <QuizBadgeReveal profileId={profileId} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Bắc Hưng Yên Quizzi
          </h1>
          <p className="text-sm text-muted-foreground">
            Mỗi tuần một quiz cùng phòng — học từ công văn, chủ điểm và skill. {formatWeekLabel(thisWeek)}.
          </p>
        </div>
        <Button onClick={() => navigate('/quizzi/tao-moi')}>
          <Plus className="w-4 h-4 mr-1" /> Tạo quiz cho phòng
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Chuỗi của tôi</CardTitle>
          </CardHeader>
          <CardContent>
            <StreakFlame
              streak={streak?.current_streak ?? 0}
              freezes={streak?.freezes_available ?? 0}
              thisWeekDone={streak?.this_week_done ?? false}
              size="lg"
            />
            {(streak?.longest_streak ?? 0) > (streak?.current_streak ?? 0) && (
              <p className="text-xs text-muted-foreground mt-2">Kỷ lục: {streak?.longest_streak} tuần</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Chuỗi của phòng</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center w-16 h-16 rounded-full
              ${myDeptStreak?.this_week_published ? 'bg-orange-100 dark:bg-orange-950/50' : 'bg-muted'}`}>
              <Flame className={`w-9 h-9 ${myDeptStreak?.this_week_published ? 'text-orange-500' : 'text-muted-foreground/40'}`} />
            </span>
            <div>
              <p className="text-3xl font-bold leading-none">{myDeptStreak?.streak ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                tuần liên tiếp phòng có quiz
                {myDeptStreak?.this_week_published ? ' · tuần này đã có ✅' : ' · tuần này chưa có quiz!'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="phong">
        <TabsList>
          <TabsTrigger value="phong">Quiz của phòng</TabsTrigger>
          <TabsTrigger value="huyhieu">Huy hiệu của tôi</TabsTrigger>
          <TabsTrigger value="chinhanh"><Building2 className="w-4 h-4 mr-1" /> Toàn chi nhánh</TabsTrigger>
        </TabsList>

        <TabsContent value="phong" className="space-y-3 mt-3">
          {thisWeekQuizzes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Tuần này phòng chưa có quiz nào. Ai cũng tạo được — người mở màn nhận huy hiệu "Người gieo hạt" 🌱
                </p>
                <Button onClick={() => navigate('/quizzi/tao-moi')}>
                  <Plus className="w-4 h-4 mr-1" /> Tạo quiz đầu tiên của tuần
                </Button>
              </CardContent>
            </Card>
          ) : (
            thisWeekQuizzes.map(renderQuizCard)
          )}
          {pastQuizzes.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground pt-2">Các tuần trước</p>
              {pastQuizzes.slice(0, 10).map(renderQuizCard)}
            </>
          )}
        </TabsContent>

        <TabsContent value="huyhieu" className="mt-3">
          <Card>
            <CardContent className="py-4">
              <QuizBadgeGrid profileId={profileId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chinhanh" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Phong trào Quizzi theo phòng — {formatWeekLabel(thisWeek)}</CardTitle>
              <p className="text-xs text-muted-foreground">
                Chỉ số liệu tổng hợp cấp phòng — Quizzi không xếp hạng cá nhân giữa các phòng.
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {branch.map((d) => {
                const ds = deptStreaks.find((x) => x.department_id === d.department_id);
                return (
                  <div key={d.department_id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.quizzes_published > 0
                          ? `${d.quizzes_published} quiz · ${d.participants}/${d.members} người đã làm (${d.participation_pct}%)`
                          : 'Tuần này chưa có quiz'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {d.quizzes_published > 0 && (
                        <span className="text-sm font-semibold">{d.avg_score} điểm TB</span>
                      )}
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-500">
                        <Flame className="w-4 h-4" /> {ds?.streak ?? 0}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
