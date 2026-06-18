import { lazy, Suspense, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, BarChart3, ListChecks, HeartHandshake, Target } from 'lucide-react';
import type { RadarSkill } from './SkillRadarChart';
const SkillRadarChart = lazy(() => import('./SkillRadarChart').then(m => ({ default: m.SkillRadarChart })));
import { OverallReviewCard } from './OverallReviewCard';
import { StarClassificationCard, type StarRecord } from './StarClassificationCard';
import { ATTITUDE_DIMENSIONS } from '@/components/bm/AttitudeConstants';
import type { ApprovedFormMeta } from '@/lib/approvedForm';

interface Props {
  form: ApprovedFormMeta;
  employeeId: string;
  viewerIsEmployee: boolean;
  positionId?: string | null;
}

function shortName(name: string, max = 14) {
  if (!name) return '';
  if (name.length <= max) return name;
  return name.slice(0, max - 1) + '…';
}

function statusBadge(s: string) {
  const map: Record<string, { label: string; variant: any }> = {
    // New 3-level codes
    noi_bat: { label: 'Nổi bật', variant: 'default' },
    dat_mong_doi: { label: 'Đạt mong đợi', variant: 'secondary' },
    can_cai_thien: { label: 'Cần cải thiện', variant: 'destructive' },
    // Legacy codes
    excellent: { label: 'Nổi bật', variant: 'default' },
    meet: { label: 'Đạt mong đợi', variant: 'secondary' },
    needs_improvement: { label: 'Cần cải thiện', variant: 'destructive' },
  };
  return map[s] || { label: s || '—', variant: 'outline' as any };
}

