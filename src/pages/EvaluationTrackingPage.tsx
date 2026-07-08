import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Eye, ArrowRight, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { KpiCards } from '@/components/evaluation-tracking/KpiCards';
import { StatusBadge } from '@/components/evaluation-tracking/StatusBadge';
import {
  DisplayStatus, toDisplayStatus, getActorNeeded, ACTOR_LABEL,
} from '@/components/evaluation-tracking/statusMap';
import { ReviewerActionAlert } from '@/components/evaluation-tracking/ReviewerActionAlert';
import { getEffectiveDeadline } from '@/lib/submissionKpi';

type ViewerRole = 'admin' | 'pgd' | 'manager' | 'none';

function rowPriority(r: { display: DisplayStatus; actor: ReturnType<typeof getActorNeeded>; endDate: string | null }, viewer: ViewerRole, now: number): number {
  const isOverdue = !!r.endDate && new Date(r.endDate).getTime() < now && r.display !== 'approved' && r.display !== 'closed';
  const mineByActor =
    (viewer === 'manager' && r.actor === 'manager') ||
    (viewer === 'pgd' && r.actor === 'pgd') ||
    (viewer === 'admin' && r.actor !== 'done');
  if (mineByActor) return 1;
  if (isOverdue) return 2;
  if (r.display === 'resubmitted') return 3;
  if (r.display === 'returned_manager') return 4;
  if (r.display === 'approved' || r.display === 'closed') return 6;
  return 5;
}


type Row = {
  profileId: string;
  fullName: string;
  employeeCode: string | null;
  email: string | null;
  deptId: string | null;
  deptName: string;
  positionId: string | null;
  positionName: string;
  cycleId: string | null;
  cycleName: string;
  submissionId: string | null;
  rawStatus: string;
  display: DisplayStatus;
  actor: ReturnType<typeof getActorNeeded>;
  submittedAt: string | null;
  returnedAt: string | null;
  reviewedAt: string | null;
  endDate: string | null;
  gapCount: number | null;
  classification: string | null;
};

const EMPTY_COUNTS = (): Record<DisplayStatus, number> => ({
  not_started: 0, in_progress: 0, submitted: 0, resubmitted: 0,
  returned_employee: 0, returned_manager: 0, reviewed: 0, approved: 0, closed: 0,
});

