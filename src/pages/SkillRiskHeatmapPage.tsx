import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStrategicHrAccess } from '@/hooks/useStrategicHrAccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, ShieldAlert } from 'lucide-react';
import { filterQuarterCycles, pickDefaultCycle, type QuarterCycleOption } from '@/lib/evaluationCycles';
import {
  buildEmployeeSkillLevels, computeSkillHolders, riskTier,
  RISK_TIER_LABELS, type HolderInfo, type RiskTier, type SkillAssessmentRow,
} from '@/lib/skillInsights';
import { LEVEL_LABELS } from '@/lib/skillLevels';

interface ProfileInfo {
  id: string;
  full_name: string;
  department_id: string | null;
  position_id: string | null;
}

interface SkillInfo { id: string; code: string | null; name: string; skill_group: string }

// Nền ô heatmap theo số chuyên gia trong phòng
const cellTone = (count: number, hasStaff: boolean): string => {
  if (!hasStaff) return 'bg-muted/30 text-muted-foreground/50';
  if (count <= 0) return 'bg-muted/60 text-muted-foreground';
  if (count === 1) return 'bg-orange-100 text-orange-800';
  if (count === 2) return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-800';
};

const TIER_TONE: Record<RiskTier, string> = {
  trong: 'bg-red-100 text-red-800 border-red-200',
  nguy_cap: 'bg-orange-100 text-orange-800 border-orange-200',
  mong_manh: 'bg-amber-100 text-amber-800 border-amber-200',
  an_toan: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function SkillRiskHeatmapPage() {
  const { loading: accessLoading, allowed } = useStrategicHrAccess();
  const [loading, setLoading] = useState(true);
  const [cycleLoading, setCycleLoading] = useState(false);

  const [cycles, setCycles] = useState<QuarterCycleOption[]>([]);
  const [cycleId, setCycleId] = useState('');
  const [expertLevel, setExpertLevel] = useState(3);
  const [onlyRequired, setOnlyRequired] = useState(true);

  const [profiles, setProfiles] = useState<ProfileInfo[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [coreReqs, setCoreReqs] = useState<{ position_id: string; skill_id: string; minimum_level: number }[]>([]);
  const [formToEmp, setFormToEmp] = useState<Map<string, string>>(new Map());
  const [skillRows, setSkillRows] = useState<SkillAssessmentRow[]>([]);
  const [detailSkillId, setDetailSkillId] = useState<string | null>(null);

  useEffect(() => {
    if (accessLoading || !allowed) { if (!accessLoading) setLoading(false); return; }
    (async () => {
      const [cyclesRes, profilesRes, deptsRes, skillsRes, reqsRes] = await Promise.all([
        supabase.from('evaluation_cycles').select('id, name').eq('cycle_type', 'quarterly').order('start_date'),
        supabase.from('profiles').select('id, full_name, department_id, position_id').eq('status', 'active'),
        supabase.from('departments').select('id, name').eq('is_active', true).order('name'),
        supabase.from('skill_catalog').select('id, code, name, skill_group').eq('is_active', true).order('sort_order'),
        supabase.from('position_core_skills').select('position_id, skill_id, minimum_level'),
      ]);
      const qs = filterQuarterCycles(cyclesRes.data || []);
      setCycles(qs);
      setProfiles((profilesRes.data || []) as ProfileInfo[]);
      setDepartments(deptsRes.data || []);
      setSkills((skillsRes.data || []) as SkillInfo[]);
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

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const levelsByEmp = useMemo(() => buildEmployeeSkillLevels(formToEmp, skillRows), [formToEmp, skillRows]);
  const holdersBySkill = useMemo(() => computeSkillHolders(levelsByEmp, expertLevel), [levelsByEmp, expertLevel]);

  // Nhu cầu: số CB đang giữ vị trí có yêu cầu kỹ năng này (minimum_level > 0)
  const demandBySkill = useMemo(() => {
    const posCountByPosition = new Map<string, number>();
    profiles.forEach((p) => {
      if (p.position_id) posCountByPosition.set(p.position_id, (posCountByPosition.get(p.position_id) || 0) + 1);
    });
    const demand = new Map<string, number>();
    coreReqs.forEach((r) => {
      if (r.minimum_level > 0) {
        demand.set(r.skill_id, (demand.get(r.skill_id) || 0) + (posCountByPosition.get(r.position_id) || 0));
      }
    });
    return demand;
  }, [profiles, coreReqs]);

  const deptHeadcount = useMemo(() => {
    const m = new Map<string, number>();
    profiles.forEach((p) => { if (p.department_id) m.set(p.department_id, (m.get(p.department_id) || 0) + 1); });
    return m;
  }, [profiles]);

  interface RiskRow {
    skill: SkillInfo;
    total: number;
    demand: number;
    tier: RiskTier;
    byDept: Map<string, HolderInfo[]>;
    holders: HolderInfo[];
  }

  const riskRows = useMemo<RiskRow[]>(() => {
    return skills
      .filter((s) => !onlyRequired || (demandBySkill.get(s.id) || 0) > 0)
      .map((s) => {
        const holders = holdersBySkill.get(s.id) || [];
        const byDept = new Map<string, HolderInfo[]>();
        holders.forEach((h) => {
          const deptId = profileMap.get(h.profileId)?.department_id;
          if (!deptId) return;
          byDept.set(deptId, [...(byDept.get(deptId) || []), h]);
        });
        return {
          skill: s,
          total: holders.length,
          demand: demandBySkill.get(s.id) || 0,
          tier: riskTier(holders.length),
          byDept,
          holders,
        };
      })
      .sort((a, b) => a.total - b.total || b.demand - a.demand || a.skill.name.localeCompare(b.skill.name, 'vi'));
  }, [skills, onlyRequired, demandBySkill, holdersBySkill, profileMap]);

  const tierCounts = useMemo(() => {
    const counts: Record<RiskTier, number> = { trong: 0, nguy_cap: 0, mong_manh: 0, an_toan: 0 };
    riskRows.forEach((r) => { counts[r.tier]++; });
    return counts;
  }, [riskRows]);

  const detailRow = detailSkillId ? riskRows.find((r) => r.skill.id === detailSkillId) || null : null;

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

  const assessedCount = levelsByEmp.size;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" /> Bản đồ rủi ro năng lực
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kỹ năng nào của chi nhánh đang nằm trong tay quá ít người? Ô hiển thị số cán bộ đạt mức
            {' '}<b>L{expertLevel}+</b> theo từng phòng — kỹ năng chỉ 0–1 người nắm là điểm nghẽn khi nghỉ phép / điều chuyển.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={cycleId} onValueChange={setCycleId}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Chọn kỳ" /></SelectTrigger>
            <SelectContent>{cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={String(expertLevel)} onValueChange={(v) => setExpertLevel(Number(v))}>
            <SelectTrigger className="w-[190px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2, 3, 4].map((lv) => (
                <SelectItem key={lv} value={String(lv)}>Ngưỡng L{lv}+ ({LEVEL_LABELS[lv]})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={onlyRequired} onCheckedChange={setOnlyRequired} />
            Chỉ kỹ năng có vị trí yêu cầu
          </label>
        </div>
      </div>

      {cycleLoading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải dữ liệu kỳ…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(RISK_TIER_LABELS) as RiskTier[]).map((tier) => (
              <div key={tier} className={`rounded-lg border p-3 ${TIER_TONE[tier]}`}>
                <div className="text-2xl font-semibold">{tierCounts[tier]}</div>
                <div className="text-[11px]">{RISK_TIER_LABELS[tier]}</div>
              </div>
            ))}
          </div>

          {assessedCount === 0 && (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
              Kỳ này chưa có dữ liệu đánh giá kỹ năng nào.
            </CardContent></Card>
          )}

          {assessedCount > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Heatmap kỹ năng × phòng ban
                  <span className="font-normal text-muted-foreground"> — dựa trên {assessedCount} cán bộ có dữ liệu đánh giá trong kỳ; bấm vào dòng để xem ai đang nắm giữ</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm min-w-[860px]">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="py-2 pr-3 font-medium min-w-[220px]">Kỹ năng</th>
                      <th className="py-2 px-2 font-medium text-center">Toàn CN</th>
                      <th className="py-2 px-2 font-medium text-center" title="Số cán bộ đang giữ vị trí có yêu cầu kỹ năng này">Nhu cầu</th>
                      {departments.map((d) => (
                        <th key={d.id} className="py-2 px-1 font-medium text-center whitespace-nowrap" title={d.name}>
                          {d.name.replace(/^Phòng\s+/i, '')}
                          <span className="block text-[10px] font-normal">({deptHeadcount.get(d.id) || 0} CB)</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {riskRows.map((r) => (
                      <tr
                        key={r.skill.id}
                        className="border-b last:border-0 hover:bg-muted/40 cursor-pointer"
                        onClick={() => setDetailSkillId(r.skill.id)}
                      >
                        <td className="py-2 pr-3">
                          <div className="font-medium text-xs">{r.skill.code ? `${r.skill.code}. ` : ''}{r.skill.name}</div>
                          <div className="text-[10px] text-muted-foreground">{r.skill.skill_group}</div>
                        </td>
                        <td className="py-2 px-2 text-center">
                          <Badge variant="outline" className={`text-[11px] ${TIER_TONE[r.tier]}`}>{r.total}</Badge>
                        </td>
                        <td className="py-2 px-2 text-center text-xs text-muted-foreground">{r.demand || '—'}</td>
                        {departments.map((d) => {
                          const count = r.byDept.get(d.id)?.length || 0;
                          return (
                            <td key={d.id} className="py-1 px-1 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-7 rounded text-xs font-medium ${cellTone(count, (deptHeadcount.get(d.id) || 0) > 0)}`}>
                                {count}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {riskRows.length === 0 && (
                      <tr><td colSpan={3 + departments.length} className="py-6 text-center text-xs text-muted-foreground">Không có kỹ năng nào phù hợp bộ lọc.</td></tr>
                    )}
                  </tbody>
                </table>
                <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground flex-wrap">
                  <span>Số người đạt L{expertLevel}+:</span>
                  <span className="inline-flex items-center gap-1"><span className={`w-4 h-4 rounded ${cellTone(0, true)}`} /> 0</span>
                  <span className="inline-flex items-center gap-1"><span className={`w-4 h-4 rounded ${cellTone(1, true)}`} /> 1</span>
                  <span className="inline-flex items-center gap-1"><span className={`w-4 h-4 rounded ${cellTone(2, true)}`} /> 2</span>
                  <span className="inline-flex items-center gap-1"><span className={`w-4 h-4 rounded ${cellTone(3, true)}`} /> ≥3</span>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={!!detailRow} onOpenChange={(open) => { if (!open) setDetailSkillId(null); }}>
        <DialogContent className="max-w-lg">
          {detailRow && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">
                  {detailRow.skill.code ? `${detailRow.skill.code}. ` : ''}{detailRow.skill.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={TIER_TONE[detailRow.tier]}>{RISK_TIER_LABELS[detailRow.tier]}</Badge>
                  <span className="text-xs text-muted-foreground">Nhu cầu: {detailRow.demand} cán bộ ở vị trí yêu cầu kỹ năng này</span>
                </div>
                {detailRow.holders.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Chưa có cán bộ nào đạt mức L{expertLevel}+ ở kỹ năng này trong kỳ — cần đưa vào kế hoạch đào tạo/kèm cặp.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {detailRow.holders.map((h) => {
                      const p = profileMap.get(h.profileId);
                      const deptName = p?.department_id ? departments.find((d) => d.id === p.department_id)?.name : null;
                      return (
                        <div key={h.profileId} className="flex items-center justify-between gap-2 rounded border border-border px-3 py-1.5">
                          <div>
                            <div className="font-medium text-xs">{p?.full_name || '—'}</div>
                            <div className="text-[10px] text-muted-foreground">{deptName || 'Chưa gán phòng'}</div>
                          </div>
                          <Badge variant="secondary" className="text-[11px]">L{h.level} · {LEVEL_LABELS[h.level]}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
                {detailRow.holders.length === 1 && (
                  <p className="text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-3 py-2">
                    ⚠ Điểm nghẽn đơn lẻ: chỉ một cán bộ nắm kỹ năng này ở mức L{expertLevel}+. Nếu người này nghỉ phép
                    hoặc điều chuyển, chi nhánh không còn ai thay thế — cân nhắc bố trí kèm cặp ngay trong kỳ tới.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