export function ApprovedFormDetail({ form, employeeId, viewerIsEmployee, positionId }: Props) {
  const [loading, setLoading] = useState(true);
  const [skillRows, setSkillRows] = useState<any[]>([]);
  const [coreConfigs, setCoreConfigs] = useState<any[]>([]);
  const [attitudes, setAttitudes] = useState<any[]>([]);
  const [attitudeActionCounts, setAttitudeActionCounts] = useState<Record<string, { total: number; done: number }>>({});
  const [skillPriorities, setSkillPriorities] = useState<any[]>([]);
  const [star, setStar] = useState<StarRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [assessRes, coreRes, attRes, prioRes, actRes, starRes] = await Promise.all([
        supabase
          .from('skill_assessments')
          .select('skill_id, is_core, required_level, self_assessed_level, manager_assessed_level, gap, evidence, skill_catalog(code, name, skill_group, sort_order)')
          .eq('form_id', form.id),
        positionId
          ? supabase.from('position_core_skills').select('skill_id, minimum_level, sort_order, skill_catalog(name)').eq('position_id', positionId).order('sort_order')
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('form_attitude_priorities')
          .select('id, attitude_dimension_id, attitude_name, self_status, manager_status, evidence, manager_comment')
          .eq('form_id', form.id),
        supabase
          .from('form_skill_priorities')
          .select('id, skill_id, current_level, target_level, gap_level, priority_order, reason_text, skill_catalog(name)')
          .eq('form_id', form.id)
          .order('priority_order'),
        supabase
          .from('form_attitude_actions')
          .select('attitude_priority_id, status')
          .eq('form_id', form.id),
        supabase
          .from('staff_star_classifications')
          .select('star_group, reason_text, direction_text, approval_status, visible_to_employee, approved_at, evaluator:profiles!staff_star_classifications_evaluator_id_fkey(full_name), approver:profiles!staff_star_classifications_approver_id_fkey(full_name)')
          .eq('cycle_id', form.cycle_id)
          .eq('employee_id', employeeId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setSkillRows((assessRes.data || []) as any[]);
      setCoreConfigs((coreRes.data || []) as any[]);
      setAttitudes((attRes.data || []) as any[]);
      setSkillPriorities((prioRes.data || []) as any[]);
      const counts: Record<string, { total: number; done: number }> = {};
      (actRes.data || []).forEach((a: any) => {
        const k = a.attitude_priority_id;
        if (!counts[k]) counts[k] = { total: 0, done: 0 };
        counts[k].total += 1;
        if (a.status === 'completed' || a.status === 'done') counts[k].done += 1;
      });
      setAttitudeActionCounts(counts);
      const sd: any = starRes.data;
      setStar(
        sd
          ? {
              star_group: sd.star_group,
              reason_text: sd.reason_text,
              direction_text: sd.direction_text,
              approval_status: sd.approval_status,
              visible_to_employee: sd.visible_to_employee,
              approved_at: sd.approved_at,
              evaluator_name: sd.evaluator?.full_name,
              approver_name: sd.approver?.full_name,
            }
          : null
      );
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [form.id, form.cycle_id, employeeId, positionId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <Loader2 className="w-4 h-4 animate-spin" /> Đang tải chi tiết kỳ…
      </div>
    );
  }

  // Sort core skills first by sort_order, then supplementary
  const sorted = [...skillRows].sort((a, b) => {
    if (a.is_core !== b.is_core) return a.is_core ? -1 : 1;
    return (a.skill_catalog?.sort_order || 0) - (b.skill_catalog?.sort_order || 0);
  });
  const coreSkillRows = sorted.filter(s => s.is_core);
  const suppSkillRows = sorted.filter(s => !s.is_core);

  const radarData: RadarSkill[] = coreConfigs
    .map(c => {
      const row = coreSkillRows.find(s => s.skill_id === c.skill_id);
      if (!row) return null;
      const actual = row.manager_assessed_level ?? row.self_assessed_level ?? 0;
      const name = c.skill_catalog?.name || row.skill_catalog?.name || '';
      const code = c.skill_catalog?.code || row.skill_catalog?.code || '';
      return {
        skill_id: c.skill_id,
        code,
        short_name: shortName(name),
        full_name: name,
        required: c.minimum_level || row.required_level || 0,
        actual: actual || 0,
      } as RadarSkill;
    })
    .filter(Boolean) as RadarSkill[];

  const overallStatus = (row: any) => {
    const required = row.required_level ?? 0;
    const actual = row.manager_assessed_level ?? row.self_assessed_level ?? 0;
    if (required <= 0) return { label: '—', variant: 'outline' as any };
    if (actual >= required + 1) return { label: 'Nổi bật', variant: 'default' as any };
    if (actual >= required) return { label: 'Đạt chuẩn', variant: 'secondary' as any };
    return { label: 'Còn GAP', variant: 'destructive' as any };
  };

  return (
    <div className="space-y-4">
      {/* Skill table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ListChecks className="w-4 h-4" /> Tổng quan skill đã duyệt</CardTitle>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">Không có dữ liệu skill cho kỳ này.</p>
          ) : (
            <Accordion type="multiple" defaultValue={['core']} className="w-full">
              <AccordionItem value="core">
                <AccordionTrigger className="text-sm">Skill lõi ({coreSkillRows.length})</AccordionTrigger>
                <AccordionContent>
                  <SkillTable rows={coreSkillRows} overallStatus={overallStatus} />
                </AccordionContent>
              </AccordionItem>
              {suppSkillRows.length > 0 && (
                <AccordionItem value="supp">
                  <AccordionTrigger className="text-sm">Skill bổ trợ ({suppSkillRows.length})</AccordionTrigger>
                  <AccordionContent>
                    <SkillTable rows={suppSkillRows} overallStatus={overallStatus} />
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Radar */}
      {radarData.length >= 3 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Biểu đồ năng lực lõi (so với chuẩn vị trí)</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /></div>}>
              <SkillRadarChart data={radarData} />
            </Suspense>
          </CardContent>
        </Card>
      )}

      {/* Attitudes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><HeartHandshake className="w-4 h-4" /> 6 nhóm thái độ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ATTITUDE_DIMENSIONS.map(dim => {
            const att = attitudes.find(a => a.attitude_dimension_id === dim.id);
            const status = att?.manager_status || att?.self_status;
            const badge = statusBadge(status || '');
            const counts = att ? attitudeActionCounts[att.id] : null;
            const needsImprovement = status === 'can_cai_thien' || status === 'needs_improvement';
            return (
              <div key={dim.id} className="border rounded-md p-3 space-y-1">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="text-sm font-medium break-words">{dim.id}. {dim.name}</p>
                  <Badge variant={badge.variant} className="text-[11px]">{badge.label}</Badge>
                </div>
                {att?.evidence && <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{att.evidence}</p>}
                {needsImprovement && counts && counts.total > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Kế hoạch cải thiện: <strong>{counts.done}/{counts.total}</strong> hành động hoàn thành
                  </p>
                )}
                {needsImprovement && (!counts || counts.total === 0) && (
                  <p className="text-xs text-amber-600">Chưa có kế hoạch cải thiện</p>
                )}
              </div>
            );

          })}
        </CardContent>
      </Card>

      {/* IDP route */}
      {skillPriorities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" /> Lộ trình upskill đã đăng ký</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {skillPriorities.map((p: any) => (
                <div key={p.id} className="border rounded-md p-3 flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium break-words">{p.skill_catalog?.name || '—'}</p>
                    {p.reason_text && <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words mt-0.5">{p.reason_text}</p>}
                  </div>
                  <Badge variant="outline" className="text-[11px] whitespace-nowrap">L{p.current_level ?? 0} → L{p.target_level ?? 0}</Badge>
                </div>
              ))}

            </div>
          </CardContent>
        </Card>
      )}

      {/* Overall review */}
      <OverallReviewCard
        manager={form.manager_overall_review}
        pgd={form.pgd_overall_review}
        director={form.director_overall_review}
        managerCommentFallback={form.manager_comment}
        pgdCommentFallback={form.pgd_comment}
      />

      {/* Star */}
      <StarClassificationCard viewerIsEmployee={viewerIsEmployee} record={star} />
    </div>
  );
}

