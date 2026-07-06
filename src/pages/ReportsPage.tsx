import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { filterQuarterCycles, pickDefaultCycle, type QuarterCycleOption } from '@/lib/evaluationCycles';
import { STATUS_LABEL, STATUS_TONE, toDisplayStatus, type SubmissionRow } from '@/components/evaluation-tracking/statusMap';

// Màu theo vai trò dữ liệu (đã kiểm tra CVD): hoàn thành / đang xử lý / chưa bắt đầu
const PROGRESS_COLOR = { done: '#0ca30c', inflight: '#0057b8', notstarted: '#898781' } as const;
// Thái độ: nổi bật / đạt mong đợi / cần cải thiện
const ATT_COLOR = { noi_bat: '#0ca30c', dat_mong_doi: '#2a78d6', can_cai_thien: '#ec835a' } as const;

const STAR_LABEL: Record<string, string> = {
  sao_mai: 'Sao Mai', sao_khue: 'Sao Khuê', sao_bang: 'Sao Băng', sao_hom: 'Sao Hôm',
};
const STAR_CSS: Record<string, string> = {
  sao_mai: 'star-mai', sao_khue: 'star-khue', sao_bang: 'star-bang', sao_hom: 'star-hom',
};

const PREV_STATUS_LABEL: Record<string, string> = {
  completed: 'Hoàn thành', in_progress: 'Đang thực hiện', planned: 'Chưa bắt đầu', cancelled: 'Huỷ',
};

interface CycleInfo extends QuarterCycleOption { start_date: string; end_date: string }

interface ProfileInfo {
  id: string;
  full_name: string;
  employee_code: string | null;
  department_id: string | null;
  position_id: string | null;
}

interface SubInfo extends SubmissionRow {
  employee_id: string;
  updated_at: string;
}

interface SkillRowInfo {
  form_id: string;
  skill_id: string;
  is_core: boolean;
  required_level: number | null;
  self_assessed_level: number | null;
  manager_assessed_level: number | null;
  self_l0: boolean;
  manager_l0: boolean;
}

interface StarRowInfo {
  employee_id: string;
  star_group: string | null;
  approval_status: string;
  evaluator_level: string;
  updated_at: string;
}

/** Mức hiệu lực: ưu tiên đánh giá của lãnh đạo, sau đó tự đánh giá; cờ l0 = mức 0 */
const effLevel = (r: SkillRowInfo): number | null => {
  if (r.manager_l0) return 0;
  if (r.manager_assessed_level != null) return r.manager_assessed_level;
  if (r.self_l0) return 0;
  return r.self_assessed_level;
};

const normalizeAttitude = (v: string | null | undefined): keyof typeof ATT_COLOR | null => {
  if (!v) return null;
  if (v === 'noi_bat') return 'noi_bat';
  if (v === 'dat_mong_doi' || v === 'dat') return 'dat_mong_doi';
  if (v === 'can_cai_thien' || v === 'chua_dat') return 'can_cai_thien';
  return null;
};