export default function EvaluationTrackingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isPgd, isManager, roles, scope, visibleDeptIds, loading: authLoading } = useAuth();
  const canSeeTcthView = isAdmin; // bgd / tcth_admin / system_admin
  const viewerRoleEarly: ViewerRole = isAdmin ? 'admin' : isPgd ? 'pgd' : isManager ? 'manager' : 'none';

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [cycles, setCycles] = useState<{ id: string; name: string; end_date: string | null }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string }[]>([]);

  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<DisplayStatus | 'all' | 'overdue'>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  // Xuất gộp PDF hồ sơ toàn bộ phiếu đã phê duyệt của kỳ đang chọn
  const [bulkExporting, setBulkExporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  // Ref giữ intent focus=pending qua suốt vòng load() async (URL param có thể đã bị xoá)
  const focusPendingRef = useRef<boolean>(searchParams.get('focus') === 'pending');

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !isPgd && !isManager) {
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, scope, visibleDeptIds.join(',')]);

  // Áp filter "cần xử lý" khi điều hướng từ Tổng quan với ?focus=pending
  useEffect(() => {
    if (authLoading) return;
    if (searchParams.get('focus') !== 'pending') return;
    if (viewerRoleEarly === 'none') return;
    focusPendingRef.current = true;
    setCycleFilter('all');
    setStatusFilter('all');
    setActorFilter(viewerRoleEarly === 'admin' ? 'all' : viewerRoleEarly);
    const next = new URLSearchParams(searchParams);
    next.delete('focus');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, viewerRoleEarly, searchParams]);

  async function load() {
    setLoading(true);

    // 1. Cycles
    const { data: cyclesData } = await supabase
      .from('evaluation_cycles')
      .select('id, name, end_date, status, start_date, submission_deadline')
      .order('start_date', { ascending: false });
    setCycles(cyclesData || []);

    // 2. Profiles in scope
    let profilesQuery = supabase
      .from('profiles')
      .select('id, full_name, employee_code, email, department_id, position_id, status')
      .neq('status', 'deleted');
    if (scope !== 'all' && visibleDeptIds.length > 0) {
      profilesQuery = profilesQuery.in('department_id', visibleDeptIds);
    }
    const { data: profilesData } = await profilesQuery;
    const profiles = profilesData || [];

    const [deptsRes, posRes, subsRes, evalsRes] = await Promise.all([
      supabase.from('departments').select('id, name').eq('is_active', true),
      supabase.from('positions').select('id, name').eq('is_active', true),
      supabase
        .from('form_submissions')
        .select('id, employee_id, cycle_id, status, return_target, needs_manager_review_update, submitted_at, reviewed_at, returned_at, pgd_reviewed_at, updated_at'),
      supabase
        .from('admin_evaluations')
        .select('employee_id, cycle_id, classification, current_levels, target_levels'),
    ]);

    const depts = deptsRes.data || [];
    const pos = posRes.data || [];
    setDepartments(depts);
    setPositions(pos);
    const deptMap = new Map(depts.map((d) => [d.id, d.name]));
    const posMap = new Map(pos.map((p) => [p.id, p.name]));
    const cycleMap = new Map((cyclesData || []).map((c) => [c.id, c]));

    // 3. Submission lookup (latest per employee+cycle)
    const subKey = (eid: string, cid: string) => `${eid}|${cid}`;
    const subMap = new Map<string, any>();
    (subsRes.data || []).forEach((s) => {
      const k = subKey(s.employee_id, s.cycle_id);
      const prev = subMap.get(k);
      if (!prev || new Date(s.updated_at) > new Date(prev.updated_at)) subMap.set(k, s);
    });

    // 4. Eval lookup for GAP + classification
    const evalMap = new Map<string, any>();
    (evalsRes.data || []).forEach((e) => evalMap.set(subKey(e.employee_id, e.cycle_id || ''), e));

    // 5. Build rows: one per (employee × cycle) for any cycle with a submission, OR active cycle only if none
    const activeCycle = (cyclesData || [])[0]; // most recent by start_date desc
    const rowsOut: Row[] = [];
    for (const p of profiles) {
      // Determine which cycles to include for this employee
      const cyclesForEmp = new Set<string>();
      (subsRes.data || []).forEach((s) => {
        if (s.employee_id === p.id && s.cycle_id) cyclesForEmp.add(s.cycle_id);
      });
      if (cyclesForEmp.size === 0 && activeCycle) cyclesForEmp.add(activeCycle.id);

      for (const cid of cyclesForEmp) {
        const sub = subMap.get(subKey(p.id, cid)) || null;
        const cycle = cycleMap.get(cid);
        const display = sub ? toDisplayStatus(sub) : 'not_started';
        const actor = getActorNeeded(display);
        const ev = evalMap.get(subKey(p.id, cid));
        let gap: number | null = null;
        if (ev?.current_levels && ev?.target_levels) {
          const cur = ev.current_levels as number[];
          const tgt = ev.target_levels as number[];
          gap = cur.reduce((acc, v, i) => acc + ((tgt[i] ?? 0) > (v ?? 0) ? 1 : 0), 0);
        }
        rowsOut.push({
          profileId: p.id,
          fullName: p.full_name,
          employeeCode: p.employee_code,
          email: p.email,
          deptId: p.department_id,
          deptName: p.department_id ? deptMap.get(p.department_id) || '—' : '—',
          positionId: p.position_id,
          positionName: p.position_id ? posMap.get(p.position_id) || '—' : '—',
          cycleId: cid,
          cycleName: cycle?.name || '—',
          submissionId: sub?.id || null,
          rawStatus: sub?.status || 'draft',
          display,
          actor,
          submittedAt: sub?.submitted_at || null,
          returnedAt: sub?.returned_at || null,
          reviewedAt: sub?.reviewed_at || null,
          // "Hạn" = mốc nộp thiết đặt cho kỳ (fallback: 23:59 ngày kết thúc kỳ)
          endDate: cycle ? getEffectiveDeadline(cycle).toISOString() : null,
          gapCount: gap,
          classification: ev?.classification || null,
        });
      }
    }

    setRows(rowsOut);
    const isFocusPending = focusPendingRef.current;
    if (cycleFilter === 'all' && activeCycle && !isFocusPending) setCycleFilter(activeCycle.id);
    focusPendingRef.current = false;
    setLoading(false);
  }

  const viewerRole: ViewerRole = isAdmin ? 'admin' : isPgd ? 'pgd' : isManager ? 'manager' : 'none';

  // Filter + sort
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const nowMs = now.getTime();
    const out = rows.filter((r) => {
      if (cycleFilter !== 'all' && r.cycleId !== cycleFilter) return false;
      if (deptFilter !== 'all' && r.deptId !== deptFilter) return false;
      if (positionFilter !== 'all' && r.positionId !== positionFilter) return false;
      if (statusFilter === 'overdue') {
        if (!r.endDate || new Date(r.endDate) > now) return false;
        if (r.display === 'approved' || r.display === 'closed') return false;
      } else if (statusFilter !== 'all' && r.display !== statusFilter) return false;
      if (actorFilter !== 'all' && r.actor !== actorFilter) return false;
      if (q) {
        const hay = `${r.fullName} ${r.email || ''} ${r.employeeCode || ''} ${r.deptName} ${r.positionName}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return out.sort((a, b) => {
      const pa = rowPriority(a, viewerRole, nowMs);
      const pb = rowPriority(b, viewerRole, nowMs);
      if (pa !== pb) return pa - pb;
      const ea = a.endDate ? new Date(a.endDate).getTime() : Number.POSITIVE_INFINITY;
      const eb = b.endDate ? new Date(b.endDate).getTime() : Number.POSITIVE_INFINITY;
      if (ea !== eb) return ea - eb;
      return a.fullName.localeCompare(b.fullName, 'vi');
    });
  }, [rows, cycleFilter, deptFilter, positionFilter, statusFilter, actorFilter, search, viewerRole]);



  // KPIs
  const counts = useMemo(() => {
    const c = EMPTY_COUNTS();
    let notStartedEmp = 0;
    let overdue = 0;
    const now = new Date();
    const scopedByCycle = rows.filter((r) => cycleFilter === 'all' || r.cycleId === cycleFilter);
    scopedByCycle.forEach((r) => {
      c[r.display]++;
      if (r.display === 'not_started') notStartedEmp++;
      if (r.endDate && new Date(r.endDate) < now && r.display !== 'approved' && r.display !== 'closed') overdue++;
    });
    return { counts: c, total: scopedByCycle.length, notStartedEmp, overdue };
  }, [rows, cycleFilter]);

  // Branch progress (TCTH view)
  const branchProgress = useMemo(() => {
    const grouped = new Map<string, { name: string; total: number; perStatus: Record<DisplayStatus, number> }>();
    const scopedByCycle = rows.filter((r) => cycleFilter === 'all' || r.cycleId === cycleFilter);
    scopedByCycle.forEach((r) => {
      const k = r.deptId || 'none';
      if (!grouped.has(k)) grouped.set(k, { name: r.deptName, total: 0, perStatus: EMPTY_COUNTS() });
      const g = grouped.get(k)!;
      g.total++;
      g.perStatus[r.display]++;
    });
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, cycleFilter]);

  if (authLoading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;
  if (!isAdmin && !isPgd && !isManager) return <div className="p-6 text-muted-foreground">Bạn không có quyền truy cập tab này.</div>;

  const headerSub = canSeeTcthView
    ? 'Theo dõi tiến độ đánh giá toàn Chi nhánh'
    : isPgd
    ? 'Theo dõi cán bộ thuộc phạm vi PGĐ phụ trách'
    : 'Theo dõi cán bộ thuộc phòng bạn phụ trách';

  // Xuất MỘT file PDF gộp toàn bộ phiếu đã phê duyệt của kỳ đang chọn — in lưu hồ sơ nhân sự
  const exportCycleArchive = async () => {
    if (cycleFilter === 'all') {
      toast.info('Chọn một kỳ cụ thể ở bộ lọc "Kỳ đánh giá" để xuất hồ sơ.');
      return;
    }
    setBulkExporting(true);
    setBulkProgress('Đang nạp dữ liệu…');
    try {
      const [{ loadApprovedFormsForCycle }, { exportBM01BatchToPdf }] = await Promise.all([
        import('@/lib/exportBM01Bulk'),
        import('@/lib/exportBM01Pdf'),
      ]);
      const { cycleName, items } = await loadApprovedFormsForCycle(cycleFilter, (d, t) => setBulkProgress(`Nạp dữ liệu ${d}/${t}…`));
      if (!items.length) {
        toast.info('Kỳ này chưa có phiếu nào được phê duyệt — hồ sơ chỉ lưu phiếu đã duyệt.');
        return;
      }
      await exportBM01BatchToPdf(
        items,
        `BM01_HoSo_${cycleName.replace(/[/\s]+/g, '_')}.pdf`,
        (d, t) => setBulkProgress(`Dựng bản in ${d}/${t}…`),
      );
      toast.success(`Đã tải file PDF hồ sơ gồm ${items.length} phiếu đã phê duyệt.`);
    } catch (e) {
      toast.error('Lỗi xuất hồ sơ: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBulkExporting(false);
      setBulkProgress('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-header">Đánh giá cán bộ</h1>
        <p className="page-subtitle">{headerSub}</p>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Danh sách bản đánh giá</TabsTrigger>
          {canSeeTcthView && <TabsTrigger value="branches">Theo dõi toàn Chi nhánh</TabsTrigger>}
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-0">
          <KpiCards
            total={counts.total}
            counts={counts.counts}
            notStartedEmployees={counts.notStartedEmp}
            overdue={counts.overdue}
            activeFilter={statusFilter}
            onFilter={(s) => setStatusFilter(s)}
          />

          {(viewerRole === 'manager' || viewerRole === 'pgd' || viewerRole === 'admin') && (
            <ReviewerActionAlert
              onActionClick={() => {
                if (viewerRole !== 'admin') setActorFilter(viewerRole);
                setStatusFilter('all');
                setCycleFilter('all');
              }}
            />
          )}



          {/* Filters */}
          <div className="flex flex-col md:flex-row flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Tìm theo họ tên, email, mã CB, phòng..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Kỳ đánh giá" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả kỳ</SelectItem>
                {cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Phòng/Đơn vị" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả phòng</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue placeholder="Vị trí" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả vị trí</SelectItem>
                {positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={actorFilter} onValueChange={setActorFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Người cần xử lý" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="employee">Cán bộ</SelectItem>
                <SelectItem value="manager">Trưởng phòng</SelectItem>
                <SelectItem value="pgd">PGĐ</SelectItem>
                <SelectItem value="done">Đã hoàn tất</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={exportCycleArchive}
              disabled={bulkExporting || cycleFilter === 'all'}
              title={cycleFilter === 'all'
                ? 'Chọn một kỳ cụ thể để xuất hồ sơ'
                : 'Tải một file PDF gộp toàn bộ phiếu ĐÃ PHÊ DUYỆT của kỳ — in lưu hồ sơ nhân sự'}
            >
              {bulkExporting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <FileDown className="w-4 h-4 mr-1.5" />}
              {bulkExporting ? (bulkProgress || 'Đang xuất…') : 'Xuất PDF hồ sơ kỳ'}
            </Button>
          </div>

          {/* Table desktop */}
          {loading ? (
            <p className="text-muted-foreground">Đang tải...</p>
          ) : (
            <>
              <div className="hidden md:block bg-card rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="py-2.5 px-3 font-medium">Cán bộ</th>
                      <th className="py-2.5 px-3 font-medium">Phòng</th>
                      <th className="py-2.5 px-3 font-medium">Vị trí</th>
                      <th className="py-2.5 px-3 font-medium">Kỳ</th>
                      <th className="py-2.5 px-3 font-medium">Trạng thái</th>
                      <th className="py-2.5 px-3 font-medium">Cần xử lý</th>
                      <th className="py-2.5 px-3 font-medium text-center">GAP</th>
                      <th className="py-2.5 px-3 font-medium">Ngày gửi</th>
                      <th className="py-2.5 px-3 font-medium">Hạn</th>
                      <th className="py-2.5 px-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={10} className="text-center text-muted-foreground py-8">Không có dữ liệu phù hợp.</td></tr>
                    )}
                    {filtered.map((r) => {
                      const overdue = r.endDate && new Date(r.endDate) < new Date() && r.display !== 'approved' && r.display !== 'closed';
                      return (
                        <tr key={`${r.profileId}-${r.cycleId}`} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2.5 px-3">
                            <div className="font-medium">{r.fullName}</div>
                            <div className="text-xs text-muted-foreground">{r.employeeCode || ''} {r.email ? `· ${r.email}` : ''}</div>
                          </td>
                          <td className="py-2.5 px-3">{r.deptName}</td>
                          <td className="py-2.5 px-3">{r.positionName}</td>
                          <td className="py-2.5 px-3 whitespace-nowrap">{r.cycleName}</td>
                          <td className="py-2.5 px-3"><StatusBadge status={r.display} /></td>
                          <td className="py-2.5 px-3 text-xs">{ACTOR_LABEL[r.actor]}</td>
                          <td className="py-2.5 px-3 text-center">{r.gapCount ?? '—'}</td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('vi-VN') : '—'}</td>
                          <td className={`py-2.5 px-3 text-xs ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {r.endDate ? new Date(r.endDate).toLocaleDateString('vi-VN') : '—'}
                          </td>
                          <td className="py-2.5 px-3">
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/danh-gia/${r.profileId}`)}>
                              <Eye className="w-4 h-4 mr-1" /> Mở
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-2">
                {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Không có dữ liệu phù hợp.</p>}
                {filtered.map((r) => (
                  <div key={`${r.profileId}-${r.cycleId}`} className="bg-card border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{r.fullName}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{r.deptName} · {r.positionName}</div>
                      </div>
                      <StatusBadge status={r.display} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Cần xử lý: <span className="font-medium text-foreground">{ACTOR_LABEL[r.actor]}</span></span>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/danh-gia/${r.profileId}`)} className="h-7">
                        Mở <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {canSeeTcthView && (
          <TabsContent value="branches" className="space-y-4 mt-0">
            <KpiCards
              total={counts.total}
              counts={counts.counts}
              notStartedEmployees={counts.notStartedEmp}
              overdue={counts.overdue}
            />
            <div className="bg-card rounded-lg border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="py-2.5 px-3 font-medium">Phòng/Đơn vị</th>
                    <th className="py-2.5 px-3 font-medium text-center">Tổng</th>
                    <th className="py-2.5 px-3 font-medium text-center">Chưa BĐ</th>
                    <th className="py-2.5 px-3 font-medium text-center">Đang TĐG</th>
                    <th className="py-2.5 px-3 font-medium text-center">Đã gửi</th>
                    <th className="py-2.5 px-3 font-medium text-center">Chờ PGĐ</th>
                    <th className="py-2.5 px-3 font-medium text-center">Trả lại</th>
                    <th className="py-2.5 px-3 font-medium text-center">Đã duyệt</th>
                    <th className="py-2.5 px-3 font-medium text-center">% HT</th>
                  </tr>
                </thead>
                <tbody>
                  {branchProgress.length === 0 && (
                    <tr><td colSpan={9} className="text-center text-muted-foreground py-8">Không có dữ liệu.</td></tr>
                  )}
                  {branchProgress.map((b) => {
                    const done = b.perStatus.approved + b.perStatus.closed;
                    const pct = b.total > 0 ? Math.round((done / b.total) * 100) : 0;
                    return (
                      <tr key={b.name} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-medium">{b.name}</td>
                        <td className="py-2.5 px-3 text-center">{b.total}</td>
                        <td className="py-2.5 px-3 text-center">{b.perStatus.not_started}</td>
                        <td className="py-2.5 px-3 text-center">{b.perStatus.in_progress}</td>
                        <td className="py-2.5 px-3 text-center">{b.perStatus.submitted + b.perStatus.resubmitted}</td>
                        <td className="py-2.5 px-3 text-center">{b.perStatus.reviewed}</td>
                        <td className="py-2.5 px-3 text-center">{b.perStatus.returned_employee + b.perStatus.returned_manager}</td>
                        <td className="py-2.5 px-3 text-center">{done}</td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-medium">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