function SkillTable({ rows, overallStatus }: { rows: any[]; overallStatus: (r: any) => any }) {
  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full text-[13px] sm:text-sm min-w-[480px]">
        <thead>
          <tr className="text-left text-muted-foreground border-b">
            <th className="py-3 px-2 sticky left-0 bg-background z-10 max-w-[150px] sm:max-w-none">Skill</th>
            <th className="py-3 px-2 text-center min-w-[56px]">Tự ĐG</th>
            <th className="py-3 px-2 text-center min-w-[56px]">Yêu cầu</th>
            <th className="py-3 px-2 text-center min-w-[64px]">LĐ duyệt</th>
            <th className="py-3 px-2 text-center min-w-[48px]">GAP</th>
            <th className="py-3 px-2 min-w-[96px]">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const st = overallStatus(r);
            const actual = r.manager_assessed_level ?? r.self_assessed_level ?? 0;
            const gap = (r.required_level ?? 0) - actual;
            return (
              <tr key={r.skill_id} className="border-b last:border-0 align-top">
                <td className="py-3 px-2 sticky left-0 bg-background z-10 max-w-[150px] sm:max-w-[220px]">
                  <div className="font-mono text-[11px] text-muted-foreground">{r.skill_catalog?.code || ''}</div>
                  <div className="break-words leading-snug">{r.skill_catalog?.name || ''}</div>
                </td>
                <td className="py-3 px-2 text-center">{r.self_assessed_level ?? '—'}</td>
                <td className="py-3 px-2 text-center">{r.required_level ?? '—'}</td>
                <td className="py-3 px-2 text-center font-semibold">{r.manager_assessed_level ?? '—'}</td>
                <td className="py-3 px-2 text-center">{gap > 0 ? `-${gap}` : gap < 0 ? `+${-gap}` : '0'}</td>
                <td className="py-3 px-2"><Badge variant={st.variant} className="text-[11px]">{st.label}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>

    </div>
  );
}

