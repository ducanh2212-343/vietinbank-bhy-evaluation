// Khối "Cần xử lý trong kỳ" trên Tổng quan của lãnh đạo (TP/PGĐ/BGĐ/TCTH).
// Tách bạch "toàn bộ bản ghi trong phạm vi" (VD: 103 cán bộ) với "việc thực sự
// đến lượt xử lý": chưa nộp phiếu → chờ TP rà soát → chờ PGĐ duyệt → đã duyệt.
// Kỳ hiện tại = kỳ phủ ngày hôm nay; nếu không có thì kỳ in_progress mới nhất.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { ClipboardList, FileWarning, UserCheck, BadgeCheck, Hourglass } from 'lucide-react';

interface CycleRow { id: string; name: string; start_date: string; end_date: string; status: string }

interface PipelineStats {
  cycleName: string;
  deadline: string;      // dd/mm/yyyy
  overdue: boolean;      // đã quá end_date mà kỳ vẫn in_progress
  totalStaff: number;
  notSubmitted: number;  // chưa có phiếu hoặc còn nháp
  waitingReview: number; // submitted — chờ TP rà soát
  waitingApprove: number;// reviewed — chờ PGĐ phê duyệt
  approved: number;
}

function pickCurrentCycle(cycles: CycleRow[]): CycleRow | null {
  if (!cycles.length) return null;
  // Vận hành thực tế: admin mở/đóng kỳ thủ công — kỳ Quý II có thể đánh giá vào đầu
  // tháng 7 (ngày trên kỳ chỉ là nhãn quý). Vì vậy ƯU TIÊN kỳ in_progress MỚI NHẤT;
  // không có kỳ nào mở thì rơi về kỳ mới nhất theo ngày để khối không trống.
  const inProgress = cycles.filter(c => c.status === 'in_progress');
  const pool = inProgress.length ? inProgress : cycles;
  return [...pool].sort((a, b) => b.start_date.localeCompare(a.start_date))[0];
}

export function EvaluationPipelineCard() {
  const { scope, visibleDeptIds, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<PipelineStats | null>(null);

  useEffect(() => {
    if (authLoading || scope === 'self') return;
    const load = async () => {
      const { data: cycles } = await supabase
        .from('evaluation_cycles')
        .select('id, name, start_date, end_date, status');
      const cycle = pickCurrentCycle((cycles as CycleRow[]) || []);
      if (!cycle) return;

      let profilesQuery = supabase.from('profiles').select('id').eq('status', 'active');
      if (scope !== 'all' && visibleDeptIds.length > 0) {
        profilesQuery = profilesQuery.in('department_id', visibleDeptIds);
      }
      const [{ data: profs }, { data: subs }] = await Promise.all([
        profilesQuery,
        supabase.from('form_submissions').select('employee_id, status').eq('cycle_id', cycle.id),
      ]);
      const staffIds = new Set((profs || []).map((p: any) => p.id));
      // Mỗi cán bộ lấy trạng thái "tiến xa nhất" (approved > reviewed > submitted > draft)
      const rank: Record<string, number> = { draft: 1, submitted: 2, reviewed: 3, approved: 4 };
      const best = new Map<string, string>();
      (subs || []).forEach((s: any) => {
        if (!staffIds.has(s.employee_id)) return;
        const prev = best.get(s.employee_id);
        if (!prev || (rank[s.status] || 0) > (rank[prev] || 0)) best.set(s.employee_id, s.status);
      });
      let notSubmitted = 0, waitingReview = 0, waitingApprove = 0, approved = 0;
      staffIds.forEach(id => {
        const st = best.get(id);
        if (!st || st === 'draft') notSubmitted++;
        else if (st === 'submitted') waitingReview++;
        else if (st === 'reviewed') waitingApprove++;
        else if (st === 'approved') approved++;
      });
      const today = new Date().toISOString().slice(0, 10);
      setStats({
        cycleName: cycle.name,
        deadline: new Date(cycle.end_date).toLocaleDateString('vi-VN'),
        overdue: cycle.status === 'in_progress' && today > cycle.end_date,
        totalStaff: staffIds.size,
        notSubmitted, waitingReview, waitingApprove, approved,
      });
    };
    load();
  }, [authLoading, scope, visibleDeptIds]);

  if (!stats) return null;

  const tiles = [
    {
      label: 'Chưa nộp phiếu', value: stats.notSubmitted, icon: FileWarning,
      to: '/bao-cao-nop-bieu-mau', tone: stats.notSubmitted > 0 ? 'text-destructive' : 'text-muted-foreground',
    },
    {
      label: 'Chờ TP rà soát', value: stats.waitingReview, icon: Hourglass,
      to: '/danh-gia-can-bo', tone: stats.waitingReview > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
    },
    {
      label: 'Chờ PGĐ duyệt', value: stats.waitingApprove, icon: UserCheck,
      to: '/danh-gia-can-bo', tone: stats.waitingApprove > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
    },
    {
      label: 'Đã duyệt', value: stats.approved, icon: BadgeCheck,
      to: '/bao-cao', tone: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex flex-wrap items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Cần xử lý trong kỳ {stats.cycleName}
          <span className="text-xs font-normal text-muted-foreground">
            · {stats.totalStaff} cán bộ trong phạm vi · hạn nộp {stats.deadline}
          </span>
          {stats.overdue && <Badge variant="destructive">Quá hạn nộp</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tiles.map(t => (
            <Link
              key={t.label}
              to={t.to}
              className="rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t.label}</span>
                <t.icon className={`w-4 h-4 ${t.tone}`} />
              </div>
              <p className={`text-2xl font-bold mt-1 ${t.tone}`}>{t.value}</p>
            </Link>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Danh sách cán bộ đầy đủ là bản ghi để theo dõi toàn cảnh — chỉ các ô trên mới là việc đang chờ xử lý theo từng cấp.
        </p>
      </CardContent>
    </Card>
  );
}
