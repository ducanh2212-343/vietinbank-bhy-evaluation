import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toDisplayStatus, getActorNeeded, type DisplayStatus } from './statusMap';
import { getEffectiveDeadline } from '@/lib/submissionKpi';

type ViewerRole = 'admin' | 'pgd' | 'manager' | 'none';

type Row = {
  display: DisplayStatus;
  actor: ReturnType<typeof getActorNeeded>;
  endDate: string | null;
  cycleId: string | null;
  cycleName: string;
};

type Props = {
  /** Override default action: nếu không truyền, click sẽ điều hướng sang /danh-gia-can-bo */
  onActionClick?: () => void;
};

export function ReviewerActionAlert({ onActionClick }: Props) {
  const navigate = useNavigate();
  const { isAdmin, isPgd, isManager, scope, visibleDeptIds, loading: authLoading } = useAuth();
  const viewerRole: ViewerRole = isAdmin ? 'admin' : isPgd ? 'pgd' : isManager ? 'manager' : 'none';

  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (viewerRole === 'none') { setLoaded(true); return; }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, viewerRole, scope, visibleDeptIds.join(',')]);

  async function load() {
    const { data: cyclesData } = await supabase
      .from('evaluation_cycles')
      .select('id, name, end_date, start_date, submission_deadline, status')
      .order('start_date', { ascending: false });

    let profilesQuery = supabase
      .from('profiles')
      .select('id, department_id, status')
      .neq('status', 'deleted');
    if (scope !== 'all' && visibleDeptIds.length > 0) {
      profilesQuery = profilesQuery.in('department_id', visibleDeptIds);
    }
    const [profilesRes, subsRes] = await Promise.all([
      profilesQuery,
      supabase
        .from('form_submissions')
        .select('id, employee_id, cycle_id, status, return_target, needs_manager_review_update, submitted_at, reviewed_at, returned_at, pgd_reviewed_at, updated_at'),
    ]);

    const profileIds = new Set((profilesRes.data || []).map((p) => p.id));
    const cycleMap = new Map((cyclesData || []).map((c) => [c.id, c]));
    // Kỳ đang làm việc = kỳ in_progress mới nhất (không lấy kỳ mới nhất theo ngày — có thể đã đóng)
    const activeCycle = (cyclesData || []).find((c: any) => c.status === 'in_progress') || (cyclesData || [])[0];

    // Latest submission per employee+cycle
    const subKey = (eid: string, cid: string) => `${eid}|${cid}`;
    const subMap = new Map<string, any>();
    (subsRes.data || []).forEach((s) => {
      if (!profileIds.has(s.employee_id)) return;
      const k = subKey(s.employee_id, s.cycle_id);
      const prev = subMap.get(k);
      if (!prev || new Date(s.updated_at) > new Date(prev.updated_at)) subMap.set(k, s);
    });

    const out: Row[] = [];
    for (const pid of profileIds) {
      const cyclesForEmp = new Set<string>();
      (subsRes.data || []).forEach((s) => {
        if (s.employee_id === pid && s.cycle_id) cyclesForEmp.add(s.cycle_id);
      });
      if (cyclesForEmp.size === 0 && activeCycle) cyclesForEmp.add(activeCycle.id);

      for (const cid of cyclesForEmp) {
        const sub = subMap.get(subKey(pid, cid)) || null;
        const cycle = cycleMap.get(cid);
        // Chỉ nhắc việc thuộc kỳ ĐANG MỞ — kỳ đã đóng (Quý I đã khóa, Quý III chưa tới đợt)
        // không còn/chưa có việc để xử lý, đếm vào chỉ gây nhiễu ("24 bản cần xử lý").
        if ((cycle as any)?.status !== 'in_progress') continue;
        const display = sub ? toDisplayStatus(sub) : 'not_started';
        out.push({
          display,
          actor: getActorNeeded(display),
          endDate: cycle ? getEffectiveDeadline(cycle).toISOString() : null,
          cycleId: cid,
          cycleName: cycle?.name || '—',
        });
      }
    }
    setRows(out);
    setLoaded(true);
  }

  const alert = useMemo(() => {
    const now = new Date();
    let pendingForMe = 0, resubmitted = 0, returnedManager = 0, overdue = 0, awaitingReview = 0;
    const cyclesWithWork = new Map<string, string>();
    rows.forEach((r) => {
      const mine =
        (viewerRole === 'manager' && r.actor === 'manager') ||
        (viewerRole === 'pgd' && r.actor === 'pgd') ||
        (viewerRole === 'admin' && r.actor !== 'done');
      if (mine) {
        pendingForMe++;
        if (r.cycleId) cyclesWithWork.set(r.cycleId, r.cycleName);
      }
      if (r.display === 'resubmitted') resubmitted++;
      if (r.display === 'returned_manager') returnedManager++;
      if (r.display === 'submitted' || r.display === 'resubmitted' || r.display === 'reviewed') awaitingReview++;
      if (r.endDate && new Date(r.endDate) < now && r.display !== 'approved' && r.display !== 'closed') overdue++;
    });
    return { pendingForMe, resubmitted, returnedManager, overdue, awaitingReview, cycleNames: Array.from(cyclesWithWork.values()) };
  }, [rows, viewerRole]);

  if (!loaded || viewerRole === 'none' || alert.pendingForMe === 0) return null;

  const handleClick = onActionClick || (() => navigate('/danh-gia-can-bo?focus=pending'));
  const hasOverdue = alert.overdue > 0;

  return (
    <div className={`rounded-lg border p-3 flex items-start gap-3 ${hasOverdue ? 'bg-destructive/5 border-destructive/40' : 'bg-amber-50 border-amber-300'}`}>
      <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${hasOverdue ? 'text-destructive' : 'text-amber-600'}`} />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-medium text-sm">
          Bạn có <span className="font-semibold">{alert.pendingForMe}</span> bản đánh giá cần xử lý
        </div>
        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5">
          {alert.awaitingReview > 0 && <span>• {alert.awaitingReview} bản chờ duyệt</span>}
          {alert.resubmitted > 0 && <span>• {alert.resubmitted} cán bộ đã gửi lại</span>}
          {alert.returnedManager > 0 && <span>• {alert.returnedManager} PGĐ trả lại</span>}
          {alert.overdue > 0 && <span className="text-destructive font-medium">• {alert.overdue} quá hạn</span>}
        </div>
        {alert.cycleNames.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Trong kỳ: <span className="font-medium text-foreground">{alert.cycleNames.join(', ')}</span>
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant={hasOverdue ? 'destructive' : 'outline'}
        className="shrink-0"
        onClick={handleClick}
      >
        Xem các bản cần xử lý
      </Button>
    </div>
  );
}
