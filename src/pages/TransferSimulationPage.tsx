import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStrategicHrAccess } from '@/hooks/useStrategicHrAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeftRight, ArrowRight, Loader2, TrendingDown, TrendingUp, UserRound } from 'lucide-react';
import { filterQuarterCycles, pickDefaultCycle, type QuarterCycleOption } from '@/lib/evaluationCycles';
import { buildEmployeeSkillLevels, computeCareerFit, type SkillAssessmentRow } from '@/lib/skillInsights';
import { LEVEL_LABELS } from '@/lib/skillLevels';

interface ProfileInfo {
  id: string;
  full_name: string;
  employee_code: string | null;
  department_id: string | null;
  position_id: string | null;
}

interface PositionInfo { id: string; name: string; department_id: string | null }

const EXPERT_LEVEL = 3; // Ngưỡng "người nắm giữ" kỹ năng: L3+ (Chuyên gia)

export default function TransferSimulationPage() {
  const { loading: accessLoading, allowed } = useStrategicHrAccess();
  const [loading, setLoading] = useState(true);
  const [cycleLoading, setCycleLoading] = useState(false);

  const [cycles, setCycles] = useState<QuarterCycleOption[]>([]);
  const [cycleId, setCycleId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [targetPositionId, setTargetPositionId] = useState('');

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
  const levelsByEmp = useMemo(() => buildEmployeeSkillLevels(formToEmp, skillRows), [formToEmp, skillRows]);

  const employee = employeeId ? profiles.find((p) => p.id === employeeId) || null : null;
  const targetPosition = targetPositionId ? positions.find((p) => p.id === targetPositionId) || null : null;

  const reqsByPosition = useMemo(() => {
    const m = new Map<string, { skill_id: string; minimum_level: number }[]>();
    coreReqs.forEach((r) => {
      if (r.minimum_level > 0) m.set(r.position_id, [...(m.get(r.position_id) || []), r]);
    });
    return m;
  }, [coreReqs]);

  // Số người đạt L3+ theo (skill, phòng)
  const expertCountBySkillDept = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    levelsByEmp.forEach((skills, empId) => {
      const deptId = profiles.find((p) => p.id === empId)?.department_id;
      if (!deptId) return;
      skills.forEach((level, skillId) => {
        if (level < EXPERT_LEVEL) return;
        let inner = m.get(skillId);
        if (!inner) { inner = new Map(); m.set(skillId, inner); }
        inner.set(deptId, (inner.get(deptId) || 0) + 1);
      });
    });
    return m;
  }, [levelsByEmp, profiles]);

  const simulation = useMemo(() => {
    if (!employee || !targetPosition) return null;
    const levels = levelsByEmp.get(employee.id);
    const fit = computeCareerFit(levels, reqsByPosition.get(targetPosition.id) || []);

    const oldDeptId = employee.department_id;
    const newDeptId = targetPosition.department_id;
    const expertSkills = [...(levels?.entries() || [])]
      .filter(([, lv]) => lv >= EXPERT_LEVEL)
      .map(([skillId, lv]) => ({ skillId, level: lv }));

    // Phòng cũ mất gì: các kỹ năng CB là chuyên gia, số chuyên gia còn lại sau điều chuyển
    const losses = oldDeptId && oldDeptId !== newDeptId
      ? expertSkills
        .map(({ skillId, level }) => {
          const before = expertCountBySkillDept.get(skillId)?.get(oldDeptId) || 0;
          return { skillId, level, before, after: Math.max(0, before - 1) };
        })
        .sort((a, b) => a.after - b.after || b.level - a.level)
      : [];

    // Phòng mới nhận được gì
    const gains = newDeptId && newDeptId !== oldDeptId
      ? expertSkills
        .map(({ skillId, level }) => {
          const before = expertCountBySkillDept.get(skillId)?.get(newDeptId) || 0;
          return { skillId, level, before, after: before + 1 };
        })
        .sort((a, b) => a.before - b.before || b.level - a.level)
      : [];

    return { fit, losses, gains, oldDeptId, newDeptId, hasData: !!levels };
  }, [employee, targetPosition, levelsByEmp, reqsByPosition, expertCountBySkillDept]);

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

  const skillLabel = (skillId: string) => {
    const sk = skillMap.get(skillId);
    return sk ? `${sk.code ? `${sk.code}. ` : ''}${sk.name}` : skillId;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" /> Mô phỏng điều chuyển nhân sự
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Thử trước khi quyết: chọn cán bộ và vị trí đích để xem gap kỹ năng cá nhân,
            phòng cũ hụt năng lực gì và phòng mới nhận được gì. Không thay đổi dữ liệu thật.
          </p>
        </div>
        <Select value={cycleId} onValueChange={setCycleId}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Chọn kỳ" /></SelectTrigger>
          <SelectContent>{cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Cán bộ điều chuyển</div>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Chọn cán bộ…" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name}{p.department_id && deptMap.get(p.department_id) ? ` — ${deptMap.get(p.department_id)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground hidden md:block mt-4" />
            <div>
              <div className="text-[11px] text-muted-foreground mb-1">Vị trí đích</div>
              <Select value={targetPositionId} onValueChange={setTargetPositionId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Chọn vị trí đích…" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.department_id && deptMap.get(p.department_id) ? ` — ${deptMap.get(p.department_id)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {cycleLoading && (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải dữ liệu kỳ…</div>
      )}

      {!cycleLoading && employee && targetPosition && simulation && (
        !simulation.hasData ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            <b>{employee.full_name}</b> chưa có dữ liệu đánh giá kỹ năng trong kỳ này — chưa thể mô phỏng.
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Gap cá nhân tại vị trí mới */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <UserRound className="w-4 h-4 text-primary" /> Gap cá nhân tại vị trí mới
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {simulation.fit.total === 0 ? (
                  <p className="text-xs text-muted-foreground">Vị trí đích chưa cấu hình yêu cầu kỹ năng — không có gì để so.</p>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${simulation.fit.pct >= 90 ? 'bg-emerald-500' : simulation.fit.pct >= 70 ? 'bg-sky-500' : 'bg-amber-500'}`}
                          style={{ width: `${simulation.fit.pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold">{simulation.fit.pct}%</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Đạt {simulation.fit.met}/{simulation.fit.total} kỹ năng yêu cầu tối thiểu của vị trí {targetPosition.name}.
                    </p>
                    {simulation.fit.missing.length === 0 ? (
                      <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                        ✓ Đáp ứng đầy đủ — có thể điều chuyển không cần đào tạo bổ sung.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {simulation.fit.missing.map((m) => (
                          <div key={m.skill_id} className="flex items-center justify-between gap-2 rounded border border-border px-2.5 py-1.5">
                            <span className="text-[11px]">{skillLabel(m.skill_id)}</span>
                            <span className="text-[11px] whitespace-nowrap">L{m.current} → <b className="text-orange-700">L{m.required}</b></span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Phòng cũ mất gì */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-orange-600" />
                  Phòng cũ hụt gì{simulation.oldDeptId ? ` — ${deptMap.get(simulation.oldDeptId) || ''}` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!simulation.oldDeptId ? (
                  <p className="text-xs text-muted-foreground">Cán bộ chưa gán phòng ban — không tính được ảnh hưởng.</p>
                ) : simulation.oldDeptId === simulation.newDeptId ? (
                  <p className="text-xs text-muted-foreground">Điều chuyển trong cùng phòng — mặt bằng kỹ năng phòng không đổi.</p>
                ) : simulation.losses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Cán bộ chưa đạt L{EXPERT_LEVEL}+ ({LEVEL_LABELS[EXPERT_LEVEL]}) ở kỹ năng nào — phòng cũ không mất năng lực chuyên gia.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {simulation.losses.map((l) => (
                      <div
                        key={l.skillId}
                        className={`flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 ${
                          l.after === 0 ? 'border-red-200 bg-red-50' : l.after === 1 ? 'border-orange-200 bg-orange-50' : 'border-border'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-[11px]">{skillLabel(l.skillId)}</div>
                          {l.after === 0 && <div className="text-[10px] text-red-700 font-medium">⚠ Phòng cũ không còn ai đạt L{EXPERT_LEVEL}+</div>}
                          {l.after === 1 && <div className="text-[10px] text-orange-700">Chỉ còn 1 người — rủi ro điểm nghẽn</div>}
                        </div>
                        <span className="text-[11px] whitespace-nowrap text-muted-foreground">{l.before} → <b>{l.after}</b> người</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Phòng mới nhận được gì */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Phòng mới nhận được gì{simulation.newDeptId ? ` — ${deptMap.get(simulation.newDeptId) || ''}` : ''}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!simulation.newDeptId ? (
                  <p className="text-xs text-muted-foreground">Vị trí đích chưa gắn phòng ban — không tính được phần nhận thêm.</p>
                ) : simulation.newDeptId === simulation.oldDeptId ? (
                  <p className="text-xs text-muted-foreground">Điều chuyển trong cùng phòng — mặt bằng kỹ năng phòng không đổi.</p>
                ) : simulation.gains.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Cán bộ chưa đạt L{EXPERT_LEVEL}+ ở kỹ năng nào — phòng mới chưa nhận thêm năng lực chuyên gia.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {simulation.gains.map((g) => (
                      <div
                        key={g.skillId}
                        className={`flex items-center justify-between gap-2 rounded border px-2.5 py-1.5 ${
                          g.before === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-border'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-[11px]">{skillLabel(g.skillId)}</div>
                          {g.before === 0 && <div className="text-[10px] text-emerald-700 font-medium">★ Năng lực mới cho phòng (trước đó chưa ai đạt L{EXPERT_LEVEL}+)</div>}
                        </div>
                        <span className="text-[11px] whitespace-nowrap text-muted-foreground">{g.before} → <b>{g.after}</b> người</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )
      )}

      {!cycleLoading && (!employee || !targetPosition) && (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          Chọn cán bộ và vị trí đích để chạy mô phỏng.
        </CardContent></Card>
      )}
    </div>
  );
}