export default function ReportsPage() {
  const { scope, visibleDeptIds, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cycleLoading, setCycleLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [cycles, setCycles] = useState<CycleInfo[]>([]);
  const [cycleId, setCycleId] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [deptMap, setDeptMap] = useState<Map<string, string>>(new Map());
  const [posMap, setPosMap] = useState<Map<string, string>>(new Map());
  const [skillMap, setSkillMap] = useState<Map<string, { code: string | null; name: string }>>(new Map());

  const [subs, setSubs] = useState<SubInfo[]>([]);
  const [skillRows, setSkillRows] = useState<SkillRowInfo[]>([]);
  const [attRows, setAttRows] = useState<{ form_id: string; attitude_name: string; self_status: string | null; manager_status: string | null }[]>([]);
  const [prevRows, setPrevRows] = useState<{ form_id: string; status: string }[]>([]);
  const [starRows, setStarRows] = useState<StarRowInfo[]>([]);

  useEffect(() => {
    if (authLoading) return;
    (async () => {
      let profilesQuery = supabase
        .from('profiles')
        .select('id, full_name, employee_code, department_id, position_id')
        .eq('status', 'active');
      if (scope !== 'all' && visibleDeptIds.length > 0) {
        profilesQuery = profilesQuery.in('department_id', visibleDeptIds);
      }
      const [cyclesRes, profilesRes, deptsRes, posRes, skillsRes] = await Promise.all([
        supabase.from('evaluation_cycles').select('id, name, start_date, end_date').eq('cycle_type', 'quarterly').order('start_date'),
        profilesQuery,
        supabase.from('departments').select('id, name').eq('is_active', true),
        supabase.from('positions').select('id, name').eq('is_active', true),
        supabase.from('skill_catalog').select('id, code, name').eq('is_active', true),
      ]);
      const qs = filterQuarterCycles((cyclesRes.data || []) as CycleInfo[]);
      setCycles(qs);
      setProfiles((profilesRes.data || []) as ProfileInfo[]);
      setDeptMap(new Map((deptsRes.data || []).map((d) => [d.id, d.name])));
      setPosMap(new Map((posRes.data || []).map((p) => [p.id, p.name])));
      setSkillMap(new Map((skillsRes.data || []).map((s) => [s.id, { code: s.code, name: s.name }])));
      setCycleId((prev) => prev || pickDefaultCycle(qs)?.id || '');
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, scope, visibleDeptIds.join(',')]);

  const loadCycleData = useCallback(async () => {
    if (!cycleId) return;
    setCycleLoading(true);
    const [subsRes, starsRes] = await Promise.all([
      supabase
        .from('form_submissions')
        .select('id, employee_id, status, return_target, needs_manager_review_update, submitted_at, reviewed_at, returned_at, pgd_reviewed_at, updated_at')
        .eq('cycle_id', cycleId),
      supabase
        .from('staff_star_classifications')
        .select('employee_id, star_group, approval_status, evaluator_level, updated_at')
        .eq('cycle_id', cycleId),
    ]);
    const allSubs = (subsRes.data || []) as SubInfo[];
    // Bản ghi mới nhất theo cán bộ
    const byEmp = new Map<string, SubInfo>();
    allSubs.forEach((s) => {
      const prev = byEmp.get(s.employee_id);
      if (!prev || new Date(s.updated_at) > new Date(prev.updated_at)) byEmp.set(s.employee_id, s);
    });
    const latest = [...byEmp.values()];
    setSubs(latest);
    setStarRows((starsRes.data || []) as StarRowInfo[]);

    const formIds = latest.map((s) => s.id);
    if (!formIds.length) {
      setSkillRows([]); setAttRows([]); setPrevRows([]);
      setCycleLoading(false);
      return;
    }
    const [skillsRes, attsRes, prevsRes] = await Promise.all([
      supabase
        .from('skill_assessments')
        .select('form_id, skill_id, is_core, required_level, self_assessed_level, manager_assessed_level, self_l0, manager_l0')
        .in('form_id', formIds),
      supabase
        .from('form_attitude_priorities')
        .select('form_id, attitude_name, self_status, manager_status')
        .in('form_id', formIds),
      supabase
        .from('form_previous_action_reviews')
        .select('form_id, status')
        .in('form_id', formIds),
    ]);
    setSkillRows((skillsRes.data || []) as SkillRowInfo[]);
    setAttRows(attsRes.data || []);
    setPrevRows(prevsRes.data || []);
    setCycleLoading(false);
  }, [cycleId]);

  useEffect(() => { loadCycleData(); }, [loadCycleData]);

  const selectedCycle = cycles.find((c) => c.id === cycleId) || null;

  const visibleProfiles = useMemo(
    () => profiles.filter((p) => deptFilter === 'all' || p.department_id === deptFilter),
    [profiles, deptFilter],
  );

  const subByEmp = useMemo(() => new Map(subs.map((s) => [s.employee_id, s])), [subs]);
  const skillsByForm = useMemo(() => {
    const m = new Map<string, SkillRowInfo[]>();
    skillRows.forEach((r) => { m.set(r.form_id, [...(m.get(r.form_id) || []), r]); });
    return m;
  }, [skillRows]);
  const attsByForm = useMemo(() => {
    const m = new Map<string, { form_id: string; attitude_name: string; self_status: string | null; manager_status: string | null }[]>();
    attRows.forEach((r) => { m.set(r.form_id, [...(m.get(r.form_id) || []), r]); });
    return m;
  }, [attRows]);
  const starByEmp = useMemo(() => {
    // Ưu tiên bản ghi đã duyệt và cấp đánh giá cao nhất (GĐ > PGĐ > TP)
    const rank = (r: StarRowInfo) =>
      (r.approval_status === 'approved' ? 100 : 0) +
      (r.evaluator_level === 'director' ? 3 : r.evaluator_level === 'pgd' ? 2 : 1);
    const best = new Map<string, { group: string; score: number }>();
    starRows.forEach((r) => {
      if (!r.star_group) return;
      const score = rank(r);
      const cur = best.get(r.employee_id);
      if (!cur || score > cur.score) best.set(r.employee_id, { group: r.star_group, score });
    });
    return new Map([...best.entries()].map(([k, v]) => [k, v.group]));
  }, [starRows]);

  // Dòng tổng hợp theo cán bộ
  const staffRows = useMemo(() => visibleProfiles.map((p) => {
    const sub = subByEmp.get(p.id) || null;
    const bucket: keyof typeof PROGRESS_COLOR = !sub
      ? 'notstarted'
      : (sub.status === 'approved' || sub.status === 'closed') ? 'done' : 'inflight';
    const forms = sub ? skillsByForm.get(sub.id) || [] : [];
    const core = forms.filter((r) => r.is_core && r.required_level != null);
    let met = 0, gap = 0;
    core.forEach((r) => {
      const lv = effLevel(r);
      if (lv != null && lv >= (r.required_level as number)) met++;
      else if (lv != null) gap++;
    });
    const atts = sub ? attsByForm.get(sub.id) || [] : [];
    const attNeed = atts.filter((a) => normalizeAttitude(a.manager_status || a.self_status) === 'can_cai_thien').length;
    return {
      profile: p,
      deptName: p.department_id ? deptMap.get(p.department_id) || '—' : '—',
      positionName: p.position_id ? posMap.get(p.position_id) || '—' : '—',
      sub,
      display: toDisplayStatus(sub),
      bucket,
      coreTotal: core.length,
      coreMet: met,
      gapCount: gap,
      attNeed,
      star: starByEmp.get(p.id) || null,
    };
  }).sort((a, b) => a.deptName.localeCompare(b.deptName, 'vi') || a.profile.full_name.localeCompare(b.profile.full_name, 'vi')),
  [visibleProfiles, subByEmp, skillsByForm, attsByForm, starByEmp, deptMap, posMap]);

  const tiles = useMemo(() => {
    const total = staffRows.length;
    const done = staffRows.filter((r) => r.bucket === 'done').length;
    const inflight = staffRows.filter((r) => r.bucket === 'inflight').length;
    const notstarted = total - done - inflight;
    const coreTotal = staffRows.reduce((a, r) => a + r.coreTotal, 0);
    const coreMet = staffRows.reduce((a, r) => a + r.coreMet, 0);
    const visibleFormIds = new Set(staffRows.filter((r) => r.sub).map((r) => r.sub!.id));
    const prevVisible = prevRows.filter((r) => visibleFormIds.has(r.form_id));
    const prevDone = prevVisible.filter((r) => r.status === 'completed').length;
    return { total, done, inflight, notstarted, coreTotal, coreMet, prevTotal: prevVisible.length, prevDone };
  }, [staffRows, prevRows]);

  const deptProgress = useMemo(() => {
    const m = new Map<string, { dept: string; done: number; inflight: number; notstarted: number }>();
    staffRows.forEach((r) => {
      const item = m.get(r.deptName) || { dept: r.deptName, done: 0, inflight: 0, notstarted: 0 };
      item[r.bucket]++;
      m.set(r.deptName, item);
    });
    return [...m.values()].sort((a, b) => a.dept.localeCompare(b.dept, 'vi'));
  }, [staffRows]);

  const deptSkill = useMemo(() => {
    const m = new Map<string, { dept: string; met: number; total: number }>();
    staffRows.forEach((r) => {
      const item = m.get(r.deptName) || { dept: r.deptName, met: 0, total: 0 };
      item.met += r.coreMet;
      item.total += r.coreTotal;
      m.set(r.deptName, item);
    });
    return [...m.values()]
      .filter((d) => d.total > 0)
      .map((d) => ({ ...d, pct: Math.round((d.met / d.total) * 100) }))
      .sort((a, b) => a.dept.localeCompare(b.dept, 'vi'));
  }, [staffRows]);

  const gapTop = useMemo(() => {
    const visibleFormIds = new Set(staffRows.filter((r) => r.sub).map((r) => r.sub!.id));
    const m = new Map<string, number>();
    skillRows.forEach((r) => {
      if (!visibleFormIds.has(r.form_id) || !r.is_core || r.required_level == null) return;
      const lv = effLevel(r);
      if (lv != null && lv < r.required_level) m.set(r.skill_id, (m.get(r.skill_id) || 0) + 1);
    });
    return [...m.entries()]
      .map(([skillId, count]) => {
        const sk = skillMap.get(skillId);
        return { skill: sk ? `${sk.code ? `${sk.code}. ` : ''}${sk.name}` : skillId, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [skillRows, staffRows, skillMap]);

  const attitudeDist = useMemo(() => {
    const visibleFormIds = new Set(staffRows.filter((r) => r.sub).map((r) => r.sub!.id));
    const m = new Map<string, { group: string; noi_bat: number; dat_mong_doi: number; can_cai_thien: number }>();
    attRows.forEach((r) => {
      if (!visibleFormIds.has(r.form_id)) return;
      const v = normalizeAttitude(r.manager_status || r.self_status);
      if (!v) return;
      const item = m.get(r.attitude_name) || { group: r.attitude_name, noi_bat: 0, dat_mong_doi: 0, can_cai_thien: 0 };
      item[v]++;
      m.set(r.attitude_name, item);
    });
    return [...m.values()];
  }, [attRows, staffRows]);

  const starCounts = useMemo(() => {
    const counts: Record<string, number> = { sao_mai: 0, sao_khue: 0, sao_bang: 0, sao_hom: 0 };
    staffRows.forEach((r) => { if (r.star && counts[r.star] != null) counts[r.star]++; });
    return counts;
  }, [staffRows]);

  const prevPlanCounts = useMemo(() => {
    const visibleFormIds = new Set(staffRows.filter((r) => r.sub).map((r) => r.sub!.id));
    const counts: Record<string, number> = { completed: 0, in_progress: 0, planned: 0, cancelled: 0 };
    prevRows.forEach((r) => {
      if (!visibleFormIds.has(r.form_id)) return;
      if (counts[r.status] != null) counts[r.status]++;
    });
    return counts;
  }, [prevRows, staffRows]);

  const exportExcel = async () => {
    if (!selectedCycle) return;
    setExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      const ws1 = XLSX.utils.aoa_to_sheet([
        [`BÁO CÁO TỔNG HỢP ĐÁNH GIÁ NĂNG LỰC — ${selectedCycle.name}`],
        [`Xuất lúc: ${new Date().toLocaleString('vi-VN')}`],
        [],
      ]);
      XLSX.utils.sheet_add_json(ws1, staffRows.map((r, i) => ({
        'STT': i + 1,
        'Họ tên': r.profile.full_name,
        'Mã CB': r.profile.employee_code || '',
        'Phòng ban': r.deptName,
        'Vị trí': r.positionName,
        'Trạng thái phiếu': STATUS_LABEL[r.display],
        'Skill lõi đạt chuẩn': r.coreTotal ? `${r.coreMet}/${r.coreTotal}` : '—',
        'Số skill còn GAP': r.coreTotal ? r.gapCount : '—',
        'Thái độ cần cải thiện': r.sub ? r.attNeed : '—',
        'Xếp loại sao': r.star ? STAR_LABEL[r.star] : '',
      })), { origin: 'A4' });
      XLSX.utils.book_append_sheet(wb, ws1, 'Tổng hợp CB');

      const ws2 = XLSX.utils.json_to_sheet(gapTop.map((g, i) => ({
        'STT': i + 1, 'Kỹ năng': g.skill, 'Số CB chưa đạt chuẩn': g.count,
      })));
      XLSX.utils.book_append_sheet(wb, ws2, 'GAP kỹ năng');

      const ws3 = XLSX.utils.json_to_sheet(deptProgress.map((d) => ({
        'Phòng ban': d.dept,
        'Hoàn thành': d.done,
        'Đang xử lý': d.inflight,
        'Chưa bắt đầu': d.notstarted,
        '% đạt chuẩn skill lõi': deptSkill.find((s) => s.dept === d.dept)?.pct ?? '—',
      })));
      XLSX.utils.book_append_sheet(wb, ws3, 'Theo phòng ban');

      const ws4 = XLSX.utils.json_to_sheet(attitudeDist.map((a) => ({
        'Nhóm thái độ': a.group,
        'Nổi bật': a.noi_bat,
        'Đạt mong đợi': a.dat_mong_doi,
        'Cần cải thiện': a.can_cai_thien,
      })));
      XLSX.utils.book_append_sheet(wb, ws4, 'Thái độ');

      const safeCycle = selectedCycle.name.replace(/[/\s]+/g, '_');
      XLSX.writeFile(wb, `BaoCao_TongHop_${safeCycle}.xlsx`);
      toast.success('Đã xuất báo cáo Excel');
    } catch (e) {
      toast.error('Lỗi xuất báo cáo: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setExporting(false);
    }
  };

  const Tile = ({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: string }) => (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-0.5 ${tone || ''}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  const pctDone = tiles.total ? Math.round((tiles.done / tiles.total) * 100) : 0;
  const pctSkill = tiles.coreTotal ? Math.round((tiles.coreMet / tiles.coreTotal) * 100) : 0;
  const pctPrev = tiles.prevTotal ? Math.round((tiles.prevDone / tiles.prevTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Báo cáo tổng hợp đánh giá
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tổng hợp theo kỳ: tiến độ đánh giá, mức đáp ứng kỹ năng lõi, thái độ, xếp loại sao và kết quả kế hoạch hành động kỳ trước.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={cycleId} onValueChange={setCycleId}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Chọn kỳ" /></SelectTrigger>
            <SelectContent>
              {cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[190px] h-9"><SelectValue placeholder="Phòng ban" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {[...deptMap.entries()]
                .filter(([id]) => scope === 'all' || visibleDeptIds.length === 0 || visibleDeptIds.includes(id))
                .map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={exportExcel} disabled={exporting || !selectedCycle}>
            {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {cycleLoading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải dữ liệu kỳ…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Tile label="Tổng cán bộ" value={tiles.total} />
            <Tile label="Hoàn thành đánh giá" value={tiles.done} sub={`${pctDone}% tổng số`} tone="text-emerald-700" />
            <Tile label="Đang xử lý" value={tiles.inflight} tone="text-sky-700" />
            <Tile label="Chưa bắt đầu" value={tiles.notstarted} />
            <Tile label="Skill lõi đạt chuẩn" value={`${pctSkill}%`} sub={`${tiles.coreMet}/${tiles.coreTotal} lượt đánh giá`} />
            <Tile label="KH kỳ trước hoàn thành" value={tiles.prevTotal ? `${pctPrev}%` : '—'} sub={tiles.prevTotal ? `${tiles.prevDone}/${tiles.prevTotal} hành động` : 'Chưa có dữ liệu'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tiến độ đánh giá theo phòng ban</CardTitle></CardHeader>
              <CardContent>
                {deptProgress.length === 0 ? <p className="text-xs text-muted-foreground py-8 text-center">Chưa có dữ liệu.</p> : (
                  <div style={{ height: Math.max(180, deptProgress.length * 42 + 60) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptProgress} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="dept" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="done" name="Hoàn thành" stackId="a" fill={PROGRESS_COLOR.done} stroke="#fff" strokeWidth={2} />
                        <Bar dataKey="inflight" name="Đang xử lý" stackId="a" fill={PROGRESS_COLOR.inflight} stroke="#fff" strokeWidth={2} />
                        <Bar dataKey="notstarted" name="Chưa bắt đầu" stackId="a" fill={PROGRESS_COLOR.notstarted} stroke="#fff" strokeWidth={2} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tỷ lệ đạt chuẩn kỹ năng lõi theo phòng ban (%)</CardTitle></CardHeader>
              <CardContent>
                {deptSkill.length === 0 ? <p className="text-xs text-muted-foreground py-8 text-center">Chưa có dữ liệu đánh giá kỹ năng trong kỳ.</p> : (
                  <div style={{ height: Math.max(180, deptSkill.length * 42 + 40) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={deptSkill} layout="vertical" margin={{ top: 4, right: 40, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="dept" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [`${v}%`, 'Đạt chuẩn']} />
                        <Bar dataKey="pct" name="% đạt chuẩn" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} label={{ position: 'right', fontSize: 11, formatter: (v: number) => `${v}%` }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Kỹ năng nhiều cán bộ chưa đạt chuẩn nhất</CardTitle></CardHeader>
              <CardContent>
                {gapTop.length === 0 ? <p className="text-xs text-muted-foreground py-8 text-center">Không có kỹ năng nào dưới chuẩn — hoặc chưa có dữ liệu.</p> : (
                  <div style={{ height: Math.max(180, gapTop.length * 40 + 40) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gapTop} layout="vertical" margin={{ top: 4, right: 32, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="skill" width={210} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => [v, 'Cán bộ chưa đạt']} />
                        <Bar dataKey="count" name="Cán bộ chưa đạt" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} label={{ position: 'right', fontSize: 11 }} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Đánh giá 6 nhóm thái độ (ưu tiên đánh giá của lãnh đạo)</CardTitle></CardHeader>
              <CardContent>
                {attitudeDist.length === 0 ? <p className="text-xs text-muted-foreground py-8 text-center">Chưa có dữ liệu thái độ trong kỳ.</p> : (
                  <div style={{ height: Math.max(180, attitudeDist.length * 42 + 60) }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attitudeDist} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="group" width={180} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="noi_bat" name="Nổi bật" stackId="a" fill={ATT_COLOR.noi_bat} stroke="#fff" strokeWidth={2} />
                        <Bar dataKey="dat_mong_doi" name="Đạt mong đợi" stackId="a" fill={ATT_COLOR.dat_mong_doi} stroke="#fff" strokeWidth={2} />
                        <Bar dataKey="can_cai_thien" name="Cần cải thiện" stackId="a" fill={ATT_COLOR.can_cai_thien} stroke="#fff" strokeWidth={2} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" /> Phân nhóm sao trong kỳ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(STAR_LABEL).map(([key, label]) => (
                    <div key={key} className={`rounded-lg border p-3 text-center ${STAR_CSS[key]}`}>
                      <div className="text-xl font-semibold">{starCounts[key]}</div>
                      <div className="text-[11px]">{label}</div>
                    </div>
                  ))}
                </div>
                {Object.values(starCounts).every((v) => v === 0) && (
                  <p className="text-xs text-muted-foreground mt-2">Kỳ này chưa có xếp loại sao.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Kết quả kế hoạch hành động kỳ trước (lãnh đạo xác nhận)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(PREV_STATUS_LABEL).map(([key, label]) => (
                    <div key={key} className="rounded-lg border border-border bg-card p-3 text-center">
                      <div className={`text-xl font-semibold ${key === 'completed' ? 'text-emerald-700' : key === 'in_progress' ? 'text-sky-700' : 'text-muted-foreground'}`}>
                        {prevPlanCounts[key]}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>
                {tiles.prevTotal === 0 && (
                  <p className="text-xs text-muted-foreground mt-2">Chưa có hành động kỳ trước được rà soát trong kỳ này.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Chi tiết theo cán bộ</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b">
                    <th className="py-2 pr-3 font-medium">Cán bộ</th>
                    <th className="py-2 pr-3 font-medium">Phòng ban</th>
                    <th className="py-2 pr-3 font-medium">Trạng thái phiếu</th>
                    <th className="py-2 pr-3 font-medium text-center">Skill đạt chuẩn</th>
                    <th className="py-2 pr-3 font-medium text-center">GAP</th>
                    <th className="py-2 pr-3 font-medium text-center">Thái độ cần cải thiện</th>
                    <th className="py-2 pr-3 font-medium">Sao</th>
                    <th className="py-2 pr-0 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((r) => (
                    <tr key={r.profile.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium">{r.profile.full_name}</div>
                        <div className="text-[11px] text-muted-foreground">{r.positionName}</div>
                      </td>
                      <td className="py-2.5 pr-3 text-xs">{r.deptName}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[r.display]}`}>{STATUS_LABEL[r.display]}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-center text-xs">{r.coreTotal ? `${r.coreMet}/${r.coreTotal}` : '—'}</td>
                      <td className={`py-2.5 pr-3 text-center font-medium ${r.gapCount > 0 ? 'text-orange-700' : 'text-muted-foreground'}`}>{r.coreTotal ? r.gapCount : '—'}</td>
                      <td className={`py-2.5 pr-3 text-center font-medium ${r.attNeed > 0 ? 'text-orange-700' : 'text-muted-foreground'}`}>{r.sub ? r.attNeed : '—'}</td>
                      <td className="py-2.5 pr-3 text-xs">{r.star ? STAR_LABEL[r.star] : '—'}</td>
                      <td className="py-2.5 pr-0 text-right">
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => navigate(`/danh-gia/${r.profile.id}`)}>Mở</Button>
                      </td>
                    </tr>
                  ))}
                  {staffRows.length === 0 && (
                    <tr><td colSpan={8} className="py-6 text-center text-xs text-muted-foreground">Không có cán bộ trong phạm vi.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {!isAdmin && (
            <p className="text-[11px] text-muted-foreground">
              Phạm vi hiển thị theo quyền của bạn.
            </p>
          )}
        </>
      )}
    </div>
  );
}
