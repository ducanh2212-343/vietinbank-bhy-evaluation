import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Send, Loader2, FileDown } from 'lucide-react';
import { AIAdvisorPanel } from '@/components/ai/AIAdvisorPanel';
// exportBM01ToWord imported lazily on demand (keeps docx out of main bundle)
import { EvalSectionA } from '@/components/evaluation/EvalSectionA';
import { EvalSectionB, type CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';
import { EvalSectionC, type AttitudeAssessment } from '@/components/evaluation/EvalSectionC';
import { EvalSection1on1, type OneOnOneAnswers } from '@/components/evaluation/EvalSection1on1';
import { type SkillPriority } from './SkillPriorityPicker';
import { type SkillAction } from './SkillActionsBlock';
import { SkillDevelopmentBlock } from './SkillDevelopmentBlock';
import { AttitudePriorityPicker, type AttitudePriority } from './AttitudePriorityPicker';
import { AttitudeActionsBlock, type AttitudeAction } from './AttitudeActionsBlock';
import { AIActionsBlock, type AIAction } from './AIActionsBlock';
import { AICompetencyPortrait } from './AICompetencyPortrait';
import { PreviousActionsReview } from './PreviousActionsReview';
import { ATTITUDE_DIMENSIONS } from './AttitudeConstants';
import {
  filterQuarterCycles,
  getQuarterFormSubmission,
  mergeAllSkillAssessments,
  replaceCoreSkillAssessments,
  makeSupplementaryAssessment,
} from '@/lib/evaluationPersistence';

interface BMFormConfig {
  formNumber: '01' | '02' | '03';
  reviewQuarter: string;
  planQuarter: string;
  quarterLabel: string;
  cycleType: string;
  previousFormNumber?: '01' | '02';
}

interface Props {
  config: BMFormConfig;
}

// Map BM form number to the correct cycle name
const BM_CYCLE_MAP: Record<string, string> = {
  '01': 'Quý I/2026',
  '02': 'Quý II/2026',
  '03': 'Quý III/2026',
};

export function BMFormPage({ config }: Props) {
  const { profileId, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [cycleId, setCycleId] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [coreSkillConfigs, setCoreSkillConfigs] = useState<any[]>([]);
  const [cycles, setCycles] = useState<{ id: string; name: string }[]>([]);

  const [coreAssessments, setCoreAssessments] = useState<CoreSkillAssessment[]>([]);
  const [suppAssessments, setSuppAssessments] = useState<CoreSkillAssessment[]>([]);
  const [attitudeAssessments, setAttitudeAssessments] = useState<AttitudeAssessment[]>([]);
  const [skillPriorities, setSkillPriorities] = useState<SkillPriority[]>([]);
  const [skillActions, setSkillActions] = useState<SkillAction[]>([]);
  const [attitudePriorities, setAttitudePriorities] = useState<AttitudePriority[]>([]);
  const [attitudeActions, setAttitudeActions] = useState<AttitudeAction[]>([]);
  const [aiActions, setAiActions] = useState<AIAction[]>([]);
  const [oneOnOneEnabled, setOneOnOneEnabled] = useState(false);
  const [oneOnOneAnswers, setOneOnOneAnswers] = useState<OneOnOneAnswers>({});

  const [prevSkillPriorities, setPrevSkillPriorities] = useState<SkillPriority[]>([]);
  const [prevAttitudePriorities, setPrevAttitudePriorities] = useState<AttitudePriority[]>([]);
  const [previousFormId, setPreviousFormId] = useState<string | null>(null);
  const [previousCycleName, setPreviousCycleName] = useState<string>('');
  const [levelUpCarryover, setLevelUpCarryover] = useState<{ skill_id: string; skill_name: string; new_level: number }[]>([]);


  const targetCycleName = BM_CYCLE_MAP[config.formNumber] || 'Quý I/2026';

  const loadData = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);

    const [profRes, skillRes, cycleRes] = await Promise.all([
      supabase.from('profiles').select('*, departments!profiles_department_id_fkey(name), positions!profiles_position_id_fkey(name)').eq('id', profileId).maybeSingle(),
      supabase.from('skill_catalog').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('evaluation_cycles').select('id, name').eq('cycle_type', 'quarterly').order('start_date'),
    ]);

    let prof = profRes.data;
    if (prof) {
      const enriched: any = { ...prof };
      enriched.dept_name = prof.departments?.name || '';
      enriched.pos_name = prof.positions?.name || prof.position || '';
      if (prof.manager_id) {
        const { data: mgr } = await supabase.from('profiles').select('full_name').eq('id', prof.manager_id).maybeSingle();
        enriched.manager_name = mgr?.full_name || '';
      }
      if (prof.pgd_id) {
        const { data: pgd } = await supabase.from('profiles').select('full_name').eq('id', prof.pgd_id).maybeSingle();
        enriched.pgd_name = pgd?.full_name || '';
      }
      prof = enriched;
    }
    setProfile(prof);
    setAllSkills(skillRes.data || []);

    // Filter to only correct quarter cycles
    const quarterCycles = filterQuarterCycles(cycleRes.data || []);
    setCycles(quarterCycles);

    // Find the correct cycle for this BM
    const matchedCycle = quarterCycles.find((c: any) => c.name === targetCycleName);
    const cId = matchedCycle?.id;
    if (cId) setCycleId(cId);

    // Load position core skills
    let coreConfigs: any[] = [];
    if (prof?.position_id) {
      const { data: pcs } = await supabase.from('position_core_skills')
        .select('skill_id, minimum_level, advanced_level, sort_order')
        .eq('position_id', prof.position_id).order('sort_order');
      coreConfigs = pcs || [];
      setCoreSkillConfigs(coreConfigs);
    }

    const skillMap = new Map((skillRes.data || []).map((s: any) => [s.id, s]));
    const initialCoreAssessments: CoreSkillAssessment[] = coreConfigs.map((cs: any) => {
      const sk: any = skillMap.get(cs.skill_id);
      return {
        skill_id: cs.skill_id, skill_name: sk?.name || '—', skill_code: sk?.code || null,
        skill_group: sk?.skill_group || '', minimum_level: cs.minimum_level,
        advanced_level: cs.advanced_level, self_assessed_level: null,
        manager_assessed_level: null, evidence: '', employee_comment: '', manager_note: '',
        description: sk?.description ?? null,
        level1_description: sk?.level1_description ?? null,
        level2_description: sk?.level2_description ?? null,
        level3_description: sk?.level3_description ?? null,
        level4_description: sk?.level4_description ?? null,
        upskill_l0_l1: sk?.upskill_l0_l1 ?? null,
        upskill_l1_l2: sk?.upskill_l1_l2 ?? null,
        upskill_l2_l3: sk?.upskill_l2_l3 ?? null,
        upskill_l3_l4: sk?.upskill_l3_l4 ?? null,
      };
    });

    const initialAttitudes: AttitudeAssessment[] = ATTITUDE_DIMENSIONS.map(d => ({
      attitude_dimension_id: d.id, attitude_name: d.name, self_status: '', manager_status: '',
      current_status: '', issue_summary: '', desired_status: '', evidence: '',
      improvement_goal: '', employee_comment: '', manager_comment: '',
    }));

    // Find or create form_submission for this cycle
    setFormId(null);
    setSkillPriorities([]);
    setSkillActions([]);
    setAttitudePriorities([]);
    setAttitudeActions([]);
    setAiActions([]);
    setSuppAssessments([]);
    setOneOnOneEnabled(false);
    setOneOnOneAnswers({});
    setLevelUpCarryover([]);

    let resolvedCoreAssessments = initialCoreAssessments;
    let resolvedSuppAssessments: CoreSkillAssessment[] = [];
    let isFreshCurrentForm = false;
    let currentFid: string | null = null;



    if (cId) {
      const form = await getQuarterFormSubmission({
        employeeId: profileId,
        cycleId: cId,
        createIfMissing: true,
      });

      const fId = form?.id;
      currentFid = fId || null;

      if (fId) {
        setFormId(fId);


        // Load 1-1 data from form_submissions row
        const { data: subRow } = await supabase
          .from('form_submissions')
          .select('one_on_one_enabled, one_on_one_answers')
          .eq('id', fId)
          .maybeSingle();
        if (subRow) {
          setOneOnOneEnabled(!!(subRow as any).one_on_one_enabled);
          const ans = (subRow as any).one_on_one_answers;
          if (ans && typeof ans === 'object') setOneOnOneAnswers(ans as OneOnOneAnswers);
        }


        const [saRes, spRes, sActRes, apRes, aActRes, aiRes] = await Promise.all([
          supabase.from('skill_assessments').select('*').eq('form_id', fId),
          supabase.from('form_skill_priorities').select('*, skill_catalog(name, code, skill_group)').eq('form_id', fId).order('priority_order'),
          supabase.from('form_skill_actions').select('*').eq('form_id', fId).order('row_no'),
          supabase.from('form_attitude_priorities').select('*').eq('form_id', fId).order('priority_order'),
          supabase.from('form_attitude_actions').select('*').eq('form_id', fId).order('row_no'),
          supabase.from('form_ai_actions_v2').select('*').eq('form_id', fId).order('row_no'),
        ]);

        const merged = mergeAllSkillAssessments(initialCoreAssessments, saRes.data, skillRes.data || []);
        resolvedCoreAssessments = merged.core;
        resolvedSuppAssessments = merged.supplementary;

        const hasAnyAssessmentData = (saRes.data || []).some((a: any) =>
          a.self_assessed_level != null || a.manager_assessed_level != null || (a.evidence && a.evidence.trim())
        );
        isFreshCurrentForm = (spRes.data?.length || 0) === 0 && (sActRes.data?.length || 0) === 0 && !hasAnyAssessmentData;



        if (apRes.data?.length) {
          const apMap = new Map(apRes.data.map((a: any) => [a.attitude_dimension_id, a]));
          initialAttitudes.forEach(ia => {
            const saved = apMap.get(ia.attitude_dimension_id);
            if (saved) {
              ia.self_status = saved.self_status || '';
              ia.manager_status = saved.manager_status || '';
              ia.current_status = saved.current_status || '';
              ia.issue_summary = saved.issue_summary || '';
              ia.desired_status = saved.desired_status || '';
              ia.evidence = saved.evidence || '';
              ia.improvement_goal = saved.improvement_goal || '';
              ia.employee_comment = saved.employee_comment || '';
              ia.manager_comment = saved.manager_comment || '';
            }
          });
        }

        if (spRes.data?.length) {
          setSkillPriorities(spRes.data.map((s: any) => ({
            id: s.id, skill_id: s.skill_id, current_level: s.current_level,
            target_level: s.target_level, priority_order: s.priority_order,
            reason_text: s.reason_text || '', source_type: s.source_type,
            status: s.status, skill_name: s.skill_catalog?.name,
            skill_code: s.skill_catalog?.code, skill_group: s.skill_catalog?.skill_group,
          })));
        }

        if (sActRes.data?.length) {
          setSkillActions(sActRes.data.map((a: any) => ({
            id: a.id, skill_priority_id: a.skill_priority_id, row_no: a.row_no,
            action_type: a.action_type, action_text: a.action_text,
            expected_result: a.expected_result || '', deadline: a.deadline || '',
            requested_support: a.requested_support || '', evidence_expected: a.evidence_expected || '',
            status: a.status, actual_result: a.actual_result || '', manager_review: a.manager_review || '',
          })));
        }

        if (apRes.data?.length) {
          const improvementPriorities = apRes.data.filter((a: any) => a.improvement_goal || a.issue_summary);
          if (improvementPriorities.length) {
            setAttitudePriorities(improvementPriorities.map((a: any) => ({
              id: a.id, attitude_dimension_id: a.attitude_dimension_id,
              attitude_name: a.attitude_name, current_status: a.current_status || '',
              desired_status: a.desired_status || '', issue_summary: a.issue_summary || '',
              improvement_goal: a.improvement_goal || '', priority_order: a.priority_order, status: a.status,
            })));
          }
        }

        if (aActRes.data?.length) {
          setAttitudeActions(aActRes.data.map((a: any) => ({
            id: a.id, attitude_priority_id: a.attitude_priority_id, row_no: a.row_no,
            action_text: a.action_text, expected_evidence: a.expected_evidence || '',
            deadline: a.deadline || '', requested_support: a.requested_support || '',
            status: a.status, actual_result: a.actual_result || '', manager_review: a.manager_review || '',
          })));
        }

        if (aiRes.data?.length) {
          setAiActions(aiRes.data.map((a: any) => ({
            id: a.id, linked_skill_priority_id: a.linked_skill_priority_id || '',
            linked_attitude_priority_id: a.linked_attitude_priority_id || '',
            row_no: a.row_no, ai_action_text: a.ai_action_text,
            expected_result: a.expected_result || '', deadline: a.deadline || '',
            requested_support: a.requested_support || '', evidence_expected: a.evidence_expected || '',
            status: a.status, actual_result: a.actual_result || '', manager_review: a.manager_review || '',
            unlinked_reason: a.unlinked_reason || '',
          })));
        }
      }
    }

    // Load previous quarter data for BM02/BM03
    setPreviousFormId(null);
    setPreviousCycleName('');
    if (config.previousFormNumber) {
      const prevCycleName = BM_CYCLE_MAP[config.previousFormNumber];
      const prevCycle = quarterCycles.find((c: any) => c.name === prevCycleName);
      if (prevCycle) {
        setPreviousCycleName(prevCycleName);
        const { data: prevForms } = await supabase.from('form_submissions').select('id')
          .eq('cycle_id', prevCycle.id).eq('employee_id', profileId).limit(1);
        if (prevForms?.[0]) {
          const prevFid = prevForms[0].id;
          setPreviousFormId(prevFid);
          const [psp, pap, psa, prv, prevSa] = await Promise.all([
            supabase.from('form_skill_priorities').select('*, skill_catalog(name, code, skill_group)').eq('form_id', prevFid).order('priority_order'),
            supabase.from('form_attitude_priorities').select('*').eq('form_id', prevFid).order('priority_order'),
            supabase.from('form_skill_actions').select('*').eq('form_id', prevFid).order('row_no'),
            currentFid ? supabase.from('form_previous_action_reviews').select('source_action_id, source_action_type, status').eq('form_id', currentFid).eq('source_form_id', prevFid) : Promise.resolve({ data: [] as any[] }),
            supabase.from('skill_assessments').select('*').eq('form_id', prevFid),
          ]);
          if (psp.data) setPrevSkillPriorities(psp.data.map((s: any) => ({
            id: s.id, skill_id: s.skill_id, current_level: s.current_level, target_level: s.target_level,
            priority_order: s.priority_order, reason_text: s.reason_text || '', source_type: s.source_type,
            status: s.status, skill_name: s.skill_catalog?.name, skill_code: s.skill_catalog?.code,
          })));
          if (pap.data) setPrevAttitudePriorities(pap.data.map((a: any) => ({
            id: a.id, attitude_dimension_id: a.attitude_dimension_id, attitude_name: a.attitude_name,
            current_status: a.current_status || '', desired_status: a.desired_status || '',
            issue_summary: a.issue_summary || '', improvement_goal: a.improvement_goal || '',
            priority_order: a.priority_order, status: a.status,
          })));

          // ====== AUTO CARRY-OVER (only on fresh current form) ======
          if (isFreshCurrentForm && psp.data && psp.data.length > 0) {
            const reviewMap = new Map<string, string>(); // source_action_id -> manager status
            (prv.data || []).forEach((r: any) => {
              if (r.source_action_type === 'skill' && r.source_action_id) {
                reviewMap.set(r.source_action_id, r.status);
              }
            });
            const actionsBySkillPriority = new Map<string, any[]>();
            (psa.data || []).forEach((a: any) => {
              const arr = actionsBySkillPriority.get(a.skill_priority_id) || [];
              arr.push(a);
              actionsBySkillPriority.set(a.skill_priority_id, arr);
            });

            const carriedSkillPriorities: SkillPriority[] = [];
            const carriedSkillActions: SkillAction[] = [];
            const levelUps: { skill_id: string; skill_name: string; new_level: number }[] = [];

            psp.data.forEach((sp: any, idx: number) => {
              const acts = actionsBySkillPriority.get(sp.id) || [];
              // If there are no actions, treat as carried-over (not completed).
              const allCompleted = acts.length > 0 && acts.every(a => {
                const mgr = reviewMap.get(a.id);
                return mgr === 'completed' || (!mgr && a.status === 'completed');
              });

              if (allCompleted && sp.target_level != null) {
                // Bump level — handled by updating resolved assessments below
                levelUps.push({
                  skill_id: sp.skill_id,
                  skill_name: sp.skill_catalog?.name || 'Skill',
                  new_level: sp.target_level,
                });
              } else {
                // Carry over skill + incomplete actions
                const tmpId = `tmp-${crypto.randomUUID()}`;
                carriedSkillPriorities.push({
                  id: tmpId,
                  skill_id: sp.skill_id,
                  current_level: sp.current_level,
                  target_level: sp.target_level,
                  priority_order: idx + 1,
                  reason_text: sp.reason_text ? `${sp.reason_text} (Tiếp tục từ ${prevCycleName})` : `Tiếp tục từ ${prevCycleName}`,
                  source_type: sp.source_type || 'core_skill',
                  status: 'planned',
                  skill_name: sp.skill_catalog?.name,
                  skill_code: sp.skill_catalog?.code,
                  skill_group: sp.skill_catalog?.skill_group,
                } as SkillPriority);

                let row = 1;
                acts.forEach(a => {
                  const mgr = reviewMap.get(a.id);
                  const completed = mgr === 'completed' || (!mgr && a.status === 'completed');
                  if (completed) return;
                  carriedSkillActions.push({
                    skill_priority_id: tmpId,
                    row_no: row++,
                    action_type: a.action_type || '70',
                    action_text: a.action_text || '',
                    expected_result: a.expected_result || '',
                    deadline: '',
                    requested_support: a.requested_support || '',
                    evidence_expected: a.evidence_expected || '',
                    status: 'planned',
                    actual_result: '',
                    manager_review: `Tiếp tục từ ${prevCycleName}`,
                  } as SkillAction);
                });
              }
            });

            // Apply level bumps to assessments (core + supplementary)
            if (levelUps.length > 0) {
              const bumpMap = new Map(levelUps.map(l => [l.skill_id, l.new_level]));
              resolvedCoreAssessments = resolvedCoreAssessments.map(a => {
                const nl = bumpMap.get(a.skill_id);
                if (nl == null) return a;
                const cur = a.self_assessed_level ?? a.manager_assessed_level ?? 0;
                if (nl > cur) return { ...a, self_assessed_level: nl };
                return a;
              });
              resolvedSuppAssessments = resolvedSuppAssessments.map(a => {
                const nl = bumpMap.get(a.skill_id);
                if (nl == null) return a;
                const cur = a.self_assessed_level ?? a.manager_assessed_level ?? 0;
                if (nl > cur) return { ...a, self_assessed_level: nl };
                return a;
              });
              setLevelUpCarryover(levelUps);
            }

            if (carriedSkillPriorities.length > 0) {
              setSkillPriorities(carriedSkillPriorities);
              setSkillActions(carriedSkillActions);
            }
          }

          // ====== AUTO CARRY-OVER for Section B (assessments) ======
          if (prevSa.data && prevSa.data.length > 0) {
            const bumpMap = new Map<string, number>();
            const reviewMap2 = new Map<string, string>();
            (prv.data || []).forEach((r: any) => {
              if (r.source_action_type === 'skill' && r.source_action_id) reviewMap2.set(r.source_action_id, r.status);
            });
            const actsBySp = new Map<string, any[]>();
            (psa.data || []).forEach((a: any) => {
              const arr = actsBySp.get(a.skill_priority_id) || [];
              arr.push(a); actsBySp.set(a.skill_priority_id, arr);
            });
            (psp.data || []).forEach((sp: any) => {
              const acts = actsBySp.get(sp.id) || [];
              const allCompleted = acts.length > 0 && acts.every(a => {
                const mgr = reviewMap2.get(a.id);
                return mgr === 'completed' || (!mgr && a.status === 'completed');
              });
              if (allCompleted && sp.target_level != null) bumpMap.set(sp.skill_id, sp.target_level);
            });

            const prevAssessmentMap = new Map<string, any>();
            prevSa.data.forEach((sa: any) => prevAssessmentMap.set(sa.skill_id, sa));

            // Apply to core: bump beats current if higher; otherwise fill only if empty
            resolvedCoreAssessments = resolvedCoreAssessments.map(a => {
              const bump = bumpMap.get(a.skill_id);
              if (bump != null && (a.self_assessed_level ?? 0) < bump) {
                return { ...a, self_assessed_level: bump };
              }
              if (a.self_assessed_level != null) return a;
              const prev = prevAssessmentMap.get(a.skill_id);
              if (prev) {
                const inherited = prev.manager_assessed_level ?? prev.self_assessed_level;
                if (inherited != null) return { ...a, self_assessed_level: inherited };
              }
              return a;
            });

            // Apply to supplementary already present
            resolvedSuppAssessments = resolvedSuppAssessments.map(a => {
              const bump = bumpMap.get(a.skill_id);
              if (bump != null && (a.self_assessed_level ?? 0) < bump) {
                return { ...a, self_assessed_level: bump };
              }
              if (a.self_assessed_level != null) return a;
              const prev = prevAssessmentMap.get(a.skill_id);
              if (prev) {
                const inherited = prev.manager_assessed_level ?? prev.self_assessed_level;
                if (inherited != null) return { ...a, self_assessed_level: inherited };
              }
              return a;
            });


            // Add supplementary skills present in previous quarter but not yet in current
            const existingIds = new Set<string>([
              ...resolvedCoreAssessments.map(a => a.skill_id),
              ...resolvedSuppAssessments.map(a => a.skill_id),
            ]);
            const skillCatalog = skillRes.data || [];
            prevSa.data.forEach((sa: any) => {
              if (existingIds.has(sa.skill_id)) return;
              const created = makeSupplementaryAssessment(sa.skill_id, skillCatalog);
              if (!created) return;
              const bump = bumpMap.get(sa.skill_id);
              if (bump != null) created.self_assessed_level = bump;
              else {
                const inherited = sa.manager_assessed_level ?? sa.self_assessed_level;
                if (inherited != null) created.self_assessed_level = inherited;
              }
              resolvedSuppAssessments.push(created);
              existingIds.add(sa.skill_id);
            });

            // Refresh levelUpCarryover state with detected bumps (skills with name)
            const skillNameMap = new Map((skillCatalog as any[]).map((s: any) => [s.id, s.name]));
            const levelUpsForBanner = Array.from(bumpMap.entries()).map(([sid, nl]) => ({
              skill_id: sid,
              skill_name: skillNameMap.get(sid) || 'Skill',
              new_level: nl,
            }));
            if (levelUpsForBanner.length > 0) setLevelUpCarryover(levelUpsForBanner);
          }
        }

      }
    }

    setCoreAssessments(resolvedCoreAssessments);
    setSuppAssessments(resolvedSuppAssessments);
    setAttitudeAssessments(initialAttitudes);
    setLoading(false);
  }, [profileId, config]);

  useEffect(() => { loadData(); }, [loadData]);

  const [submitting, setSubmitting] = useState(false);

  const persistAllData = async (fId: string) => {
    // Save core assessments
    await replaceCoreSkillAssessments(fId, coreAssessments, suppAssessments);

    // Save attitudes
    await supabase.from('form_attitude_actions').delete().eq('form_id', fId);
    await supabase.from('form_attitude_priorities').delete().eq('form_id', fId);
    const insertedAttPriorities: Record<string, string> = {};
    for (const aa of attitudeAssessments) {
      const ip = attitudePriorities.find(p => p.attitude_dimension_id === aa.attitude_dimension_id);
      const { data, error } = await supabase.from('form_attitude_priorities').insert({
        form_id: fId, attitude_dimension_id: aa.attitude_dimension_id,
        attitude_name: aa.attitude_name, self_status: aa.self_status || null,
        manager_status: aa.manager_status || null, current_status: aa.current_status || null,
        desired_status: aa.desired_status || null, issue_summary: aa.issue_summary || null,
        improvement_goal: aa.improvement_goal || ip?.improvement_goal || null, evidence: aa.evidence || null,
        employee_comment: aa.employee_comment || null, manager_comment: aa.manager_comment || null,
        priority_order: aa.attitude_dimension_id, status: ip?.status || 'planned',
      }).select('id').single();
      if (error) throw error;
      if (data && ip?.id) insertedAttPriorities[ip.id] = data.id;
    }

    // Save skill priorities + actions
    await supabase.from('form_skill_actions').delete().eq('form_id', fId);
    await supabase.from('form_skill_priorities').delete().eq('form_id', fId);
    const insertedPriorities: Record<string, string> = {};
    for (const sp of skillPriorities) {
      const { data, error } = await supabase.from('form_skill_priorities').insert({
        form_id: fId, skill_id: sp.skill_id, current_level: sp.current_level,
        target_level: sp.target_level, priority_order: sp.priority_order,
        reason_text: sp.reason_text || null, source_type: sp.source_type, status: sp.status,
      }).select('id').single();
      if (error) throw error;
      if (data) insertedPriorities[sp.id || sp.skill_id] = data.id;
    }
    if (skillActions.length > 0) {
      const { error } = await supabase.from('form_skill_actions').insert(skillActions.map(a => ({
        form_id: fId, skill_priority_id: insertedPriorities[a.skill_priority_id] || a.skill_priority_id,
        row_no: a.row_no, action_type: a.action_type, action_text: a.action_text || 'Chưa nhập',
        expected_result: a.expected_result || null, deadline: a.deadline || null,
        requested_support: a.requested_support || null, evidence_expected: a.evidence_expected || null,
        status: a.status, actual_result: a.actual_result || null, manager_review: a.manager_review || null,
      })));
      if (error) throw error;
    }

    // Save attitude actions
    if (attitudeActions.length > 0) {
      const { error } = await supabase.from('form_attitude_actions').insert(attitudeActions.map(a => ({
        form_id: fId, attitude_priority_id: insertedAttPriorities[a.attitude_priority_id] || a.attitude_priority_id,
        row_no: a.row_no, action_text: a.action_text || 'Chưa nhập',
        expected_evidence: a.expected_evidence || null, deadline: a.deadline || null,
        requested_support: a.requested_support || null, status: a.status,
        actual_result: a.actual_result || null, manager_review: a.manager_review || null,
      })));
      if (error) throw error;
    }

    // Save AI actions
    await supabase.from('form_ai_actions_v2').delete().eq('form_id', fId);
    if (aiActions.length > 0) {
      const { error } = await supabase.from('form_ai_actions_v2').insert(aiActions.map(a => ({
        form_id: fId, linked_skill_priority_id: (a.linked_skill_priority_id && insertedPriorities[a.linked_skill_priority_id]) || null,
        linked_attitude_priority_id: (a.linked_attitude_priority_id && insertedAttPriorities[a.linked_attitude_priority_id]) || a.linked_attitude_priority_id || null,
        row_no: a.row_no, ai_action_text: a.ai_action_text || 'Chưa nhập',
        expected_result: a.expected_result || null, deadline: a.deadline || null,
        requested_support: a.requested_support || null, evidence_expected: a.evidence_expected || null,
        status: a.status, actual_result: a.actual_result || null,
        manager_review: a.manager_review || null, unlinked_reason: a.unlinked_reason || null,
      })));
      if (error) throw error;
    }
  };

  const saveDraft = async () => {
    if (!profileId || !cycleId) return;
    setSaving(true);
    try {
      const form = await getQuarterFormSubmission({
        employeeId: profileId,
        cycleId,
        createIfMissing: true,
      });
      if (!form?.id) throw new Error('Không thể tạo phiếu đánh giá');
      setFormId(form.id);
      await persistAllData(form.id);
      await supabase.from('form_submissions').update({
        status: 'draft',
        one_on_one_enabled: oneOnOneEnabled,
        one_on_one_answers: oneOnOneAnswers as any,
      }).eq('id', form.id);
      toast.success('Đã lưu nháp');
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi khi lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!profileId || !cycleId) return;
    setSubmitting(true);
    try {
      const form = await getQuarterFormSubmission({
        employeeId: profileId,
        cycleId,
        createIfMissing: true,
      });
      if (!form?.id) throw new Error('Không thể tạo phiếu đánh giá');
      setFormId(form.id);
      await persistAllData(form.id);
      const { error } = await supabase.from('form_submissions').update({
        status: 'submitted', submitted_at: new Date().toISOString(),
        one_on_one_enabled: oneOnOneEnabled,
        one_on_one_answers: oneOnOneAnswers as any,
      }).eq('id', form.id);
      if (error) throw error;
      toast.success('Đã nộp tự đánh giá');
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi khi nộp. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const isBusy = saving || submitting;

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải biểu mẫu...</div>;

  return (
    <div className="space-y-4 max-w-4xl pb-24">
      <div>
        <h1 className="page-header">Biểu mẫu {config.formNumber}: Rà soát {config.reviewQuarter} & Kế hoạch {config.planQuarter}</h1>
        <p className="page-subtitle">Kế hoạch hành động phát triển năng lực đến hết {config.quarterLabel}</p>
      </div>

      {/* A: Thông tin đánh giá - locked to this BM's quarter */}
      <EvalSectionA profile={profile} cycleId={cycleId} onCycleChange={setCycleId} cycles={cycles} lockedQuarter={targetCycleName} />

      {/* Level-up carry-over banner */}
      {levelUpCarryover.length > 0 && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm">
          <div className="font-semibold text-emerald-900 mb-1">
            🎉 Đã tự động ghi nhận tăng level từ {previousCycleName}
          </div>
          <ul className="list-disc pl-5 space-y-0.5 text-emerald-800">
            {levelUpCarryover.map(l => (
              <li key={l.skill_id}>
                <span className="font-medium">{l.skill_name}</span> → Level {l.new_level} (đã upskill thành công)
              </li>
            ))}
          </ul>
          <p className="text-xs text-emerald-700 mt-1">
            Các skill này đã được CBQL xác nhận hoàn thành kỳ trước. Mức level mới đã được điền sẵn ở Mục B — bạn có thể điều chỉnh nếu cần.
          </p>
        </div>
      )}


      {/* Previous quarter action review for BM02/BM03 */}
      {config.previousFormNumber && (
        <PreviousActionsReview
          formId={formId}
          previousFormId={previousFormId}
          previousCycleName={previousCycleName}
          isManager={false}
          onTransferIncomplete={(items) => {
            // Build new arrays appended to current plan
            const newSkillPriorities = [...skillPriorities];
            const newSkillActions = [...skillActions];
            const newAttPriorities = [...attitudePriorities];
            const newAttActions = [...attitudeActions];
            const newAiActions = [...aiActions];

            const norm = (s: string) => (s || '').trim().toLowerCase();
            let added = 0;
            for (const it of items) {
              const text = norm(it.action_text);
              if (!text) continue;
              if (it.type === 'skill' && it.skill_id) {
                let sp = newSkillPriorities.find(p => p.skill_id === it.skill_id);
                if (!sp) {
                  const sk: any = allSkills.find((s: any) => s.id === it.skill_id);
                  sp = {
                    id: `tmp-${crypto.randomUUID()}`,
                    skill_id: it.skill_id,
                    current_level: null,
                    target_level: null,
                    priority_order: newSkillPriorities.length + 1,
                    reason_text: `Tiếp tục từ ${previousCycleName}`,
                    source_type: 'core_skill',
                    status: 'planned',
                    skill_name: sk?.name,
                    skill_code: sk?.code,
                    skill_group: sk?.skill_group,
                  };
                  newSkillPriorities.push(sp);
                }
                const dup = newSkillActions.some(a => a.skill_priority_id === sp!.id && norm(a.action_text) === text);
                if (dup) continue;
                newSkillActions.push({
                  skill_priority_id: sp.id!,
                  row_no: newSkillActions.filter(a => a.skill_priority_id === sp!.id).length + 1,
                  action_type: '70',
                  action_text: it.action_text,
                  expected_result: it.expected_result || '',
                  deadline: '',
                  requested_support: '',
                  evidence_expected: '',
                  status: 'planned',
                  actual_result: '',
                  manager_review: `Tiếp tục từ ${previousCycleName}`,
                });
                added++;
              } else if (it.type === 'attitude' && it.attitude_dim_id) {
                let ap = newAttPriorities.find(p => p.attitude_dimension_id === it.attitude_dim_id);
                if (!ap) {
                  ap = {
                    id: `tmp-${crypto.randomUUID()}`,
                    attitude_dimension_id: it.attitude_dim_id,
                    attitude_name: it.attitude_name || it.label || 'Thái độ',
                    current_status: '',
                    desired_status: '',
                    issue_summary: '',
                    improvement_goal: `Tiếp tục từ ${previousCycleName}`,
                    priority_order: newAttPriorities.length + 1,
                    status: 'planned',
                  };
                  newAttPriorities.push(ap);
                }
                const dup = newAttActions.some(a => a.attitude_priority_id === ap!.id && norm(a.action_text) === text);
                if (dup) continue;
                newAttActions.push({
                  attitude_priority_id: ap.id!,
                  row_no: newAttActions.filter(a => a.attitude_priority_id === ap!.id).length + 1,
                  action_text: it.action_text,
                  expected_evidence: it.expected_result || '',
                  deadline: '',
                  requested_support: '',
                  status: 'planned',
                  actual_result: '',
                  manager_review: `Tiếp tục từ ${previousCycleName}`,
                });
                added++;
              } else if (it.type === 'ai') {
                const dup = newAiActions.some(a => norm(a.ai_action_text) === text);
                if (dup) continue;
                newAiActions.push({
                  linked_skill_priority_id: '',
                  linked_attitude_priority_id: '',
                  row_no: newAiActions.length + 1,
                  ai_action_text: it.action_text,
                  expected_result: it.expected_result || '',
                  deadline: '',
                  requested_support: '',
                  evidence_expected: '',
                  status: 'planned',
                  actual_result: '',
                  manager_review: `Tiếp tục từ ${previousCycleName}`,
                  unlinked_reason: '',
                });
                added++;
              }
            }

            setSkillPriorities(newSkillPriorities);
            setSkillActions(newSkillActions);
            setAttitudePriorities(newAttPriorities);
            setAttitudeActions(newAttActions);
            setAiActions(newAiActions);
          }}
        />
      )}

      {/* 1-1 Conversation questions (optional, before skill evaluation) */}
      <EvalSection1on1
        enabled={oneOnOneEnabled}
        onEnabledChange={setOneOnOneEnabled}
        answers={oneOnOneAnswers}
        onAnswersChange={setOneOnOneAnswers}
        isManager={false}
      />

      {/* B: Core skill evaluation */}
      <EvalSectionB
        assessments={coreAssessments}
        onChange={setCoreAssessments}
        isManager={false}
        role={profile?.pos_name}
        supplementary={suppAssessments}
        onSupplementaryChange={setSuppAssessments}
        allSkills={allSkills}
        levelUpSkillIds={new Set(levelUpCarryover.map(l => l.skill_id))}
      />

      {/* C: Attitude evaluation */}
      <EvalSectionC assessments={attitudeAssessments} onChange={setAttitudeAssessments} isManager={false} />

      {/* AI Competency Portrait — đặt trước mục D */}
      <AICompetencyPortrait
        profile={profile}
        coreAssessments={coreAssessments}
        supplementaryAssessments={suppAssessments}
        attitudeAssessments={attitudeAssessments}
        formId={formId}
        oneOnOneEnabled={oneOnOneEnabled}
        oneOnOneAnswers={oneOnOneAnswers}
      />

      {/* D: Skill development plan */}
      <div>
        <h2 className="text-sm font-semibold mb-2 px-1">D. Kế hoạch phát triển kỹ năng trong quý (tối đa 3 skill)</h2>
        <SkillDevelopmentBlock
          priorities={skillPriorities}
          actions={skillActions}
          onPrioritiesChange={setSkillPriorities}
          onActionsChange={setSkillActions}
          allSkills={allSkills}
          coreSkills={coreSkillConfigs}
          assessedLevels={[
            ...coreAssessments.map(a => ({ skill_id: a.skill_id, current_level: a.self_assessed_level ?? a.manager_assessed_level ?? null })),
            ...suppAssessments.map(a => ({ skill_id: a.skill_id, current_level: a.self_assessed_level ?? a.manager_assessed_level ?? null })),
          ]}
          positionId={profile?.position_id}
        />

      </div>

      {/* E: Attitude improvement plan */}
      <div>
        <h2 className="text-sm font-semibold mb-2 px-1">E. Kế hoạch cải thiện thái độ</h2>
        <AttitudePriorityPicker priorities={attitudePriorities} onChange={setAttitudePriorities} />
        <div className="mt-3">
          <AttitudeActionsBlock priorities={attitudePriorities} actions={attitudeActions} onChange={setAttitudeActions} />
        </div>
      </div>

      {/* F: AI actions */}
      <AIActionsBlock aiActions={aiActions} onChange={setAiActions} skillPriorities={skillPriorities} attitudePriorities={attitudePriorities} quarterLabel={config.quarterLabel} />

      {/* Sticky bottom bar — chừa safe-area cho iPhone home indicator */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 flex gap-2 z-50 max-w-4xl mx-auto"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <Button variant="outline" onClick={async () => {
          try {
            const { exportBM01ToWord } = await import('@/lib/exportBM01');
            await exportBM01ToWord({ profile: profile || {}, cycleName: targetCycleName, coreAssessments, supplementaryAssessments: suppAssessments, attitudeAssessments, oneOnOne: oneOnOneEnabled ? { enabled: true, answers: oneOnOneAnswers } : undefined });
            toast.success('Đã tải file Word');
          } catch (e: any) { toast.error('Lỗi xuất Word: ' + (e.message || '')); }
        }} disabled={isBusy} title="Xuất biểu mẫu Word">
          <FileDown className="w-4 h-4" />
        </Button>
        <Button onClick={saveDraft} disabled={isBusy} className="flex-1">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Đang lưu...' : 'Lưu nháp'}
        </Button>
        <Button variant="default" onClick={handleSubmit} disabled={isBusy} className="flex-1 bg-green-600 hover:bg-green-700">
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          {submitting ? 'Đang nộp...' : 'Nộp tự đánh giá'}
        </Button>
      </div>
      <AIAdvisorPanel />
    </div>
  );
}
