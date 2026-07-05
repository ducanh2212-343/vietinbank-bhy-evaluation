import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStrategicHrAccess } from '@/hooks/useStrategicHrAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Loader2, Route as RouteIcon } from 'lucide-react';
import { filterQuarterCycles, pickDefaultCycle, type QuarterCycleOption } from '@/lib/evaluationCycles';
import {
  buildEmployeeSkillLevels, computeCareerFit,
  type CareerFitResult, type SkillAssessmentRow,
} from '@/lib/skillInsights';

interface ProfileInfo {
  id: string;
  full_name: string;
  employee_code: string | null;
  department_id: string | null;
  position_id: string | null;
}

interface PositionInfo { id: string; name: string; department_id: string | null }

const fitTone = (pct: number): string => {
  if (pct >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (pct >= 70) return 'bg-sky-100 text-sky-800 border-sky-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
};

const fitBarColor = (pct: number): string => {
  if (pct >= 90) return 'bg-emerald-500';
  if (pct >= 70) return 'bg-sky-500';
  return 'bg-amber-500';
};

export default function CareerPathPage() {
  const { loading: accessLoading, allowed } = useStrategicHrAccess();
  const [loading, setLoading] = useState(true);
  const [cycleLoading, setCycleLoading] = useState(false);

  const [cycles, setCycles] = useState<QuarterCycleOption[]>([]);
  const [cycleId, setCycleId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedPos, setExpandedPos] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<PositionInfo[]>([]);
  const [skillMap, setSkillMap] = useState<Map<string, { code: string | null; name: string }>>(new Map());
  const [coreReqs, setCoreReqs] = useState<{ position_id: string; skill_id: string; minimum_level: number }[]>([]);
  const [formToEmp, setFormToEmp] = useState<Map<string, string>>(new Map());
  const [skillRows, setSkillRows] = useState<SkillAssessmentRow[]>([]);

  useEffect(() => {
    if (accessLoading || !allowed) { if (!accessLoading) setLoading(false); return; }
    (async () => {
      const [cyclesRes, profilesRes, deptsRes, posRes, skillsRes, reqsRes] = await Promise.all([
        supabase.from('evaluation_cycles').select('id, name').eq('cycle_type', 'quarterly').order('start_date'),
        supabase.from('profiles').select('id, full_name, employee_code, department_id, position_id').eq('status', 'active').order('full_name'),
        supabase.from('departments').select('id, name').eq('is_active', true),
        supabase.from('positions').select('id, name, department_id').eq('is_active', true).order('sort_order'),
        supabase.from('skill_catalog').select('id, code, name').eq('is_active', true),
        supabase.from('position_core_skills').select('position_id, skill_id, minimum_level'),
      ]);
      const qs = filterQuarterCycles(cyclesRes.data || []);
      setCycles(qs);
      setProfiles((profilesRes.data || []) as ProfileInfo[]);
      setDepartments(deptsRes.data || []);
      setPositions((posRes.data || []) as PositionInfo[]);
      setSkillMap(new Map((skillsRes.data || []).map((s) => [s.id, { code: s.code, name: s.name }])));
      setCoreReqs(reqsRes.data || []);
      setCycleId((prev) => prev || pickDefaultCycle(qs)?.id || '');
      setLoading(false);
    })();
  }, [accessLoading, allowed]);

  const loadCycleData = useCallback(async () => {
    if (!cycleId) return;
    setCycleLoading(true);
    const { data: subs } = await supabase
      .from('form_submissions')
      .select('id, employee_id, updated_at')
      .eq('cycle_id', cycleId);
    const byEmp = new Map<string, { id: string; updated_at: string }>();
    (subs || []).forEach((s) => {
      const prev = byEmp.get(s.employee_id);
      if (!prev || new Date(s.updated_at) > new Date(prev.updated_at)) byEmp.set(s.employee_id, s);
    });
    const nextFormToEmp = new Map<string, string>();
    byEmp.forEach((s, empId) => nextFormToEmp.set(s.id, empId));
    const formIds = [...nextFormToEmp.keys()];
    let rows: SkillAssessmentRow[] = [];
    if (formIds.length) {
      const { data } = await supabase
        .from('skill_assessments')
        .select('form_id, skill_id, self_assessed_level, manager_assessed_level, self_l0, manager_l0')
        .in('form_id', formIds);
      rows = (data || []) as SkillAssessmentRow[];
    }
    setFormToEmp(nextFormToEmp);
    setSkillRows(rows);
    setCycleLoading(false);
  }, [cycleId]);

  useEffect(() => { loadCycleData(); }, [loadCycleData]);

  const deptMap = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);
  const posMap = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);
  const levelsByEmp = useMemo(() => buildEmployeeSkillLevels(formToEmp, skillRows), [formToEmp, skillRows]);

  const reqsByPosition = useMemo(() => {
    const m = new Map<string, { skill_id: string; minimum_level: number }[]>();
    coreReqs.forEach((r) => {
      if (r.minimum_level > 0) m.set(r.position_id, [...(m.get(r.position_id) || []), r]);
    });
    return m;
  }, [coreReqs]);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) =>
      p.full_name.toLowerCase().includes(q) || (p.employee_code || '').toLowerCase().includes(q));
  }, [profiles, search]);

  const selected = selectedId ? profiles.find((p) => p.id === selectedId) || null : null;

  interface RankedPosition {
    position: PositionInfo;
    fit: CareerFitResult;
    isCurrent: boolean;
  }

  const ranked = useMemo<RankedPosition[]>(() => {
    if (!selected) return [];
    const levels = levelsByEmp.get(selected.id);
    return positions
      .filter((pos) => (reqsByPosition.get(pos.id) || []).length > 0)
      .map((pos) => ({
        position: pos,
        fit: computeCareerFit(levels, reqsByPosition.get(pos.id) || []),
        isCurrent: pos.id === selected.position_id,
      }))
      .sort((a, b) => (b.isCurrent ? -1 : 0) - (a.isCurrent ? -1 : 0) || b.fit.pct - a.fit.pct);
  }, [selected, levelsByEmp, positions, reqsByPosition]);

  if (accessLoading || loading) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }
  if (!allowed) {
    return (
      <div className="p-6">
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Trang này dành cho Ban Giám đốc và Phòng Tổ chức Tổng hợp.
        </CardContent></Card>
      </div>
    );
  }

  const hasData = selected ? levelsByEmp.has(selected.id) : false;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <RouteIcon className="w-5 h-5 text-primary" /> Con đường sự nghiệp
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Từ mặt bằng kỹ năng hiện tại, cán bộ đang gần vị trí nào nhất trong 30 vị trí của chi nhánh —
            và còn thiếu chính xác những gì. Dùng cho quy hoạch, bổ nhiệm và giữ chân người giỏi.
          </p>
        </div>
        <Select value={cycleId} onValueChange={setCycleId}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Chọn kỳ" /></SelectTrigger>
          <SelectContent>{cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        <Card className="h-fit">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Chọn cán bộ</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Tìm theo tên hoặc mã CB…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
            <div className="max-h-[520px] overflow-y-auto space-y-1">
              {filteredProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedId(p.id); setExpandedPos(null); }}
                  className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                    selectedId === p.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="text-xs font-medium">{p.full_name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {(p.department_id && deptMap.get(p.department_id)) || 'Chưa gán phòng'}
                    {p.position_id && posMap.get(p.position_id) ? ` · ${posMap.get(p.position_id)!.name}` : ''}
                  </div>
                </button>
              ))}
              {filteredProfiles.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">Không tìm thấy cán bộ.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {!selected && (
            <Card><CardContent className="py-16 text-center text-sm text-muted-foreground">
              Chọn một cán bộ ở cột bên trái để xem bản đồ vị trí phù hợp.
            </CardContent></Card>
          )}

          {selected && cycleLoading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải dữ liệu kỳ…</div>
          )}

          {selected && !cycleLoading && !hasData && (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              <b>{selected.full_name}</b> chưa có dữ liệu đánh giá kỹ năng trong kỳ này —
              chưa thể tính độ khớp vị trí.
            </CardContent></Card>
          )}

          {selected && !cycleLoading && hasData && ranked.map(({ position, fit, isCurrent }) => {
            const isExpanded = expandedPos === position.id;
            return (
              <Card key={position.id} className={isCurrent ? 'border-primary/50' : undefined}>
                <button
                  className="w-full text-left"
                  onClick={() => setExpandedPos(isExpanded ? null : position.id)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{position.name}</span>
                          {isCurrent && <Badge variant="secondary" className="text-[10px]">Vị trí hiện tại</Badge>}
                          <span className="text-[11px] text-muted-foreground">
                            {(position.department_id && deptMap.get(position.department_id)) || ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${fitBarColor(fit.pct)}`} style={{ width: `${fit.pct}%` }} />
                          </div>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            đạt {fit.met}/{fit.total} kỹ năng yêu cầu
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${fitTone(fit.pct)}`}>{fit.pct}%</Badge>
                    </div>
                  </CardContent>
                </button>
                {isExpanded && (
                  <CardContent className="pt-0 pb-3 px-4">
                    {fit.missing.length === 0 ? (
                      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 ml-7">
                        ✓ Đã đáp ứng toàn bộ yêu cầu tối thiểu của vị trí này.
                      </p>
                    ) : (
                      <div className="ml-7 space-y-1">
                        <div className="text-[11px] text-muted-foreground mb-1.5">Còn thiếu {fit.missing.length} kỹ năng:</div>
                        {fit.missing.map((m) => {
                          const sk = skillMap.get(m.skill_id);
                          return (
                            <div key={m.skill_id} className="flex items-center justify-between gap-2 rounded border border-border px-3 py-1.5">
                              <span className="text-xs">{sk ? `${sk.code ? `${sk.code}. ` : ''}${sk.name}` : m.skill_id}</span>
                              <span className="text-[11px] whitespace-nowrap">
                                <span className="text-muted-foreground">hiện tại </span>
                                <b>L{m.current}</b>
                                <span className="text-muted-foreground"> → yêu cầu </span>
                                <b className="text-orange-700">L{m.required}</b>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
