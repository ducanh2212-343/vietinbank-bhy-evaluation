import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useSubmissionReportAccess } from '@/hooks/useSubmissionReportAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarClock, Download, Loader2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { filterQuarterCycles, pickDefaultCycle } from '@/lib/evaluationCycles';
import {
  TIMING_LABEL,
  computeSubmissionTiming,
  formatVsDeadline,
  getEffectiveDeadline,
  type SubmissionTiming,
  type SubmissionTimingStatus,
} from '@/lib/submissionKpi';
import { STATUS_LABEL, STATUS_TONE, toDisplayStatus, type SubmissionRow } from '@/components/evaluation-tracking/statusMap';

// Màu trạng thái nộp (status palette — kèm nhãn chữ, không dùng màu đơn độc)
const TIMING_COLOR: Record<SubmissionTimingStatus, string> = {
  ontime: '#0ca30c',
  late: '#ec835a',
  missing_overdue: '#d03b3b',
  pending: '#898781',
};

const TIMING_BADGE_CLS: Record<SubmissionTimingStatus, string> = {
  ontime: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  late: 'bg-orange-100 text-orange-800 border-orange-200',
  missing_overdue: 'bg-red-100 text-red-800 border-red-200',
  pending: 'bg-muted text-muted-foreground border-border',
};

interface CycleInfo {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  submission_deadline: string | null;
  late_penalty_points: number;
}

interface ProfileInfo {
  id: string;
  full_name: string;
  employee_code: string | null;
  department_id: string | null;
  position_id: string | null;
  created_at: string;
}

interface SubInfo extends SubmissionRow {
  employee_id: string;
  cycle_id: string;
  first_submitted_at: string | null;
  first_reviewed_at: string | null;
  first_approved_at: string | null;
  updated_at: string;
}

interface StaffTimingRow {
  profileId: string;
  fullName: string;
  employeeCode: string | null;
  deptId: string | null;
  deptName: string;
  positionName: string;
  sub: SubInfo | null;
  /** Mốc 1: cán bộ đẩy biểu mẫu lên */
  submittedAt: string | null;
  /** Mốc 2: lãnh đạo (TP/người đánh giá) duyệt */
  reviewedAt: string | null;
  /** Mốc 3: Phó giám đốc duyệt — thời gian nộp cuối cùng, dùng tính KPI */
  approvedAt: string | null;
  timing: SubmissionTiming;
}

const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayLabel = (key: string) => {
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
};

/** Mốc 1 — CB đẩy lên lần đầu; fallback submitted_at cho dữ liệu cũ. */
const submitMilestone = (sub: SubInfo | null): string | null => sub?.first_submitted_at || sub?.submitted_at || null;

/** Mốc 2 — lãnh đạo duyệt lần đầu. */
const reviewMilestone = (sub: SubInfo | null): string | null => sub?.first_reviewed_at || sub?.reviewed_at || null;

/** Mốc 3 — PGĐ duyệt lần đầu (thời gian nộp cuối cùng); fallback cho dữ liệu cũ đã approved. */
const approveMilestone = (sub: SubInfo | null): string | null => {
  if (!sub) return null;
  if (sub.first_approved_at) return sub.first_approved_at;
  if (sub.status === 'approved' || sub.status === 'closed') {
    return sub.pgd_reviewed_at || sub.reviewed_at || null;
  }
  return null;
};

