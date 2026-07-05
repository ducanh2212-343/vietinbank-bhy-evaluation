import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Save, Send, Loader2, FileDown } from 'lucide-react';
import { EvalSectionA } from '@/components/evaluation/EvalSectionA';
import { EvalSectionB, type CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';
import { EvalSectionC, type AttitudeAssessment } from '@/components/evaluation/EvalSectionC';
import { EvalSection1on1, type OneOnOneAnswers } from '@/components/evaluation/EvalSection1on1';
import { type SkillPriority } from '@/components/bm/SkillPriorityPicker';
import { AICompetencyPortrait } from '@/components/bm/AICompetencyPortrait';
import { type SkillAction } from '@/components/bm/SkillActionsBlock';
import { SkillDevelopmentBlock } from '@/components/bm/SkillDevelopmentBlock';
import { AttitudePriorityPicker, type AttitudePriority } from '@/components/bm/AttitudePriorityPicker';
import { AttitudeActionsBlock, type AttitudeAction } from '@/components/bm/AttitudeActionsBlock';
import { AIActionsBlock, type AIAction } from '@/components/bm/AIActionsBlock';
import { PreviousActionsReview } from '@/components/bm/PreviousActionsReview';
import { ATTITUDE_DIMENSIONS } from '@/components/bm/AttitudeConstants';
import { EvalSectionE } from '@/components/evaluation/EvalSectionE';
import { EvalSectionReviewer } from '@/components/evaluation/EvalSectionReviewer';
import { EvalSectionPGD } from '@/components/evaluation/EvalSectionPGD';
import { STATUS_FROM_DB, STATUS_TO_DB, sanitizeRating } from '@/components/evaluation/attitudeFocusOptions';
import { AIAdvisorPanel } from '@/components/ai/AIAdvisorPanel';
// exportBM01ToWord imported lazily on demand (keeps docx out of main bundle)
import {
  filterQuarterCycles,
  getQuarterFormSubmission,
  mergeAllSkillAssessments,
  pickDefaultCycle,
  replaceCoreSkillAssessments,
} from '@/lib/evaluationPersistence';
import { validateSubmission, validateSubmissionDetailed } from '@/lib/evaluationValidation';
import { useCycleOneOnOneQuestions } from '@/hooks/useCycleOneOnOneQuestions';
import { SubmissionChecklist } from '@/components/evaluation/SubmissionChecklist';

export default function SelfAssessmentPage() {
  const { user, profileId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [cycles, setCycles] = useState<{ id: string; name: string }[]>([]);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [coreSkillConfigs, setCoreSkillConfigs] = useState<any[]>([]);

  const [formId, setFormId] = useState<string | null>(null);
  const [cycleId, setCycleId] = useState('');
  const oneOnOneQuestions = useCycleOneOnOneQuestions(cycleId);
  const [formStatus, setFormStatus] = useState('draft');
  const [returnedComment, setReturnedComment] = useState<string>('');

  const [coreAssessments, setCoreAssessments] = useState<CoreSkillAssessment[]>([]);
  const [suppAssessments, setSuppAssessments] = useState<CoreSkillAssessment[]>([]);
  const [attitudeAssessments, setAttitudeAssessments] = useState<AttitudeAssessment[]>([]);
  const [skillPriorities, setSkillPriorities] = useState<SkillPriority[]>([]);
  const [skillActions, setSkillActions] = useState<SkillAction[]>([]);
  const [attitudePriorities, setAttitudePriorities] = useState<AttitudePriority[]>([]);
  // Ánh xạ id nhóm thái độ cũ (đã load) → attitude_dimension_id, để remap liên kết hành động AI
  // sau khi form_attitude_priorities bị xóa-tạo-lại với id mới (tránh lỗi FK làm mất mục F).
  const attPidToDimRef = useRef<Map<string, number>>(new Map());
  const [attitudeActions, setAttitudeActions] = useState<AttitudeAction[]>([]);
  const [aiActions, setAiActions] = useState<AIAction[]>([]);
  const [oneOnOneEnabled, setOneOnOneEnabled] = useState(false);
  const [oneOnOneAnswers, setOneOnOneAnswers] = useState<OneOnOneAnswers>({});
  const [previousFormId, setPreviousFormId] = useState<string | null>(null);
  const [previousCycleName, setPreviousCycleName] = useState<string>('');

  type ReviewerOption = { id: string; name: string; role_label: string };
  const [reviewerOptions, setReviewerOptions] = useState<ReviewerOption[]>([]);
  const [reviewerDialogOpen, setReviewerDialogOpen] = useState(false);
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('');
  const [isGdcnSelf, setIsGdcnSelf] = useState(false);
  const [actualReviewer, setActualReviewer] = useState<{ name: string; role: string } | null>(null);
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [pgdComment, setPgdComment] = useState<string>('');
  const [pgdReviewStatus, setPgdReviewStatus] = useState<string>('pending');
  const [pgdReviewedAt, setPgdReviewedAt] = useState<string | null>(null);

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

    // Build reviewer options: manager, pgd, plus BGĐ/GĐCN candidates
    const opts: ReviewerOption[] = [];
    const seen = new Set<string>();
    const p: any = prof;
    if (p?.manager_id && p.manager_id !== profileId) {
      opts.push({ id: p.manager_id, name: p.manager_name || 'Quản lý trực tiếp', role_label: 'Quản lý trực tiếp' });
      seen.add(p.manager_id);
    }
    if (p?.pgd_id && p.pgd_id !== profileId && !seen.has(p.pgd_id)) {
      opts.push({ id: p.pgd_id, name: p.pgd_name || 'Ban giám đốc Phụ trách', role_label: 'Ban giám đốc Phụ trách' });
      seen.add(p.pgd_id);
    }
    const { data: bgdRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'bgd');
    const bgdUserIds = (bgdRoles || []).map((r: any) => r.user_id);
    if (bgdUserIds.length) {
      const { data: bgdProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, position')
        .in('user_id', bgdUserIds)
        .eq('status', 'active');
      (bgdProfiles || []).forEach((bp: any) => {
        if (bp.id !== profileId && !seen.has(bp.id)) {
          opts.push({ id: bp.id, name: bp.full_name, role_label: bp.position || 'Ban Giám đốc' });
          seen.add(bp.id);
        }
      });
    }
    const posName = (p?.pos_name || '').toLowerCase();
    const isGdcn = posName.includes('giám đốc chi nhánh');
    setIsGdcnSelf(isGdcn);
    if (isGdcn && profileId && !seen.has(profileId)) {
      opts.unshift({ id: profileId, name: p?.full_name || 'Tôi', role_label: 'Giám đốc chi nhánh (tự duyệt)' });
    }
    setReviewerOptions(opts);
    setSelectedReviewerId(prev => prev && opts.some(o => o.id === prev) ? prev : (opts[0]?.id || ''));

    const quarterCycles = filterQuarterCycles(cycleRes.data || []);
    setCycles(quarterCycles);

    const activeCycleId = cycleId || pickDefaultCycle(quarterCycles)?.id || '';
    if (activeCycleId && activeCycleId !== cycleId) {
      setCycleId(activeCycleId);
    }

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
      evidence_text: '', improvement_required: false, improvement_focus: [],
      improvement_focus_other: '', improvement_action: '', improvement_deadline: '',
      expected_evidence: '', support_needed: '', improvement_status: 'not_started', progress_note: '',
      // legacy fields kept for back-compat
      current_status: '', issue_summary: '', desired_status: '', evidence: '',
      improvement_goal: '', employee_comment: '', manager_comment: '',
    }));

    setFormId(null);
    setFormStatus('draft');
    setSkillPriorities([]);
    setSkillActions([]);
    setAttitudePriorities([]);
    setAttitudeActions([]);
    setAiActions([]);
    setSuppAssessments([]);
    setActualReviewer(null);
    setReviewedAt(null);
    setPgdComment('');
    setPgdReviewStatus('pending');
    setPgdReviewedAt(null);

    let resolvedCoreAssessments = initialCoreAssessments;
    let resolvedSuppAssessments: CoreSkillAssessment[] = [];

    // Load existing form
    if (activeCycleId) {
      const form = await getQuarterFormSubmission({
        employeeId: profileId,
        cycleId: activeCycleId,
        createIfMissing: false,
      });

      if (form) {
        setFormId(form.id);
        setFormStatus(form.status);
        // Ưu tiên lý do trả lại (return_reason) TP nhập trong hộp thoại "Trả lại"; nếu trống mới fallback về Kết luận (manager_comment)
        setReturnedComment(form.status === 'returned' ? ((form as any).return_reason || form.manager_comment || '') : '');
        setOneOnOneEnabled(!!(form as any).one_on_one_enabled);
        const ooa = (form as any).one_on_one_answers;
        setOneOnOneAnswers(ooa && typeof ooa === 'object' ? (ooa as OneOnOneAnswers) : {});
        setReviewedAt((form as any).reviewed_at || null);
        setPgdComment((form as any).pgd_comment || '');
        setPgdReviewStatus((form as any).pgd_review_status || 'pending');
        setPgdReviewedAt((form as any).pgd_reviewed_at || null);

        const reviewerIdFromForm = (form as any).reviewer_id as string | null;
        if (reviewerIdFromForm) {
          const { data: rv } = await supabase
            .from('profiles')
            .select('full_name, position, positions!profiles_position_id_fkey(name)')
            .eq('id', reviewerIdFromForm)
            .maybeSingle();
          if (rv) {
            setActualReviewer({
              name: (rv as any).full_name || '',
              role: (rv as any).positions?.name || (rv as any).position || '',
            });
          }
        }
        const fId = form.id;

        const [saRes, spRes, sActRes, apRes, aActRes, aiRes] = await Promise.all([
          supabase.from('skill_assessments').select('*').eq('form_id', fId),
          supabase.from('form_skill_priorities').select('*, skill_catalog(name, code, skill_group)').eq('form_id', fId).order('priority_order'),
          supabase.from('form_skill_actions').select('*').eq('form_id', fId).order('row_no'),
          supabase.from('form_attitude_priorities').select('*').eq('form_id', fId).order('priority_order'),
          supabase.from('form_attitude_actions').select('*').eq('form_id', fId).order('row_no'),
          supabase.from('form_ai_actions_v2').select('*').eq('form_id', fId).order('row_no'),
        ]);

        // Lưu ánh xạ id priority thái độ cũ → dimension để remap liên kết AI khi lưu
        attPidToDimRef.current = new Map<string, number>(
          (apRes.data || []).map((p: any) => [p.id as string, p.attitude_dimension_id as number]),
        );

        const merged = mergeAllSkillAssessments(initialCoreAssessments, saRes.data, skillRes.data || []);
        resolvedCoreAssessments = merged.core;
        resolvedSuppAssessments = merged.supplementary;

        if (apRes.data?.length) {
          const apMap = new Map(apRes.data.map((a: any) => [a.attitude_dimension_id, a]));
          initialAttitudes.forEach(ia => {
            const saved: any = apMap.get(ia.attitude_dimension_id);
            if (saved) {
              ia.self_status = sanitizeRating(saved.self_status);
              ia.manager_status = sanitizeRating(saved.manager_status);
              ia.evidence_text = saved.evidence || '';
              // legacy fields
              ia.current_status = saved.current_status || '';
              ia.issue_summary = saved.issue_summary || '';
              ia.desired_status = saved.desired_status || '';
              ia.evidence = saved.evidence || '';
              ia.improvement_goal = saved.improvement_goal || '';
              ia.employee_comment = saved.employee_comment || '';
              ia.manager_comment = saved.manager_comment || '';
              // parse focus payload từ issue_summary: ưu tiên JSON, fallback format pipe cũ
              const raw = saved.issue_summary || '';
              if (raw) {
                let parsedFocus: string[] | null = null;
                let parsedOther = '';
                try {
                  const parsed = JSON.parse(raw);
                  if (parsed && Array.isArray(parsed.focus)) {
                    parsedFocus = parsed.focus;
                    parsedOther = parsed.other || '';
                  }
                } catch {
                  // legacy pipe format: "1a|1b|other:xxx" hoặc "other:xxx"
                  const parts = raw.split('|').filter(Boolean);
                  const focusCodes: string[] = [];
                  parts.forEach((p: string) => {
                    if (p.startsWith('other:')) {
                      parsedOther = p.slice('other:'.length);
                      focusCodes.push('other');
                    } else {
                      focusCodes.push(p);
                    }
                  });
                  if (focusCodes.length) parsedFocus = focusCodes;
                }
                if (parsedFocus) ia.improvement_focus = parsedFocus;
                if (parsedOther) ia.improvement_focus_other = parsedOther;
              }
              ia.improvement_action = saved.improvement_goal || '';
              ia.improvement_status = STATUS_FROM_DB[saved.status] || 'not_started';
              ia.improvement_required = !!(saved.improvement_goal || (ia.improvement_focus && ia.improvement_focus.length));
            }
          });

          // Hydrate action-row fields (deadline, expected_evidence, support_needed, progress_note)
          if (aActRes.data?.length) {
            const apIdToDim = new Map<string, number>(apRes.data.map((p: any) => [p.id, p.attitude_dimension_id]));
            aActRes.data.forEach((act: any) => {
              const dimId = apIdToDim.get(act.attitude_priority_id);
              if (!dimId) return;
              const ia = initialAttitudes.find(x => x.attitude_dimension_id === dimId);
              if (!ia) return;
              if (act.action_text && act.action_text !== 'Chưa nhập') ia.improvement_action = act.action_text;
              if (act.deadline) ia.improvement_deadline = act.deadline;
              if (act.expected_evidence) ia.expected_evidence = act.expected_evidence;
              if (act.requested_support) ia.support_needed = act.requested_support;
              if (act.actual_result) ia.progress_note = act.actual_result;
              if (act.status) ia.improvement_status = STATUS_FROM_DB[act.status] || ia.improvement_status;
            });
          }
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

    // Find previous cycle and its form (for review block)
    setPreviousFormId(null);
    setPreviousCycleName('');
    const curIdx = quarterCycles.findIndex(c => c.id === activeCycleId);
    if (curIdx > 0) {
      const prev = quarterCycles[curIdx - 1];
      setPreviousCycleName(prev.name);
      const { data: prevForms } = await supabase.from('form_submissions').select('id')
        .eq('cycle_id', prev.id).eq('employee_id', profileId).limit(1);
      if (prevForms?.[0]) setPreviousFormId(prevForms[0].id);
    }

    setCoreAssessments(resolvedCoreAssessments);
    setSuppAssessments(resolvedSuppAssessments);
    setAttitudeAssessments(initialAttitudes);
    setLoading(false);
  }, [profileId, cycleId]);

  useEffect(() => { loadData(); }, [loadData]);

  const persistAllData = async (fId: string) => {
    // 1. Save core skill assessments
    await replaceCoreSkillAssessments(fId, coreAssessments, suppAssessments);

    // 2. Save attitudes — new model: kế hoạch cải thiện gộp trong từng nhóm (mục C)
    await supabase.from('form_attitude_actions').delete().eq('form_id', fId);
    await supabase.from('form_attitude_priorities').delete().eq('form_id', fId);
    const insertedAttPriorities: Record<number, string> = {};
    for (const aa of attitudeAssessments) {
      const hasFocus = (aa.improvement_focus && aa.improvement_focus.length) || !!aa.improvement_focus_other;
      const focusPayload = hasFocus
        ? JSON.stringify({ focus: aa.improvement_focus || [], other: aa.improvement_focus_other || '' })
        : null;
      // Giữ issue_summary legacy dạng text; payload focus JSON cũ thì bỏ (CB đã bỏ chọn focus)
      const legacyIssueSummary = (() => {
        const raw = aa.issue_summary || '';
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.focus)) return null;
        } catch { /* text thường → giữ lại */ }
        return raw;
      })();
      const planActive = aa.self_status === 'can_cai_thien' || aa.manager_status === 'can_cai_thien' || !!aa.improvement_required;
      const { data, error } = await supabase.from('form_attitude_priorities').insert({
        form_id: fId,
        attitude_dimension_id: aa.attitude_dimension_id,
        attitude_name: aa.attitude_name,
        self_status: aa.self_status || null,
        manager_status: aa.manager_status || null,
        // Giữ dữ liệu legacy đã load — không ghi đè null làm mất nhận xét của TP
        current_status: aa.current_status || null,
        desired_status: aa.desired_status || null,
        issue_summary: focusPayload ?? legacyIssueSummary,
        improvement_goal: aa.improvement_action || aa.improvement_goal || null,
        evidence: aa.evidence_text || aa.evidence || null,
        employee_comment: aa.employee_comment || null,
        manager_comment: aa.manager_comment || null,
        priority_order: aa.attitude_dimension_id,
        status: (aa.improvement_status === 'in_progress' ? 'in_progress'
              : aa.improvement_status === 'completed' ? 'completed' : 'planned'),
      }).select('id').single();
      if (error) throw error;
      if (data) insertedAttPriorities[aa.attitude_dimension_id] = data.id;

      const hasActionFields = !!(aa.improvement_action || aa.improvement_deadline || aa.expected_evidence || aa.support_needed || aa.progress_note);
      if (planActive && hasActionFields) {
        const { error: aerr } = await supabase.from('form_attitude_actions').insert({
          form_id: fId,
          attitude_priority_id: data!.id,
          row_no: 1,
          action_text: aa.improvement_action || 'Chưa nhập',
          expected_evidence: aa.expected_evidence || null,
          deadline: aa.improvement_deadline || null,
          requested_support: aa.support_needed || null,
          status: (aa.improvement_status === 'in_progress' ? 'in_progress'
                : aa.improvement_status === 'completed' ? 'completed' : 'planned'),
          actual_result: aa.progress_note || null,
          manager_review: null,
        });
        if (aerr) throw aerr;
      }
    }

    // 3. Save skill priorities + actions
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



    // 5. Save AI actions
    await supabase.from('form_ai_actions_v2').delete().eq('form_id', fId);
    if (aiActions.length > 0) {
      const { error } = await supabase.from('form_ai_actions_v2').insert(aiActions.map(a => ({
        form_id: fId, linked_skill_priority_id: (a.linked_skill_priority_id && insertedPriorities[a.linked_skill_priority_id]) || null,
        // Remap: id priority cũ → dimension → id priority MỚI vừa tạo; không khớp thì để null (tránh lỗi FK 23503)
        linked_attitude_priority_id: (() => {
          const oldPid = a.linked_attitude_priority_id;
          if (!oldPid) return null;
          const dim = attPidToDimRef.current.get(oldPid);
          return (dim != null && insertedAttPriorities[dim]) || null;
        })(),
        row_no: a.row_no, ai_action_text: a.ai_action_text || 'Chưa nhập',
        expected_result: a.expected_result || null, deadline: a.deadline || null,
        requested_support: a.requested_support || null, evidence_expected: a.evidence_expected || null,
        status: a.status, actual_result: a.actual_result || null,
        manager_review: a.manager_review || null, unlinked_reason: a.unlinked_reason || null,
      })));
      if (error) throw error;
    }
  };

  // Cán bộ chỉ được sửa khi phiếu ở trạng thái nháp hoặc bị trả lại
  const canEmployeeEdit = formStatus === 'draft' || formStatus === 'returned';

  const handleSave = async (submit = false, reviewerIdOverride?: string) => {
    if (!profileId || !cycleId) {
      toast.error('Thiếu thông tin kỳ đánh giá hoặc hồ sơ cán bộ');
      return;
    }
    if (!canEmployeeEdit) {
      toast.error('Phiếu đã được nộp hoặc đã duyệt — không thể chỉnh sửa. Liên hệ Trưởng phòng nếu cần trả lại phiếu.');
      return;
    }

    const reviewerId = submit ? (reviewerIdOverride || selectedReviewerId || null) : null;
    if (submit && !reviewerId) {
      toast.error('Vui lòng chọn người đánh giá trước khi nộp');
      return;
    }

    if (submit) setSubmitting(true);
    else setSaving(true);

    try {
      const form = await getQuarterFormSubmission({
        employeeId: profileId,
        cycleId,
        createIfMissing: true,
        reviewerId: reviewerId,
      });
      const fId = form?.id || null;
      setFormId(fId);
      if (!fId) throw new Error('Không thể tạo phiếu đánh giá');

      await persistAllData(fId);

      const hasOneOnOneAnswers = Object.values(oneOnOneAnswers || {}).some(
        (a: any) => (a?.employee || '').trim().length > 0,
      );
      const oneOnOneEnabledPayload = oneOnOneEnabled || hasOneOnOneAnswers;

      if (submit) {
        const submitPayload: any = {
          status: 'submitted', submitted_at: new Date().toISOString(),
          reviewer_id: reviewerId,
          one_on_one_enabled: oneOnOneEnabledPayload,
          one_on_one_answers: oneOnOneAnswers as any,
        };
        // Nộp lại sau khi bị trả → bật cờ để Trưởng phòng rà soát lại, xóa thông tin trả lại cũ
        if (formStatus === 'returned') {
          submitPayload.needs_manager_review_update = true;
          submitPayload.returned_by = null;
          submitPayload.returned_at = null;
          submitPayload.return_reason = null;
          submitPayload.return_target = null;
        }
        const { error } = await supabase.from('form_submissions').update(submitPayload).eq('id', fId);
        if (error) throw error;
        setFormStatus('submitted');
        toast.success('Đã nộp tự đánh giá');
      } else {
        // Lưu nháp: KHÔNG đổi trạng thái (draft giữ draft, returned giữ returned)
        const { error } = await supabase.from('form_submissions').update({
          one_on_one_enabled: oneOnOneEnabledPayload,
          one_on_one_answers: oneOnOneAnswers as any,
        }).eq('id', fId);
        if (error) throw error;
        toast.success('Đã lưu nháp');
      }

      await loadData();
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err.message || 'Lỗi khi lưu. Vui lòng thử lại.');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const onSubmitClick = () => {
    if (!canEmployeeEdit) {
      toast.error('Phiếu đã được nộp hoặc đã duyệt — không thể nộp lại.');
      return;
    }
    const errors = validateSubmission({
      coreAssessments, attitudeAssessments,
      skillPriorities, skillActions,
    });
    if (errors.length > 0) {
      toast.error('Chưa thể nộp đánh giá', {
        description: errors.map((e) => `• ${e}`).join('\n'),
        duration: 10000,
      });
      return;
    }
    if (reviewerOptions.length === 0) {
      toast.error('Không tìm thấy người đánh giá phù hợp. Vui lòng liên hệ quản trị viên.');
      return;
    }
    if (reviewerOptions.length === 1) {
      handleSave(true, reviewerOptions[0].id);
      return;
    }
    setReviewerDialogOpen(true);
  };

  const onConfirmReviewer = () => {
    if (!selectedReviewerId) {
      toast.error('Vui lòng chọn người đánh giá');
      return;
    }
    setReviewerDialogOpen(false);
    handleSave(true, selectedReviewerId);
  };

  const checklist = useMemo(
    () => validateSubmissionDetailed({
      coreAssessments, attitudeAssessments,
      skillPriorities, skillActions,
    }),
    [coreAssessments, attitudeAssessments, skillPriorities, skillActions],
  );

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const isBusy = saving || submitting;


  return (
    <div className="max-w-4xl space-y-4 pb-24">
      <div>
        <h1 className="page-header">Tự đánh giá</h1>
        <p className="page-subtitle">Phiếu tự đánh giá cá nhân</p>
      </div>

      {formStatus === 'returned' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-semibold text-destructive">Phiếu đã bị trả lại để chỉnh sửa</p>
          {returnedComment
            ? <p className="mt-1 whitespace-pre-line text-foreground/80">Lý do / ý kiến người duyệt: {returnedComment}</p>
            : <p className="mt-1 text-muted-foreground">Người duyệt chưa ghi lý do cụ thể. Vui lòng liên hệ trưởng phòng để biết nội dung cần chỉnh sửa.</p>}
        </div>
      )}
      {formStatus === 'submitted' && (
        <div className="rounded-md border border-amber-400/40 bg-amber-50 p-3 text-sm text-amber-900">
          Phiếu đang chờ người đánh giá duyệt.
        </div>
      )}
      {(formStatus === 'approved' || formStatus === 'reviewed') && (
        <div className="rounded-md border border-emerald-400/40 bg-emerald-50 p-3 text-sm text-emerald-900">
          Phiếu đã được duyệt.
        </div>
      )}

      {(() => {
        const selected = reviewerOptions.find(o => o.id === selectedReviewerId);
        const displayName = actualReviewer?.name || selected?.name || '';
        const displayRole = actualReviewer?.role || selected?.role_label || '';
        return (
          <EvalSectionA
            profile={profile}
            cycleId={cycleId}
            onCycleChange={setCycleId}
            cycles={cycles}
            reviewerName={displayName}
            reviewerRole={displayRole}
          />
        );
      })()}

      <EvalSection1on1
        enabled={oneOnOneEnabled}
        onEnabledChange={setOneOnOneEnabled}
        answers={oneOnOneAnswers}
        onAnswersChange={setOneOnOneAnswers}
        isManager={false}
        questions={oneOnOneQuestions}
      />

      <PreviousActionsReview
        formId={formId}
        previousFormId={previousFormId}
        previousCycleName={previousCycleName}
        isManager={false}
      />

      <div id="section-b">
      <EvalSectionB
        assessments={coreAssessments}
        onChange={setCoreAssessments}
        isManager={false}
        role={profile?.pos_name}
        supplementary={suppAssessments}
        onSupplementaryChange={setSuppAssessments}
        allSkills={allSkills}
      />
      </div>
      <div id="section-c">
        <EvalSectionC assessments={attitudeAssessments} onChange={setAttitudeAssessments} isManager={false} />
      </div>

      <AICompetencyPortrait
        profile={profile}
        coreAssessments={coreAssessments}
        supplementaryAssessments={suppAssessments}
        attitudeAssessments={attitudeAssessments}
        formId={formId ?? null}
        oneOnOneEnabled={oneOnOneEnabled}
        oneOnOneAnswers={oneOnOneAnswers}
      />

      <div id="section-d">
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

      <div id="section-e">
        <EvalSectionE assessments={attitudeAssessments} onChange={setAttitudeAssessments} />
      </div>

      <AIActionsBlock aiActions={aiActions} onChange={setAiActions} skillPriorities={skillPriorities} attitudePriorities={attitudePriorities} quarterLabel="quý này" />

      <EvalSectionReviewer
        name={actualReviewer?.name || reviewerOptions.find(o => o.id === selectedReviewerId)?.name}
        role={actualReviewer?.role || reviewerOptions.find(o => o.id === selectedReviewerId)?.role_label}
        status={formStatus}
        reviewedAt={reviewedAt}
      />

      <EvalSectionPGD
        pgdName={profile?.pgd_name}
        comment={pgdComment}
        status={pgdReviewStatus}
        reviewedAt={pgdReviewedAt}
      />

      <SubmissionChecklist {...checklist} />


      {/* Sticky bottom action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 flex gap-2 z-50 max-w-4xl mx-auto"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <Button variant="outline" onClick={async () => {
          try {
            const cycleName = cycles.find(c => c.id === cycleId)?.name || 'Quý';
            const { exportBM01ToWord } = await import('@/lib/exportBM01');
            // Lấy đủ nội dung theo quy trình: rà soát KH kỳ trước, câu hỏi 1-1,
            // nhận xét/đánh giá tổng thể của lãnh đạo và các mốc ký
            let extras;
            if (formId) {
              const { fetchBM01Extras } = await import('@/lib/exportBM01Data');
              extras = await fetchBM01Extras({
                formId,
                employeeName: profile?.full_name,
                pgdName: profile?.pgd_name,
                previousCycleName,
              });
            }
            await exportBM01ToWord({
              profile: profile || {},
              cycleName,
              coreAssessments,
              supplementaryAssessments: suppAssessments,
              attitudeAssessments,
              oneOnOne: oneOnOneEnabled ? { enabled: true, answers: oneOnOneAnswers as any } : undefined,
              extras,
            });
            toast.success('Đã tải file Word');
          } catch (e: any) { toast.error('Lỗi xuất Word: ' + (e.message || '')); }
        }} disabled={isBusy} title="Xuất biểu mẫu Word">
          <FileDown className="w-4 h-4" />
        </Button>
        <Button
          onClick={() => handleSave(false)}
          disabled={isBusy || !canEmployeeEdit}
          title={!canEmployeeEdit ? 'Phiếu đã nộp/duyệt — chỉ xem' : undefined}
          className="flex-1"
        >
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Đang lưu...' : 'Lưu nháp'}
        </Button>
        <Button
          variant="default"
          onClick={onSubmitClick}
          disabled={isBusy || !canEmployeeEdit || !checklist.canSubmit}
          title={!canEmployeeEdit ? 'Phiếu đã nộp/duyệt — chỉ xem' : !checklist.canSubmit ? 'Hoàn tất các mục còn thiếu để nộp' : undefined}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          {submitting ? 'Đang nộp...' : formStatus === 'returned' ? 'Nộp lại tự đánh giá' : 'Nộp tự đánh giá'}
        </Button>
      </div>

      <Dialog open={reviewerDialogOpen} onOpenChange={setReviewerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chọn người đánh giá</DialogTitle>
            <DialogDescription>
              {isGdcnSelf
                ? 'Bạn là Giám đốc chi nhánh — có thể tự duyệt hoặc gửi cho cấp khác.'
                : 'Phiếu sẽ được gửi tới người bạn chọn để duyệt.'}
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedReviewerId} onValueChange={setSelectedReviewerId} className="space-y-2">
            {reviewerOptions.map(opt => (
              <div key={opt.id} className="flex items-start gap-3 rounded-md border p-3 hover:bg-accent/40">
                <RadioGroupItem value={opt.id} id={`rv-${opt.id}`} className="mt-1" />
                <Label htmlFor={`rv-${opt.id}`} className="flex-1 cursor-pointer">
                  <div className="font-medium">{opt.name}</div>
                  <div className="text-xs text-muted-foreground">{opt.role_label}</div>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewerDialogOpen(false)}>Hủy</Button>
            <Button onClick={onConfirmReviewer} disabled={!selectedReviewerId} className="bg-green-600 hover:bg-green-700">
              Xác nhận nộp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AIAdvisorPanel />
    </div>
  );
}