export default function SubmissionTimeReportPage() {
  const access = useSubmissionReportAccess();
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [cycles, setCycles] = useState<CycleInfo[]>([]);
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [deptMap, setDeptMap] = useState<Map<string, string>>(new Map());
  const [posMap, setPosMap] = useState<Map<string, string>>(new Map());
  const [subs, setSubs] = useState<SubInfo[]>([]);
  const [cycleId, setCycleId] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [timingFilter, setTimingFilter] = useState<'all' | SubmissionTimingStatus>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [cyclesRes, profilesRes, deptsRes, posRes, subsRes] = await Promise.all([
      supabase
        .from('evaluation_cycles')
        .select('id, name, start_date, end_date, submission_deadline, late_penalty_points')
        .eq('cycle_type', 'quarterly')
        .order('start_date'),
      supabase
        .from('profiles')
        .select('id, full_name, employee_code, department_id, position_id, created_at')
        .eq('status', 'active'),
      supabase.from('departments').select('id, name').eq('is_active', true),
      supabase.from('positions').select('id, name').eq('is_active', true),
      supabase
        .from('form_submissions')
        .select('id, employee_id, cycle_id, status, return_target, needs_manager_review_update, submitted_at, first_submitted_at, first_reviewed_at, first_approved_at, reviewed_at, returned_at, pgd_reviewed_at, updated_at'),
    ]);

    const err = cyclesRes.error || profilesRes.error || deptsRes.error || posRes.error || subsRes.error;
    if (err) {
      toast.error('Lỗi tải dữ liệu: ' + err.message);
      setLoading(false);
      return;
    }

    const quarterCycles = filterQuarterCycles((cyclesRes.data || []) as CycleInfo[]);
    setCycles(quarterCycles);
    setProfiles((profilesRes.data || []) as ProfileInfo[]);
    setDeptMap(new Map((deptsRes.data || []).map((d) => [d.id, d.name])));
    setPosMap(new Map((posRes.data || []).map((p) => [p.id, p.name])));
    setSubs((subsRes.data || []) as SubInfo[]);
    setCycleId((prev) => prev || pickDefaultCycle(quarterCycles)?.id || '');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const selectedCycle = useMemo(() => cycles.find((c) => c.id === cycleId) || null, [cycles, cycleId]);

  // Phạm vi hiển thị: GĐ/PGĐ chỉ thấy các phòng mình phụ trách; TCTH/system admin + lãnh đạo Phòng TCTH thấy toàn chi nhánh
  const visibleProfiles = useMemo(
    () => access.fullBranch
      ? profiles
      : profiles.filter((p) => p.department_id && access.scopeDeptIds.includes(p.department_id)),
    [profiles, access.fullBranch, access.scopeDeptIds],
  );

  const visibleDeptEntries = useMemo(
    () => [...deptMap.entries()].filter(([id]) => access.fullBranch || access.scopeDeptIds.includes(id)),
    [deptMap, access.fullBranch, access.scopeDeptIds],
  );

  // Bản ghi nộp mới nhất theo (cán bộ × kỳ)
  const subMap = useMemo(() => {
    const m = new Map<string, SubInfo>();
    subs.forEach((s) => {
      const k = `${s.employee_id}|${s.cycle_id}`;
      const prev = m.get(k);
      if (!prev || new Date(s.updated_at) > new Date(prev.updated_at)) m.set(k, s);
    });
    return m;
  }, [subs]);

  const rowsForCycle = useCallback((cycle: CycleInfo): StaffTimingRow[] => {
    const now = new Date();
    return visibleProfiles.map((p) => {
      const sub = subMap.get(`${p.id}|${cycle.id}`) || null;
      const approvedAt = approveMilestone(sub);
      return {
        profileId: p.id,
        fullName: p.full_name,
        employeeCode: p.employee_code,
        deptId: p.department_id,
        deptName: p.department_id ? deptMap.get(p.department_id) || '—' : '—',
        positionName: p.position_id ? posMap.get(p.position_id) || '—' : '—',
        sub,
        submittedAt: submitMilestone(sub),
        reviewedAt: reviewMilestone(sub),
        approvedAt,
        // KPI tính theo thời điểm PGĐ duyệt — thời gian nộp cuối cùng
        timing: computeSubmissionTiming(approvedAt, cycle, now),
      };
    });
  }, [visibleProfiles, subMap, deptMap, posMap]);

  const cycleRows = useMemo(
    () => (selectedCycle ? rowsForCycle(selectedCycle) : []),
    [selectedCycle, rowsForCycle],
  );

  const counts = useMemo(() => {
    const c: Record<SubmissionTimingStatus, number> = { ontime: 0, late: 0, missing_overdue: 0, pending: 0 };
    let penalty = 0;
    cycleRows.forEach((r) => { c[r.timing.status]++; penalty += r.timing.penalty; });
    return { ...c, total: cycleRows.length, submitted: c.ontime + c.late, penalty };
  }, [cycleRows]);

  const filteredRows = useMemo(() => {
    const severity: Record<SubmissionTimingStatus, number> = { missing_overdue: 0, late: 1, pending: 2, ontime: 3 };
    return cycleRows
      .filter((r) => (deptFilter === 'all' || r.deptId === deptFilter))
      .filter((r) => (timingFilter === 'all' || r.timing.status === timingFilter))
      .sort((a, b) =>
        severity[a.timing.status] - severity[b.timing.status] ||
        a.deptName.localeCompare(b.deptName, 'vi') ||
        a.fullName.localeCompare(b.fullName, 'vi'));
  }, [cycleRows, deptFilter, timingFilter]);

  // Dữ liệu chart: tình hình nộp theo phòng ban (stacked ngang)
  const deptChartData = useMemo(() => {
    const byDept = new Map<string, { dept: string; ontime: number; late: number; missing_overdue: number; pending: number }>();
    cycleRows.forEach((r) => {
      const key = r.deptName;
      const item = byDept.get(key) || { dept: key, ontime: 0, late: 0, missing_overdue: 0, pending: 0 };
      item[r.timing.status]++;
      byDept.set(key, item);
    });
    return [...byDept.values()].sort((a, b) => a.dept.localeCompare(b.dept, 'vi'));
  }, [cycleRows]);

  // Dữ liệu chart: số lượt CB đẩy lên / PGĐ duyệt theo ngày quanh mốc
  const timelineData = useMemo(() => {
    if (!selectedCycle) return [] as { day: string; submitted: number; approved: number }[];
    const deadline = getEffectiveDeadline(selectedCycle);
    const submitted = cycleRows.map((r) => r.submittedAt).filter(Boolean).map((s) => new Date(s as string));
    const approved = cycleRows.map((r) => r.approvedAt).filter(Boolean).map((s) => new Date(s as string));
    const all = [...submitted, ...approved];
    if (!all.length) return [];
    const min = new Date(Math.min(...all.map((d) => d.getTime()), deadline.getTime() - 3 * 86400000));
    const max = new Date(Math.max(...all.map((d) => d.getTime()), deadline.getTime() + 2 * 86400000));
    const subCounts = new Map<string, number>();
    submitted.forEach((d) => { const k = dayKey(d); subCounts.set(k, (subCounts.get(k) || 0) + 1); });
    const apprCounts = new Map<string, number>();
    approved.forEach((d) => { const k = dayKey(d); apprCounts.set(k, (apprCounts.get(k) || 0) + 1); });
    const out: { day: string; submitted: number; approved: number }[] = [];
    const cur = new Date(min.getFullYear(), min.getMonth(), min.getDate());
    let guard = 0;
    while (cur <= max && guard < 120) {
      const k = dayKey(cur);
      out.push({ day: k, submitted: subCounts.get(k) || 0, approved: apprCounts.get(k) || 0 });
      cur.setDate(cur.getDate() + 1);
      guard++;
    }
    return out;
  }, [selectedCycle, cycleRows]);

  const deadlineDayKey = selectedCycle ? dayKey(getEffectiveDeadline(selectedCycle)) : '';

  // Tổng hợp KPI qua các kỳ
  const summary = useMemo(() => {
    const now = new Date();
    const perCycleRows = cycles.map((c) => ({ cycle: c, deadline: getEffectiveDeadline(c) }));
    const rows = visibleProfiles.map((p) => {
      const cells = perCycleRows.map(({ cycle, deadline }) => {
        // Cán bộ được thêm vào hệ thống sau mốc của kỳ → không tính kỳ đó
        if (new Date(p.created_at) > deadline) return { cycleId: cycle.id, na: true as const, timing: null };
        const sub = subMap.get(`${p.id}|${cycle.id}`) || null;
        return { cycleId: cycle.id, na: false as const, timing: computeSubmissionTiming(approveMilestone(sub), cycle, now) };
      });
      const lateCount = cells.filter((c) => !c.na && (c.timing!.status === 'late' || c.timing!.status === 'missing_overdue')).length;
      const totalPenalty = cells.reduce((acc, c) => acc + (c.na ? 0 : c.timing!.penalty), 0);
      return {
        profileId: p.id,
        fullName: p.full_name,
        deptName: p.department_id ? deptMap.get(p.department_id) || '—' : '—',
        cells,
        lateCount,
        totalPenalty,
      };
    });
    return rows.sort((a, b) => b.totalPenalty - a.totalPenalty || a.fullName.localeCompare(b.fullName, 'vi'));
  }, [cycles, visibleProfiles, subMap, deptMap]);

  const exportExcel = async () => {
    if (!selectedCycle) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const deadline = getEffectiveDeadline(selectedCycle);

      const detailRows = rowsForCycle(selectedCycle)
        .sort((a, b) => a.deptName.localeCompare(b.deptName, 'vi') || a.fullName.localeCompare(b.fullName, 'vi'))
        .map((r, i) => ({
          'STT': i + 1,
          'Họ tên': r.fullName,
          'Mã CB': r.employeeCode || '',
          'Phòng ban': r.deptName,
          'Vị trí': r.positionName,
          'Trạng thái biểu mẫu': STATUS_LABEL[toDisplayStatus(r.sub)],
          'CB đẩy lên': fmtDateTime(r.submittedAt),
          'Lãnh đạo duyệt': fmtDateTime(r.reviewedAt),
          'PGĐ duyệt (nộp cuối cùng)': fmtDateTime(r.approvedAt),
          'So với mốc': r.approvedAt ? formatVsDeadline(r.approvedAt, r.timing.deadline) : '—',
          'Kết quả': TIMING_LABEL[r.timing.status],
          'Số ngày trễ': r.timing.daysLate || 0,
          'Điểm KPI trừ': r.timing.penalty,
        }));

      const ws = XLSX.utils.aoa_to_sheet([
        [`BÁO CÁO THỜI GIAN NỘP BIỂU MẪU ĐÁNH GIÁ — ${selectedCycle.name}`],
        [`Mốc nộp: ${fmtDateTime(deadline.toISOString())}${selectedCycle.submission_deadline ? '' : ' (mặc định theo ngày kết thúc kỳ)'} — Điểm KPI trừ mỗi kỳ chậm: ${selectedCycle.late_penalty_points} — Thời gian nộp cuối cùng tính theo thời điểm PGĐ duyệt`],
        [`Phạm vi: ${access.fullBranch ? 'Toàn chi nhánh' : 'Các phòng người xem phụ trách'} — Xuất lúc: ${fmtDateTime(new Date().toISOString())}`],
        [],
      ]);
      XLSX.utils.sheet_add_json(ws, detailRows, { origin: 'A5' });

      const summaryRows = summary.map((s, i) => {
        const row: Record<string, string | number> = {
          'STT': i + 1,
          'Họ tên': s.fullName,
          'Phòng ban': s.deptName,
        };
        s.cells.forEach((cell) => {
          const cName = cycles.find((c) => c.id === cell.cycleId)?.name || cell.cycleId;
          row[cName] = cell.na ? '—' : TIMING_LABEL[cell.timing!.status];
        });
        row['Số kỳ chậm'] = s.lateCount;
        row['Tổng điểm KPI trừ'] = s.totalPenalty;
        return row;
      });
      const ws2 = XLSX.utils.json_to_sheet(summaryRows);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Chi tiết kỳ');
      XLSX.utils.book_append_sheet(wb, ws2, 'Tổng hợp KPI');
      const safeCycle = selectedCycle.name.replace(/[/\s]+/g, '_');
      XLSX.writeFile(wb, `BaoCao_ThoiGianNop_${safeCycle}.xlsx`);
      toast.success('Đã xuất báo cáo Excel');
    } catch (e) {
      console.error(e);
      toast.error('Lỗi xuất báo cáo: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  if (access.loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra quyền truy cập…</div>;
  }
  if (!access.allowed) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Trang này dành cho Ban Giám đốc, Phó giám đốc phụ trách, lãnh đạo Phòng Tổ chức Tổng hợp và TCTH Admin.
      </div>
    );
  }

  const Tile = ({ label, value, k, tone }: { label: string; value: number | string; k?: 'all' | SubmissionTimingStatus; tone?: string }) => (
    <button
      type="button"
      disabled={!k}
      onClick={() => k && setTimingFilter(k)}
      className={`text-left rounded-lg border p-3 bg-card transition-colors ${k ? 'hover:border-primary/60 cursor-pointer' : 'cursor-default'} ${k && timingFilter === k ? 'border-primary ring-1 ring-primary/30' : 'border-border'}`}
    >
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-0.5 ${tone || ''}`}>{value}</div>
    </button>
  );

  const deadlineSet = !!selectedCycle?.submission_deadline;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" /> Báo cáo thời gian nộp biểu mẫu
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Theo dõi 3 mốc: cán bộ đẩy lên → lãnh đạo duyệt → Phó giám đốc duyệt. <strong>Thời gian nộp cuối cùng = thời điểm PGĐ duyệt</strong>,
            so với mốc của kỳ để tính điểm KPI.
          </p>
          <p className="text-xs mt-1">
            <Badge variant="outline" className="text-[10px]">
              Phạm vi: {access.fullBranch ? 'Toàn chi nhánh' : `Các phòng bạn phụ trách (${visibleDeptEntries.length} phòng)`}
            </Badge>
            {!access.fullBranch && visibleDeptEntries.length === 0 && (
              <span className="text-amber-600 ml-2">Chưa có phòng/cán bộ nào được gán cho bạn phụ trách (pgd_id / director_id).</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={cycleId} onValueChange={(v) => { setCycleId(v); setTimingFilter('all'); }}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Chọn kỳ" /></SelectTrigger>
            <SelectContent>
              {cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[190px] h-9"><SelectValue placeholder="Phòng ban" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {visibleDeptEntries.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={exportExcel} disabled={exporting || !selectedCycle}>
            {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>
      ) : !selectedCycle ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Chưa có kỳ đánh giá nào. Hãy tạo kỳ trong "Quản lý kỳ đánh giá".</CardContent></Card>
      ) : (
        <>
          <div className={`rounded-lg border p-3 text-sm flex items-center gap-2 flex-wrap ${deadlineSet ? 'bg-primary/5 border-primary/20' : 'bg-amber-50 border-amber-200'}`}>
            <CalendarClock className={`w-4 h-4 ${deadlineSet ? 'text-primary' : 'text-amber-600'}`} />
            <span>
              Mốc nộp biểu mẫu {selectedCycle.name}: <strong>{fmtDateTime(getEffectiveDeadline(selectedCycle).toISOString())}</strong>
              {!deadlineSet && ' (chưa thiết đặt — tạm dùng 23:59 ngày kết thúc kỳ)'}
              {' '}· Biểu mẫu được PGĐ duyệt sau mốc bị trừ <strong>{selectedCycle.late_penalty_points}</strong> điểm KPI.
            </span>
            <Link to="/quan-ly-ky-danh-gia" className="text-primary underline underline-offset-2 text-xs ml-auto">
              Thiết đặt mốc thời gian
            </Link>
          </div>

          <Tabs defaultValue="cycle">
            <TabsList>
              <TabsTrigger value="cycle">Kỳ {selectedCycle.name}</TabsTrigger>
              <TabsTrigger value="summary">Tổng hợp KPI các kỳ</TabsTrigger>
            </TabsList>

            <TabsContent value="cycle" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <Tile label="Tổng cán bộ" value={counts.total} k="all" />
                <Tile label={TIMING_LABEL.ontime} value={counts.ontime} k="ontime" tone="text-emerald-700" />
                <Tile label={TIMING_LABEL.late} value={counts.late} k="late" tone="text-orange-700" />
                <Tile label={TIMING_LABEL.missing_overdue} value={counts.missing_overdue} k="missing_overdue" tone="text-red-700" />
                <Tile label={TIMING_LABEL.pending} value={counts.pending} k="pending" />
                <Tile label="Điểm KPI trừ (toàn CN)" value={counts.penalty} tone="text-red-700" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tình hình nộp theo phòng ban</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deptChartData.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-8 text-center">Chưa có dữ liệu.</p>
                    ) : (
                      <div style={{ height: Math.max(180, deptChartData.length * 44 + 60) }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={deptChartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="dept" width={150} tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: number, name: string) => [v, name]} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <Bar dataKey="ontime" name={TIMING_LABEL.ontime} stackId="a" fill={TIMING_COLOR.ontime} stroke="#fff" strokeWidth={2} />
                            <Bar dataKey="late" name={TIMING_LABEL.late} stackId="a" fill={TIMING_COLOR.late} stroke="#fff" strokeWidth={2} />
                            <Bar dataKey="missing_overdue" name={TIMING_LABEL.missing_overdue} stackId="a" fill={TIMING_COLOR.missing_overdue} stroke="#fff" strokeWidth={2} />
                            <Bar dataKey="pending" name={TIMING_LABEL.pending} stackId="a" fill={TIMING_COLOR.pending} stroke="#fff" strokeWidth={2} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Diễn biến theo ngày quanh mốc (CB đẩy lên / PGĐ duyệt)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timelineData.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-8 text-center">Chưa có cán bộ nào nộp biểu mẫu trong kỳ này.</p>
                    ) : (
                      <div style={{ height: 240 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={timelineData} margin={{ top: 12, right: 16, bottom: 0, left: -16 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                            <XAxis dataKey="day" tickFormatter={dayLabel} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip labelFormatter={(l) => `Ngày ${dayLabel(String(l))}`} />
                            <Legend wrapperStyle={{ fontSize: 12 }} />
                            <ReferenceLine
                              x={deadlineDayKey}
                              stroke={TIMING_COLOR.missing_overdue}
                              strokeDasharray="4 4"
                              label={{ value: 'Mốc nộp', fill: TIMING_COLOR.missing_overdue, fontSize: 11, position: 'top' }}
                            />
                            <Bar dataKey="submitted" name="CB đẩy lên" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="approved" name="PGĐ duyệt" fill="#1baf7a" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    Chi tiết theo cán bộ {timingFilter !== 'all' && <Badge variant="outline" className="ml-1 text-[10px]">{TIMING_LABEL[timingFilter]}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1020px]">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="py-2 pr-3 font-medium">Cán bộ</th>
                        <th className="py-2 pr-3 font-medium">Phòng ban</th>
                        <th className="py-2 pr-3 font-medium">Trạng thái biểu mẫu</th>
                        <th className="py-2 pr-3 font-medium">① CB đẩy lên</th>
                        <th className="py-2 pr-3 font-medium">② Lãnh đạo duyệt</th>
                        <th className="py-2 pr-3 font-medium">③ PGĐ duyệt (nộp cuối)</th>
                        <th className="py-2 pr-3 font-medium">So với mốc</th>
                        <th className="py-2 pr-3 font-medium">Kết quả</th>
                        <th className="py-2 pr-0 font-medium text-right">Điểm KPI trừ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r) => {
                        const display = toDisplayStatus(r.sub);
                        return (
                          <tr key={r.profileId} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="py-2.5 pr-3">
                              <div className="font-medium">{r.fullName}</div>
                              {r.employeeCode && <div className="text-[11px] text-muted-foreground">{r.employeeCode}</div>}
                              <div className="text-[11px] text-muted-foreground">{r.positionName}</div>
                            </td>
                            <td className="py-2.5 pr-3 text-xs">{r.deptName}</td>
                            <td className="py-2.5 pr-3">
                              <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[display]}`}>{STATUS_LABEL[display]}</Badge>
                            </td>
                            <td className="py-2.5 pr-3 text-xs">{fmtDateTime(r.submittedAt)}</td>
                            <td className="py-2.5 pr-3 text-xs">{fmtDateTime(r.reviewedAt)}</td>
                            <td className={`py-2.5 pr-3 text-xs ${r.approvedAt ? 'font-medium' : 'text-muted-foreground'}`}>{fmtDateTime(r.approvedAt)}</td>
                            <td className={`py-2.5 pr-3 text-xs ${r.timing.status === 'late' ? 'text-orange-700 font-medium' : 'text-muted-foreground'}`}>
                              {r.approvedAt ? formatVsDeadline(r.approvedAt, r.timing.deadline) : '—'}
                            </td>
                            <td className="py-2.5 pr-3">
                              <Badge variant="outline" className={`text-[10px] ${TIMING_BADGE_CLS[r.timing.status]}`}>{TIMING_LABEL[r.timing.status]}</Badge>
                            </td>
                            <td className={`py-2.5 pr-0 text-right font-medium ${r.timing.penalty > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>
                              {r.timing.penalty > 0 ? `−${r.timing.penalty}` : '0'}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredRows.length === 0 && (
                        <tr><td colSpan={9} className="py-6 text-center text-xs text-muted-foreground">Không có cán bộ nào khớp bộ lọc.</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tổng hợp đúng hạn / chậm và điểm KPI trừ qua các kỳ</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Thời gian nộp cuối cùng của mỗi kỳ = thời điểm PGĐ duyệt. Mỗi kỳ được duyệt sau mốc (hoặc chưa duyệt xong khi đã quá mốc)
                    bị trừ số điểm KPI thiết đặt cho kỳ đó. "—" = cán bộ chưa vào hệ thống ở kỳ tương ứng.
                  </p>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead>
                      <tr className="text-left text-xs text-muted-foreground border-b">
                        <th className="py-2 pr-3 font-medium">Cán bộ</th>
                        <th className="py-2 pr-3 font-medium">Phòng ban</th>
                        {cycles.map((c) => <th key={c.id} className="py-2 pr-3 font-medium whitespace-nowrap">{c.name}</th>)}
                        <th className="py-2 pr-3 font-medium text-right">Số kỳ chậm</th>
                        <th className="py-2 pr-0 font-medium text-right">Tổng điểm KPI trừ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary
                        .filter((s) => deptFilter === 'all' || s.deptName === deptMap.get(deptFilter))
                        .map((s) => (
                          <tr key={s.profileId} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="py-2.5 pr-3 font-medium">{s.fullName}</td>
                            <td className="py-2.5 pr-3 text-xs">{s.deptName}</td>
                            {s.cells.map((cell) => (
                              <td key={cell.cycleId} className="py-2.5 pr-3">
                                {cell.na || !cell.timing ? (
                                  <span className="text-xs text-muted-foreground">—</span>
                                ) : (
                                  <Badge variant="outline" className={`text-[10px] ${TIMING_BADGE_CLS[cell.timing.status]}`}>
                                    {TIMING_LABEL[cell.timing.status]}
                                  </Badge>
                                )}
                              </td>
                            ))}
                            <td className={`py-2.5 pr-3 text-right font-medium ${s.lateCount > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>{s.lateCount}</td>
                            <td className={`py-2.5 pr-0 text-right font-medium ${s.totalPenalty > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>
                              {s.totalPenalty > 0 ? `−${s.totalPenalty}` : '0'}
                            </td>
                          </tr>
                        ))}
                      {summary.length === 0 && (
                        <tr><td colSpan={4 + cycles.length} className="py-6 text-center text-xs text-muted-foreground">Chưa có dữ liệu.</td></tr>
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
