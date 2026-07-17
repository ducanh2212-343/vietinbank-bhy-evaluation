import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Save, Send, Loader2, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { ReturnDialog } from '@/components/evaluation/ReturnDialog';

import { EvalSectionA } from '@/components/evaluation/EvalSectionA';
import { EvalSectionB, type CoreSkillAssessment } from '@/components/evaluation/EvalSectionB';
import { EvalSectionC, type AttitudeAssessment } from '@/components/evaluation/EvalSectionC';
import { EvalSection1on1, type OneOnOneAnswers } from '@/components/evaluation/EvalSection1on1';
import { type SkillPriority } from '@/components/bm/SkillPriorityPicker';
import { AICompetencyPortrait } from '@/components/bm/AICompetencyPortrait';
import { type SkillAction } from '@/components/bm/SkillActionsBlock';
import { SkillDevelopmentBlock } from '@/components/bm/SkillDevelopmentBlock';
import { useHistoricalSkillLevels, mergeAssessedLevels } from '@/hooks/useHistoricalSkillLevels';
import { AttitudePriorityPicker, type AttitudePriority } from '@/components/bm/AttitudePriorityPicker';
import { AttitudeActionsBlock, type AttitudeAction } from '@/components/bm/AttitudeActionsBlock';
import { AIActionsBlock, type AIAction } from '@/components/bm/AIActionsBlock';
import { PreviousActionsReview } from '@/components/bm/PreviousActionsReview';
import { EvalSectionG } from '@/components/evaluation/EvalSectionG';
import { EvalSectionReviewer } from '@/components/evaluation/EvalSectionReviewer';
import { EvalSectionPGD } from '@/components/evaluation/EvalSectionPGD';
import { ATTITUDE_DIMENSIONS } from '@/components/bm/AttitudeConstants';
import { STATUS_FROM_DB, STATUS_TO_DB, sanitizeRating } from '@/components/evaluation/attitudeFocusOptions';
import {
  filterQuarterCycles,
  getQuarterFormSubmission,
  mergeAllSkillAssessments,
  pickActiveCycle,
  buildSkillAssessmentRows,
  saveEvaluationChildren,
} from '@/lib/evaluationPersistence';
import { OverallReviewBlock, type OverallReviewValue } from '@/components/evaluation/OverallReviewBlock';
import { StarClassificationBlock } from '@/components/evaluation/StarClassificationBlock';
import { getReviewerLevel, getOverallReviewField } from '@/lib/reviewerScope';
import { useCycleOneOnOneQuestions } from '@/hooks/useCycleOneOnOneQuestions';

const hasEmployeeOneOnOneAnswers = (answers: OneOnOneAnswers) =>
  Object.values(answers || {}).some((a: any) => (a?.employee || '').trim().length > 0);

export default function StaffEvaluation() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isManager, isPgd, profileId } = useAuth();
  const historicalLevels = useHistoricalSkillLevels(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [cycles, setCycles] = useState<{ id: string; name: string; status?: string }[]>([]);
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [coreSkillConfigs, setCoreSkillConfigs] = useState<any[]>([]);

  const [formId, setFormId] = useState<string | null>(null);
  // Khóa lạc quan: mốc updated_at của phiếu lúc mở, để phát hiện tab khác/người khác đã lưu
  const formUpdatedAtRef = useRef<string | null>(null);
  const [cycleId, setCycleId] = useState('');
  const oneOnOneQuestions = useCycleOneOnOneQuestions(cycleId);
  const [formStatus, setFormStatus] = useState('draft');

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
  const [previousFormId, setPreviousFormId] = useState<string | null>(null);
  const [previousCycleName, setPreviousCycleName] = useState<string>('');

  const [classification, setClassification] = useState('');
  const [remark, setRemark] = useState('');
  const [managerConclusion, setManagerConclusion] = useState('');
  const [overallReview, setOverallReview] = useState<OverallReviewValue>({});
  const [savingOverall, setSavingOverall] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [returnEmpOpen, setReturnEmpOpen] = useState(false);
  const [confirmReviewOpen, setConfirmReviewOpen] = useState(false);


  // Extended form metadata for review/return workflow
  const [formMeta, setFormMeta] = useState<{
    reviewer_id?: string | null;
    reviewer_name?: string | null;
    reviewed_at?: string | null;
    pgd_comment?: string | null;
    pgd_review_status?: string | null;
    pgd_reviewed_at?: string | null;
    returned_by?: string | null;
    returned_at?: string | null;
    return_reason?: string | null;
    return_target?: string | null;
    needs_manager_review_update?: boolean;
  }>({});

  const isSelfEval = id === profileId;
  const canReview = isAdmin || isManager || isPgd;
  const isManagerMode = canReview && !isSelfEval;

  const hasEmployeeAnswers = hasEmployeeOneOnOneAnswers(oneOnOneAnswers);
  const displayOneOnOne = oneOnOneEnabled || hasEmployeeAnswers || isManagerMode;

  const reviewerLevel = getReviewerLevel(
    { profileId, isManager, isPgd, isAdmin },
    profile ? { id: profile.id, manager_id: profile.manager_id, pgd_id: profile.pgd_id, director_id: profile.director_id } : null,
  );
  const reviewField = reviewerLevel ? getOverallReviewField(reviewerLevel) : null;

  // Phân quyền rõ theo cấp duyệt:
  // - Chỉ Trưởng phòng TRỰC TIẾP được sửa cột đánh giá của lãnh đạo (B/C), và chỉ khi
  //   phiếu đang chờ TP xử lý (submitted, hoặc PGĐ trả lại cho TP).
  // - PGĐ chỉ xem + duyệt/trả lại; admin không sửa B/C.
  // - NGOẠI LỆ (luồng rút gọn): cán bộ KHÔNG có Trưởng phòng trực tiếp (TP, PGĐ —
  //   cấp trên duy nhất là PGĐ/GĐ) → người đánh giá được chỉ định ở cấp PGĐ/GĐ vừa
  //   chấm điểm vừa phê duyệt gộp một bước.
  const isDirectManagerReviewer = reviewerLevel === 'manager';
  const isPgdReviewer = reviewerLevel === 'pgd';
  const isDirectorViewer = reviewerLevel === 'director';
  const isAssignedReviewer = !!profileId && formMeta.reviewer_id === profileId;
  const isSoleApprover =
    isAssignedReviewer && (isPgdReviewer || isDirectorViewer) && !profile?.manager_id && !isSelfEval;
  const canEditManagerAssessment =
    (isDirectManagerReviewer &&
      (formStatus === 'submitted' ||
        (formStatus === 'returned' && formMeta.return_target === 'manager') ||
        formMeta.return_target === 'manager')) ||
    (isSoleApprover && (formStatus === 'submitted' || formStatus === 'reviewed'));

  // Cán bộ tự mở phiếu của mình: chỉ sửa khi nháp hoặc bị trả lại
  const canEmployeeEditSelf = isSelfEval && (formStatus === 'draft' || formStatus === 'returned');
  // Khái niệm chốt: MỞ KỲ = admin bật in_progress (có thể từ ~20 tháng cuối quý cho TP kịp
  // đánh giá) → được nhập; ĐÓNG KỲ = chỉ xem. Ngày trên kỳ là nhãn, không chặn nhập theo ngày.
  const cycleOpen = cycles.find((c) => c.id === cycleId)?.status === 'in_progress';
  // Ai được bấm "Lưu nháp" phiếu này
  const canSaveForm = cycleOpen && (isSelfEval ? canEmployeeEditSelf : (canEditManagerAssessment || isAdmin));

  // Can the manager confirm review? Needs all core skills graded, all 6 attitudes graded,
  // and at least one of overallReview / remark / managerConclusion filled.
  const reviewMissing = useMemo(() => {
    const missing: string[] = [];
    if (coreAssessments.length === 0 || !coreAssessments.every(c => c.manager_assessed_level != null)) {
      missing.push('Còn skill lõi chưa được Trưởng phòng đánh giá');
    }
    if (attitudeAssessments.length < 6 || !attitudeAssessments.every(a => !!a.manager_status)) {
      missing.push('Còn nhóm thái độ chưa được Trưởng phòng đánh giá');
    }
    const overallFilled = Object.values(overallReview || {}).some(v => typeof v === 'string' && v.trim().length > 0);
    const remarkFilled = (remark || '').trim().length > 0;
    const conclusionFilled = (managerConclusion || '').trim().length > 0;
    if (!overallFilled && !remarkFilled && !conclusionFilled) {
      missing.push('Chưa có nhận xét/kết luận của Trưởng phòng');
    }
    return missing;
  }, [coreAssessments, attitudeAssessments, overallReview, remark, managerConclusion]);
  const canConfirmReview = reviewMissing.length === 0;


  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    // Load profile with department/position via separate queries to avoid self-join issues
    const [profRes, skillRes, cycleRes] = await Promise.all([
      supabase.from('profiles').select('*, departments!profiles_department_id_fkey(name), positions!profiles_position_id_fkey(name)').eq('id', id).maybeSingle(),
      supabase.from('skill_catalog').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('evaluation_cycles').select('id, name, status').eq('cycle_type', 'quarterly').order('start_date'),
    ]);

    let prof = profRes.data;

    // Resolve manager and pgd names via separate queries (self-join can fail)
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

    // Filter to only Quý I/II/III 2026 cycles
    const quarterCycles = filterQuarterCycles(cycleRes.data || []);
    setCycles(quarterCycles);

    // Mặc định là kỳ ĐANG MỞ (in_progress) — không lấy kỳ mới nhất theo ngày (VD Quý III đã đóng)
    const activeCycleId = cycleId || pickActiveCycle(quarterCycles)?.id || '';
    if (activeCycleId && activeCycleId !== cycleId) {
      setCycleId(activeCycleId);
    }

    // Load position core skills
    let coreConfigs: any[] = [];
    if (prof?.position_id) {
      const { data: pcs } = await supabase.from('position_core_skills')
        .select('skill_id, minimum_level, advanced_level, sort_order')
        .eq('position_id', prof.position_id)
        .order('sort_order');
      coreConfigs = pcs || [];
      setCoreSkillConfigs(coreConfigs);
    }

    // Build core skill assessment shells
    const skillMap = new Map((skillRes.data || []).map((s: any) => [s.id, s]));
    const initialCoreAssessments: CoreSkillAssessment[] = coreConfigs.map((cs: any) => {
      const sk: any = skillMap.get(cs.skill_id);
      return {
        skill_id: cs.skill_id,
        skill_name: sk?.name || '—',
        skill_code: sk?.code || null,
        skill_group: sk?.skill_group || '',
        minimum_level: cs.minimum_level,
        advanced_level: cs.advanced_level,
        self_assessed_level: null,
        manager_assessed_level: null,
        evidence: '',
        employee_comment: '',
        manager_note: '',
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

    // Build initial attitude assessments (đủ field model mới + legacy, đồng bộ với SelfAssessmentPage)
    const initialAttitudes: AttitudeAssessment[] = ATTITUDE_DIMENSIONS.map(d => ({
      attitude_dimension_id: d.id,
      attitude_name: d.name,
      self_status: '',
      manager_status: '',
      evidence_text: '',
      improvement_required: false,
      improvement_focus: [],
      improvement_focus_other: '',
      improvement_action: '',
      improvement_deadline: '',
      expected_evidence: '',
      support_needed: '',
      improvement_status: 'not_started',
      progress_note: '',
      // legacy
      current_status: '',
      issue_summary: '',
      desired_status: '',
      evidence: '',
      improvement_goal: '',
      employee_comment: '',
      manager_comment: '',
    }));

    setFormId(null);
    setFormStatus('draft');
    setManagerConclusion('');
    setSkillPriorities([]);
    setSkillActions([]);
    setAttitudePriorities([]);
    setAttitudeActions([]);
    setAiActions([]);
    setSuppAssessments([]);
    setOneOnOneEnabled(false);
    setOneOnOneAnswers({});
    setFormMeta({});

    let resolvedCoreAssessments = initialCoreAssessments;
    let resolvedSuppAssessments: CoreSkillAssessment[] = [];

    // Load existing form_submission for selected quarter only
    if (activeCycleId) {
      const form = await getQuarterFormSubmission({
        employeeId: id,
        cycleId: activeCycleId,
        createIfMissing: false,
      });

      if (form) {
        const fId = form.id;
        setFormId(fId);
        formUpdatedAtRef.current = (form as any).updated_at ?? null;
        setFormStatus(form.status);
        setManagerConclusion(form.manager_comment || '');
        setOneOnOneEnabled(!!(form as any).one_on_one_enabled);
        const ooa = (form as any).one_on_one_answers;
        setOneOnOneAnswers(ooa && typeof ooa === 'object' ? (ooa as OneOnOneAnswers) : {});

        // Extended metadata for review/return workflow
        const f: any = form;
        let reviewerName: string | null = null;
        if (f.reviewer_id) {
          const { data: rev } = await supabase.from('profiles').select('full_name').eq('id', f.reviewer_id).maybeSingle();
          reviewerName = rev?.full_name || null;
        }
        setFormMeta({
          reviewer_id: f.reviewer_id ?? null,
          reviewer_name: reviewerName,
          reviewed_at: f.reviewed_at ?? null,
          pgd_comment: f.pgd_comment ?? null,
          pgd_review_status: f.pgd_review_status ?? null,
          pgd_reviewed_at: f.pgd_reviewed_at ?? null,
          returned_by: f.returned_by ?? null,
          returned_at: f.returned_at ?? null,
          return_reason: f.return_reason ?? null,
          return_target: f.return_target ?? null,
          needs_manager_review_update: !!f.needs_manager_review_update,
        });
        // Load existing overall review for current reviewer level
        const localLevel = getReviewerLevel(
          { profileId, isManager, isPgd, isAdmin },
          prof ? { id: prof.id, manager_id: prof.manager_id, pgd_id: prof.pgd_id, director_id: prof.director_id } : null,
        );
        const orField = localLevel ? getOverallReviewField(localLevel) : null;
        const existingOr = orField ? (form as any)[orField] : null;
        setOverallReview(existingOr && typeof existingOr === 'object' ? existingOr : {});

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

        // Merge attitude assessments — hydrate cả model mới lẫn legacy (đồng bộ với SelfAssessmentPage)
        if (apRes.data?.length) {
          const apMap = new Map(apRes.data.map((a: any) => [a.attitude_dimension_id, a]));
          initialAttitudes.forEach(ia => {
            const saved: any = apMap.get(ia.attitude_dimension_id);
            if (saved) {
              ia.self_status = sanitizeRating(saved.self_status);
              ia.manager_status = sanitizeRating(saved.manager_status);
              ia.evidence_text = saved.evidence || '';
              // legacy
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
                  // legacy pipe format: "1a|1b|other:xxx"
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

          // Hydrate field kế hoạch từ form_attitude_actions (deadline, minh chứng, hỗ trợ, tiến độ)
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

        const improvementPriorities = (apRes.data || []).filter((a: any) =>
          a.improvement_goal || a.issue_summary
        );
        if (improvementPriorities.length) {
          setAttitudePriorities(improvementPriorities.map((a: any) => ({
            id: a.id, attitude_dimension_id: a.attitude_dimension_id,
            attitude_name: a.attitude_name, current_status: a.current_status || '',
            desired_status: a.desired_status || '', issue_summary: a.issue_summary || '',
            improvement_goal: a.improvement_goal || '', priority_order: a.priority_order,
            status: a.status,
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

    // Load admin_evaluations for classification/remark
    const { data: evalData } = await supabase.from('admin_evaluations')
      .select('*')
      .eq('employee_id', id)
      .eq('cycle_id', activeCycleId || '')
      .order('created_at', { ascending: false })
      .limit(1);
    if (evalData?.[0]) {
      setClassification(evalData[0].classification || '');
      setRemark(evalData[0].remark || '');
    } else {
      setClassification('');
      setRemark('');
    }

    // Find previous cycle and its form for review block
    setPreviousFormId(null);
    setPreviousCycleName('');
    const curIdx = quarterCycles.findIndex(c => c.id === activeCycleId);
    if (curIdx > 0) {
      const prev = quarterCycles[curIdx - 1];
      setPreviousCycleName(prev.name);
      const { data: prevForms } = await supabase.from('form_submissions').select('id')
        .eq('cycle_id', prev.id).eq('employee_id', id).limit(1);
      if (prevForms?.[0]) setPreviousFormId(prevForms[0].id);
    }

    setCoreAssessments(resolvedCoreAssessments);
    setSuppAssessments(resolvedSuppAssessments);
    setAttitudeAssessments(initialAttitudes);
    setLoading(false);
  }, [id, cycleId, profileId, isManager, isPgd, isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async (submit = false): Promise<boolean> => {
    if (!id || !cycleId) return false;
    if (!cycleOpen) {
      toast({
        title: 'Kỳ đánh giá chưa mở hoặc đã đóng',
        description: 'Quyền nhập phụ thuộc việc TCTH mở kỳ: kỳ đang mở mới được đánh giá. Cần chỉnh sửa kỳ đã đóng thì mở lại kỳ trong Quản lý kỳ đánh giá.',
        variant: 'destructive',
      });
      return false;
    }
    if (!canSaveForm) {
      toast({
        title: 'Bạn không có quyền lưu phiếu này',
        description: 'Chỉ Trưởng phòng trực tiếp (khi phiếu chờ rà soát) hoặc cán bộ (khi phiếu nháp/bị trả lại) được chỉnh sửa.',
        variant: 'destructive',
      });
      return false;
    }
    setSaving(true);

    try {
      const form = await getQuarterFormSubmission({
        employeeId: id,
        cycleId,
        createIfMissing: true,
        reviewerId: isDirectManagerReviewer ? profileId : null,
      });
      const fId = form?.id || null;
      setFormId(fId);

      if (!fId) throw new Error('Could not create form');

      // Khóa lạc quan: phiếu đã thay đổi kể từ lúc mở (tab cũ / người khác vừa lưu/duyệt) → chặn ghi đè
      if (formUpdatedAtRef.current && (form as any)?.updated_at && (form as any).updated_at !== formUpdatedAtRef.current) {
        toast({
          title: 'Phiếu đã được cập nhật ở nơi khác',
          description: 'Tab khác hoặc người khác vừa lưu/duyệt phiếu này. Vui lòng tải lại trang rồi thao tác lại.',
          variant: 'destructive',
        });
        return false;
      }

      // Determine next status: respect current submit flag, but preserve non-draft statuses when manager merely "saves draft"
      let nextStatus: string;
      if (submit) {
        // CB nộp: returned → submitted (nộp lại); draft → submitted; nếu đang submitted/reviewed/approved giữ nguyên
        nextStatus = (formStatus === 'draft' || formStatus === 'returned') ? 'submitted' : formStatus;
      } else {
        // Lưu nháp: chỉ chuyển 'draft' nếu hiện đang là draft/null; nếu đang ở submitted/reviewed/approved/returned → giữ nguyên để không phá trigger
        nextStatus = (formStatus && formStatus !== 'draft') ? formStatus : 'draft';
      }

      const formPayload: any = {
        status: nextStatus,
        manager_comment: managerConclusion || null,
      };
      // Chỉ ghi submitted_at khi thực sự nộp — lưu nháp không được xóa mốc thời gian nộp
      if (submit && nextStatus === 'submitted') {
        formPayload.submitted_at = new Date().toISOString();
      }
      if (isManagerMode) {
        if (oneOnOneEnabled || hasEmployeeAnswers) {
          formPayload.one_on_one_enabled = true;
        }
        formPayload.one_on_one_answers = oneOnOneAnswers as any;
      } else {
        formPayload.one_on_one_enabled = oneOnOneEnabled || hasEmployeeAnswers;
        formPayload.one_on_one_answers = oneOnOneAnswers as any;
      }
      // CB nộp lại sau khi bị trả → bật cờ cần TP cập nhật, xóa thông tin trả lại cũ
      if (submit && formStatus === 'returned' && isSelfEval) {
        formPayload.needs_manager_review_update = true;
        formPayload.returned_by = null;
        formPayload.returned_at = null;
        formPayload.return_reason = null;
        formPayload.return_target = null;
      }
      // Cờ needs_manager_review_update chỉ tắt khi TP bấm "Xác nhận rà soát" (xem handleConfirmReview)

      const { data: updatedForm, error: formError } = await supabase
        .from('form_submissions').update(formPayload).eq('id', fId).select('updated_at').single();
      if (formError) throw formError;
      // Chính lần ghi này cũng đổi updated_at — làm mới mốc NGAY, để nếu bước lưu bảng con
      // phía dưới lỗi giữa chừng thì lần bấm lưu lại không bị chặn oan "đã cập nhật ở nơi khác".
      formUpdatedAtRef.current = (updatedForm as any)?.updated_at ?? formUpdatedAtRef.current;

      // Lưu toàn bộ bảng con qua RPC atomic (giữ UUID hành động → Kanban không reset; rollback nếu lỗi).
      // Business logic (dòng nào giữ, giá trị field, carry-over, remap) vẫn ở client; RPC chỉ ghi atomic.

      // Map khóa priority phía client (id thật hoặc tmp-, và skill_id) → skill_id
      const spKeyToSkillId = new Map<string, string>();
      for (const sp of skillPriorities) {
        if (sp.id) spKeyToSkillId.set(sp.id, sp.skill_id);
        spKeyToSkillId.set(sp.skill_id, sp.skill_id);
      }
      // id priority thái độ (đã load) → attitude_dimension_id, để nối liên kết AI theo khóa tự nhiên
      const attPidToDim = new Map<string, number>();
      for (const p of attitudePriorities) {
        if (p.id) attPidToDim.set(p.id, p.attitude_dimension_id);
      }

      const skillAssessmentsPayload = buildSkillAssessmentRows(coreAssessments, suppAssessments);

      const skillPrioritiesPayload = skillPriorities.map(sp => ({
        skill_id: sp.skill_id, current_level: sp.current_level, target_level: sp.target_level,
        priority_order: sp.priority_order, reason_text: sp.reason_text || null,
        source_type: sp.source_type, status: sp.status,
      }));

      const skillActionsPayload = skillActions
        .map(a => ({
          id: a.id || null,
          skill_id: spKeyToSkillId.get(a.skill_priority_id) || null,
          row_no: a.row_no, action_type: a.action_type, action_text: a.action_text || 'Chưa nhập',
          expected_result: a.expected_result || null, deadline: a.deadline || null,
          requested_support: a.requested_support || null, evidence_expected: a.evidence_expected || null,
          status: a.status, actual_result: a.actual_result || null, manager_review: a.manager_review || null,
        }))
        .filter(r => r.skill_id);

      const attitudePrioritiesPayload: any[] = [];
      const attitudeActionsPayload: any[] = [];
      const seenAttActionKey = new Set<string>();
      for (const aa of attitudeAssessments) {
        const improvementP = attitudePriorities.find(p => p.attitude_dimension_id === aa.attitude_dimension_id);
        const hasFocus = (aa.improvement_focus && aa.improvement_focus.length) || !!aa.improvement_focus_other;
        const focusPayload = hasFocus
          ? JSON.stringify({ focus: aa.improvement_focus || [], other: aa.improvement_focus_other || '' })
          : null;
        // Giữ issue_summary legacy dạng text; payload focus JSON cũ thì bỏ (đã bỏ chọn focus)
        const legacyIssueSummary = (() => {
          const raw = aa.issue_summary || '';
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.focus)) return null;
          } catch { /* text thường → giữ lại */ }
          return raw;
        })();
        attitudePrioritiesPayload.push({
          attitude_dimension_id: aa.attitude_dimension_id,
          attitude_name: aa.attitude_name,
          self_status: aa.self_status || null,
          manager_status: aa.manager_status || null,
          current_status: aa.current_status || null,
          desired_status: aa.desired_status || null,
          issue_summary: focusPayload ?? legacyIssueSummary,
          improvement_goal: aa.improvement_action || aa.improvement_goal || improvementP?.improvement_goal || null,
          evidence: aa.evidence_text || aa.evidence || null,
          employee_comment: aa.employee_comment || null,
          manager_comment: aa.manager_comment || null,
          priority_order: aa.attitude_dimension_id,
          status: STATUS_TO_DB[aa.improvement_status || 'not_started'] || improvementP?.status || 'planned',
        });

        const dim = aa.attitude_dimension_id;
        const loadedRows = improvementP?.id ? attitudeActions.filter(x => x.attitude_priority_id === improvementP.id) : [];
        const planActive = aa.self_status === 'can_cai_thien' || aa.manager_status === 'can_cai_thien' || !!aa.improvement_required;
        const hasActionFields = !!(aa.improvement_action || aa.improvement_deadline || aa.expected_evidence || aa.support_needed || aa.progress_note);
        const pushAtt = (row: any) => {
          const key = `${dim}|${(row.action_text || '').trim().toLowerCase()}`;
          if (seenAttActionKey.has(key)) return;
          seenAttActionKey.add(key);
          attitudeActionsPayload.push(row);
        };
        let rowNo = 1;
        if (planActive && hasActionFields) {
          // Dòng 1 từ mục C; GIỮ id cũ (Kanban) + GIỮ nhận xét TP của dòng 1
          pushAtt({
            id: loadedRows[0]?.id || null, attitude_dimension_id: dim, row_no: rowNo++,
            action_text: aa.improvement_action || 'Chưa nhập',
            expected_evidence: aa.expected_evidence || null,
            deadline: aa.improvement_deadline || null,
            requested_support: aa.support_needed || null,
            status: STATUS_TO_DB[aa.improvement_status || 'not_started'] || 'planned',
            actual_result: aa.progress_note || null,
            manager_review: loadedRows[0]?.manager_review || null,
          });
          loadedRows.slice(1).forEach(r => pushAtt({
            id: r.id || null, attitude_dimension_id: dim, row_no: rowNo++,
            action_text: r.action_text || 'Chưa nhập',
            expected_evidence: r.expected_evidence || null,
            deadline: r.deadline || null,
            requested_support: r.requested_support || null,
            status: r.status, actual_result: r.actual_result || null,
            manager_review: r.manager_review || null,
          }));
        } else {
          loadedRows.forEach(r => pushAtt({
            id: r.id || null, attitude_dimension_id: dim, row_no: rowNo++,
            action_text: r.action_text || 'Chưa nhập',
            expected_evidence: r.expected_evidence || null,
            deadline: r.deadline || null,
            requested_support: r.requested_support || null,
            status: r.status, actual_result: r.actual_result || null,
            manager_review: r.manager_review || null,
          }));
        }
      }

      const aiActionsPayload = aiActions.map(a => ({
        id: a.id || null,
        linked_skill_id: (a.linked_skill_priority_id && spKeyToSkillId.get(a.linked_skill_priority_id)) || null,
        linked_attitude_dimension_id:
          (a.linked_attitude_priority_id && attPidToDim.get(a.linked_attitude_priority_id)) ?? null,
        row_no: a.row_no, ai_action_text: a.ai_action_text || 'Chưa nhập',
        expected_result: a.expected_result || null, deadline: a.deadline || null,
        requested_support: a.requested_support || null, evidence_expected: a.evidence_expected || null,
        status: a.status, actual_result: a.actual_result || null,
        manager_review: a.manager_review || null, unlinked_reason: a.unlinked_reason || null,
      }));

      await saveEvaluationChildren(fId, {
        skillAssessments: skillAssessmentsPayload,
        skillPriorities: skillPrioritiesPayload,
        skillActions: skillActionsPayload,
        attitudePriorities: attitudePrioritiesPayload,
        attitudeActions: attitudeActionsPayload,
        aiActions: aiActionsPayload,
      });

      // Save classification/remark
      const evalPayload = {
        employee_id: id, cycle_id: cycleId || null,
        classification: (classification || null) as any,
        remark: remark || null, updated_by: user?.id || null,
        completion_status: submit ? 'submitted' : 'draft',
      };
      const { data: existingEval } = await supabase.from('admin_evaluations')
        .select('id').eq('employee_id', id).eq('cycle_id', cycleId).limit(1);
      if (existingEval?.[0]) {
        await supabase.from('admin_evaluations').update(evalPayload).eq('id', existingEval[0].id);
      } else {
        await supabase.from('admin_evaluations').insert(evalPayload);
      }

      // status will be refreshed by loadData()
      toast({ title: submit ? 'Đã nộp đánh giá' : 'Đã lưu bản nháp' });
      await loadData();
      return true;
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Lỗi khi lưu', description: err.message, variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // --- Status action handlers (TP / PGĐ) ---
  const updateFormStatus = async (payload: Record<string, any>, successMsg: string) => {
    if (!formId) return;
    if (!cycleOpen) {
      toast({
        title: 'Kỳ đánh giá chưa mở hoặc đã đóng',
        description: 'Không thể duyệt/trả phiếu của kỳ không mở. Mở lại kỳ trong Quản lý kỳ đánh giá nếu cần.',
        variant: 'destructive',
      });
      return;
    }
    setActionLoading(true);
    const { error } = await supabase.from('form_submissions').update(payload as any).eq('id', formId);
    setActionLoading(false);
    if (error) {
      toast({ title: 'Lỗi cập nhật trạng thái', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: successMsg });
    await loadData();
  };

  const handleConfirmReview = async () => {
    if (!formId) return;
    // Save content first (skill/attitude/dev plan) then flip status.
    // Chỉ chuyển 'reviewed' khi lưu nội dung THÀNH CÔNG — tránh chuyển PGĐ trên dữ liệu chưa kịp ghi.
    const saved = await handleSave(false);
    if (!saved) {
      toast({
        title: 'Chưa thể xác nhận rà soát',
        description: 'Lưu nội dung đánh giá thất bại. Vui lòng kiểm tra kết nối và thử lại.',
        variant: 'destructive',
      });
      return;
    }
    await updateFormStatus({
      status: 'reviewed' as any,
      reviewer_id: profileId,
      reviewed_at: new Date().toISOString(),
      needs_manager_review_update: false,
      returned_by: null,
      returned_at: null,
      return_reason: null,
      return_target: null,
    }, 'Đã xác nhận rà soát · chuyển PGĐ');
  };

  const handleReturnToEmployee = (reason: string) =>
    updateFormStatus({
      status: 'returned' as any,
      returned_by: profileId,
      returned_at: new Date().toISOString(),
      return_reason: reason || null,
      return_target: 'employee',
    }, 'Đã trả lại cán bộ');

  const handleApprove = () =>
    updateFormStatus({
      status: 'approved' as any,
      pgd_review_status: 'approved',
      pgd_reviewed_at: new Date().toISOString(),
      returned_by: null,
      returned_at: null,
      return_reason: null,
      return_target: null,
    }, 'Đã phê duyệt phiếu đánh giá');

  // Luồng rút gọn cho cán bộ không có TP trung gian (TP/PGĐ): người đánh giá
  // cấp PGĐ/GĐ chấm điểm xong bấm một nút — hệ thống chạy đủ hai bước
  // rà soát (reviewed) và phê duyệt (approved) để giữ nguyên các mốc thời gian.
  const handleReviewAndApprove = async () => {
    if (!formId) return;
    await handleSave(false);
    setActionLoading(true);
    const now = new Date().toISOString();
    try {
      if (formStatus === 'submitted') {
        const { error: e1 } = await supabase.from('form_submissions').update({
          status: 'reviewed',
          reviewer_id: profileId,
          reviewed_at: now,
          needs_manager_review_update: false,
          returned_by: null,
          returned_at: null,
          return_reason: null,
          return_target: null,
        }).eq('id', formId);
        if (e1) throw e1;
      }
      const { error: e2 } = await supabase.from('form_submissions').update({
        status: 'approved',
        pgd_review_status: 'approved',
        pgd_reviewed_at: now,
      }).eq('id', formId);
      if (e2) throw e2;
      toast({ title: 'Đã đánh giá và phê duyệt phiếu' });
      await loadData();
    } catch (e) {
      toast({ title: 'Lỗi phê duyệt', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnToManager = (reason: string) =>
    updateFormStatus({
      status: 'submitted' as any,
      pgd_review_status: 'returned',
      returned_by: profileId,
      returned_at: new Date().toISOString(),
      return_reason: reason || null,
      return_target: 'manager',
    }, 'Đã trả lại trưởng phòng');

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải biểu mẫu đánh giá...</div>;

  return (
    <div className="max-w-4xl space-y-4 pb-24">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
      </Button>

      <div className="space-y-2">
        <h1 className="page-header">Đánh giá cán bộ</h1>
        <p className="page-subtitle">{profile?.full_name}</p>
        {(() => {
          if (formMeta.return_target === 'manager') {
            return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">PGĐ trả lại · Trưởng phòng cần cập nhật</Badge>;
          }
          if (formStatus === 'returned' && formMeta.return_target === 'employee') {
            return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">Trả lại cán bộ chỉnh sửa</Badge>;
          }
          if (formStatus === 'submitted') {
            return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Chờ Trưởng phòng rà soát</Badge>;
          }
          if (formStatus === 'reviewed') {
            return <Badge variant="outline" className="bg-sky-100 text-sky-800 border-sky-300">Trưởng phòng đã rà soát · Chờ PGĐ duyệt</Badge>;
          }
          if (formStatus === 'approved') {
            return <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300">Đã phê duyệt</Badge>;
          }
          return null;
        })()}
      </div>

      {/* Cảnh báo dữ liệu nền: user có role TP nhưng không phải manager trực tiếp */}
      {isManager && !isSelfEval && reviewerLevel !== 'manager' && !isAdmin && !isPgd && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Bạn có role Trưởng phòng nhưng không phải Quản lý trực tiếp của cán bộ này theo hồ sơ hiện tại.
            Vui lòng kiểm tra <code>manager_id</code> trong hồ sơ cán bộ.
          </span>
        </div>
      )}


      {/* A */}
      <EvalSectionA profile={profile} cycleId={cycleId} onCycleChange={setCycleId} cycles={cycles} />

      {/* Reviewer/PGĐ summary cards */}
      {formId && (
        <>
          <EvalSectionReviewer
            name={formMeta.reviewer_name || undefined}
            role={profile?.manager_id ? 'Trưởng phòng phụ trách' : 'Người đánh giá trực tiếp'}
            status={formStatus}
            reviewedAt={formMeta.reviewed_at || undefined}
          />
          <EvalSectionPGD
            pgdName={profile?.pgd_name || undefined}
            comment={formMeta.pgd_comment || undefined}
            status={formMeta.pgd_review_status || undefined}
            reviewedAt={formMeta.pgd_reviewed_at || undefined}
          />
        </>
      )}

      {/* Banner trả lại */}
      {formStatus === 'returned' && isSelfEval && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <div className="font-medium text-destructive flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> Trưởng phòng đã trả lại phiếu
          </div>
          {formMeta.return_reason && (
            <div className="mt-1 text-foreground/80"><span className="text-muted-foreground">Lý do:</span> {formMeta.return_reason}</div>
          )}
          <div className="mt-1 text-xs text-muted-foreground">Vui lòng cập nhật nội dung và nộp lại phiếu.</div>
        </div>
      )}
      {formMeta.return_target === 'manager' && isManagerMode && reviewerLevel === 'manager' && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <div className="font-medium text-destructive flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> PGĐ đã trả lại phiếu cho trưởng phòng
          </div>
          {formMeta.return_reason && (
            <div className="mt-1 text-foreground/80"><span className="text-muted-foreground">Lý do:</span> {formMeta.return_reason}</div>
          )}
          <div className="mt-1 text-xs text-muted-foreground">Vui lòng rà soát lại và bấm "Xác nhận rà soát" để chuyển PGĐ.</div>
        </div>
      )}

      {/* Rà soát hành động kỳ trước */}
      <PreviousActionsReview
        formId={formId}
        previousFormId={previousFormId}
        previousCycleName={previousCycleName}
        isManager={isManagerMode}
        onTransferIncomplete={(items) => {
          const newSkillPriorities = [...skillPriorities];
          const newSkillActions = [...skillActions];
          const newAttPriorities = [...attitudePriorities];
          const newAttActions = [...attitudeActions];
          const newAiActions = [...aiActions];
          const norm = (s: string) => (s || '').trim().toLowerCase();
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
                } as any;
                newSkillPriorities.push(sp);
              }
              if (newSkillActions.some(a => a.skill_priority_id === sp!.id && norm(a.action_text) === text)) continue;
              newSkillActions.push({
                skill_priority_id: sp.id!,
                row_no: newSkillActions.filter(a => a.skill_priority_id === sp!.id).length + 1,
                action_type: '70', action_text: it.action_text,
                expected_result: it.expected_result || '', deadline: '', requested_support: '',
                evidence_expected: '', status: 'planned', actual_result: '',
                manager_review: `Tiếp tục từ ${previousCycleName}`,
              } as any);
            } else if (it.type === 'attitude' && it.attitude_dim_id) {
              let ap = newAttPriorities.find(p => p.attitude_dimension_id === it.attitude_dim_id);
              if (!ap) {
                ap = {
                  id: `tmp-${crypto.randomUUID()}`,
                  attitude_dimension_id: it.attitude_dim_id,
                  attitude_name: it.attitude_name || it.label || 'Thái độ',
                  current_status: '', desired_status: '', issue_summary: '',
                  improvement_goal: `Tiếp tục từ ${previousCycleName}`,
                  priority_order: newAttPriorities.length + 1, status: 'planned',
                } as any;
                newAttPriorities.push(ap);
              }
              if (newAttActions.some(a => a.attitude_priority_id === ap!.id && norm(a.action_text) === text)) continue;
              newAttActions.push({
                attitude_priority_id: ap.id!,
                row_no: newAttActions.filter(a => a.attitude_priority_id === ap!.id).length + 1,
                action_text: it.action_text, expected_evidence: it.expected_result || '',
                deadline: '', requested_support: '', status: 'planned', actual_result: '',
                manager_review: `Tiếp tục từ ${previousCycleName}`,
              } as any);
            } else if (it.type === 'ai') {
              if (newAiActions.some(a => norm(a.ai_action_text) === text)) continue;
              newAiActions.push({
                linked_skill_priority_id: '', linked_attitude_priority_id: '',
                row_no: newAiActions.length + 1, ai_action_text: it.action_text,
                expected_result: it.expected_result || '', deadline: '', requested_support: '',
                evidence_expected: '', status: 'planned', actual_result: '',
                manager_review: `Tiếp tục từ ${previousCycleName}`, unlinked_reason: '',
              } as any);
            }
          }
          setSkillPriorities(newSkillPriorities);
          setSkillActions(newSkillActions);
          setAttitudePriorities(newAttPriorities);
          setAttitudeActions(newAttActions);
          setAiActions(newAiActions);
        }}
      />

      {/* 1-1 */}
      <EvalSection1on1
        enabled={displayOneOnOne}
        onEnabledChange={setOneOnOneEnabled}
        answers={oneOnOneAnswers}
        onAnswersChange={setOneOnOneAnswers}
        isManager={isManagerMode}
        questions={oneOnOneQuestions}
      />

      {/* Cảnh báo cập nhật khi CB nộp lại */}
      {isManagerMode && formMeta.needs_manager_review_update && (
        <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Cán bộ đã nộp lại phiếu sau khi bị trả. Vui lòng rà soát lại các cột <strong>QL ĐG skill</strong> và <strong>QL ĐG thái độ</strong>.
        </div>
      )}

      {/* B — chỉ Trưởng phòng trực tiếp được sửa cột đánh giá của lãnh đạo, đúng giai đoạn */}
      <EvalSectionB
        assessments={coreAssessments}
        onChange={setCoreAssessments}
        isManager={canEditManagerAssessment}
        role={profile?.pos_name}
        supplementary={suppAssessments}
        onSupplementaryChange={setSuppAssessments}
        allSkills={allSkills}
      />

      {/* C — như trên */}
      <EvalSectionC assessments={attitudeAssessments} onChange={setAttitudeAssessments} isManager={canEditManagerAssessment} />

      <AICompetencyPortrait
        profile={profile}
        coreAssessments={coreAssessments}
        supplementaryAssessments={suppAssessments}
        attitudeAssessments={attitudeAssessments}
        formId={formId ?? null}
        oneOnOneEnabled={oneOnOneEnabled}
        oneOnOneAnswers={oneOnOneAnswers}
      />

      {/* D */}
      <div>
        <h2 className="text-sm font-semibold mb-2 px-1">D. Kế hoạch phát triển kỹ năng trong quý (tối đa 3 skill)</h2>
        <SkillDevelopmentBlock
          priorities={skillPriorities}
          actions={skillActions}
          onPrioritiesChange={setSkillPriorities}
          onActionsChange={setSkillActions}
          allSkills={allSkills}
          coreSkills={coreSkillConfigs}
          assessedLevels={mergeAssessedLevels([
            ...coreAssessments.map(a => ({ skill_id: a.skill_id, current_level: a.manager_assessed_level ?? a.self_assessed_level ?? null })),
            ...suppAssessments.map(a => ({ skill_id: a.skill_id, current_level: a.manager_assessed_level ?? a.self_assessed_level ?? null })),
          ], historicalLevels)}
          positionId={profile?.position_id}
          cycleId={cycleId || undefined}
          menteeProfileId={id}
          menteeDepartmentId={profile?.department_id}
        />

      </div>

      {/* E */}
      <div>
        <h2 className="text-sm font-semibold mb-2 px-1">E. Kế hoạch cải thiện thái độ</h2>
        <AttitudePriorityPicker priorities={attitudePriorities} onChange={setAttitudePriorities} />
        <div className="mt-3">
          <AttitudeActionsBlock priorities={attitudePriorities} actions={attitudeActions} onChange={setAttitudeActions} />
        </div>
      </div>

      {/* F */}
      <AIActionsBlock aiActions={aiActions} onChange={setAiActions} skillPriorities={skillPriorities} attitudePriorities={attitudePriorities} quarterLabel="quý này" />

      {/* G — kết luận chỉ Trưởng phòng trực tiếp được sửa; PGĐ chỉ duyệt/trả lại */}
      <EvalSectionG
        classification={classification}
        remark={remark}
        managerConclusion={managerConclusion}
        formStatus={formStatus}
        evaluatorLevel={isManagerMode ? reviewerLevel : null}
        isManager={canEditManagerAssessment}
        isAdmin={isAdmin}
        canConfirmReview={canConfirmReview}
        actionLoading={actionLoading}
        hideManagerActions
        soleApprover={isSoleApprover}

        onClassificationChange={setClassification}
        onRemarkChange={setRemark}
        onConclusionChange={setManagerConclusion}
        onStatusChange={setFormStatus}
        onConfirmReview={handleConfirmReview}
        onReturnToEmployee={handleReturnToEmployee}
        onApprove={handleApprove}
        onReturnToManager={handleReturnToManager}
        onApproveDirect={handleReviewAndApprove}
      />

      {/* H — Đánh giá tổng thể của lãnh đạo (chỉ hiện khi actor là cấp trên của target) */}
      {reviewerLevel && reviewField && formId && (
        <div className="space-y-3">
          <OverallReviewBlock
            title={`Đánh giá tổng thể (${reviewerLevel === 'manager' ? 'Trưởng phòng' : reviewerLevel === 'pgd' ? 'Phó giám đốc' : 'Giám đốc'})`}
            value={overallReview}
            onChange={setOverallReview}
            disabled={savingOverall}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={savingOverall}
            onClick={async () => {
              if (!formId) return;
              setSavingOverall(true);
              const payload: any = {
                [reviewField]: overallReview,
                reviewer_id: profileId,
                reviewed_at: new Date().toISOString(),
              };
              const { error } = await supabase.from('form_submissions').update(payload).eq('id', formId);
              setSavingOverall(false);
              if (error) toast({ title: 'Lỗi lưu đánh giá tổng thể', description: error.message, variant: 'destructive' });
              else toast({ title: 'Đã lưu đánh giá tổng thể' });
            }}
          >
            {savingOverall ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Lưu đánh giá tổng thể
          </Button>
        </div>
      )}

      {/* I — Phân nhóm sao */}
      {reviewerLevel && cycleId && profileId && (
        <StarClassificationBlock
          cycleId={cycleId}
          employeeId={id!}
          formId={formId}
          myProfileId={profileId}
          evaluatorLevel={reviewerLevel}
          approverDefaultId={profile?.pgd_id ?? null}
          canEvaluate={reviewerLevel === 'manager' || isSoleApprover}
          canApprove={reviewerLevel === 'pgd' || isSoleApprover}
        />
      )}

      {/* Sticky bottom bar */}
      {(() => {
        const tpCanAct = canEditManagerAssessment;
        const tpWaitingEmployee =
          isDirectManagerReviewer && formStatus === 'returned' && formMeta.return_target === 'employee';

        return (
          <div
            className="fixed bottom-0 left-0 right-0 lg:left-60 bg-background border-t p-3 z-50"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
          >
            <div className="max-w-4xl mx-auto flex flex-col gap-2">
              {tpWaitingEmployee && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Đang chờ cán bộ chỉnh sửa và nộp lại. Bạn có thể lưu nháp ghi chú.
                </div>
              )}
              {tpCanAct && !canConfirmReview && (
                <div className="text-xs text-destructive flex items-start gap-1">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Chưa thể xác nhận rà soát: {reviewMissing.join(' · ')}.</span>
                </div>
              )}
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saving || !canSaveForm}
                  title={!canSaveForm ? 'Phiếu ở trạng thái hiện tại không cho phép bạn chỉnh sửa' : undefined}
                  className="flex-1 min-w-[140px]"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Lưu nháp
                </Button>
                {isSelfEval && (
                  <Button
                    variant="outline"
                    onClick={() => handleSave(true)}
                    disabled={saving || !canEmployeeEditSelf}
                    title={!canEmployeeEditSelf ? 'Phiếu đã nộp/duyệt — không thể nộp lại' : undefined}
                    className="flex-1 min-w-[140px]"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {formStatus === 'returned' ? 'Nộp lại đánh giá' : 'Nộp đánh giá'}
                  </Button>
                )}
                {tpCanAct && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => setReturnEmpOpen(true)}
                      disabled={actionLoading || saving}
                      className="flex-1 min-w-[160px]"
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Trả lại cán bộ
                    </Button>
                    <Button
                      onClick={() => setConfirmReviewOpen(true)}
                      disabled={!canConfirmReview || actionLoading || saving}
                      title={!canConfirmReview ? reviewMissing.join(' · ') : ''}
                      className="flex-1 min-w-[220px]"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      {isSoleApprover ? 'Đánh giá & phê duyệt' : 'Xác nhận rà soát / Chuyển PGĐ duyệt'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <ReturnDialog
        open={returnEmpOpen}
        onOpenChange={setReturnEmpOpen}
        loading={actionLoading}
        title="Trả lại cán bộ chỉnh sửa"
        description="Cán bộ sẽ nhận được phiếu kèm lý do trả lại để chỉnh sửa và nộp lại."
        onConfirm={(r) => { setReturnEmpOpen(false); handleReturnToEmployee(r); }}
      />

      <AlertDialog open={confirmReviewOpen} onOpenChange={setConfirmReviewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isSoleApprover ? 'Đánh giá & phê duyệt phiếu?' : 'Xác nhận rà soát?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isSoleApprover
                ? 'Bạn là cấp trên trực tiếp duy nhất của cán bộ này — phiếu sẽ được xác nhận đánh giá và phê duyệt hoàn tất trong một bước. Tiếp tục?'
                : 'Sau khi xác nhận rà soát, bản đánh giá sẽ chuyển PGĐ duyệt. Bạn có chắc chắn tiếp tục?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmReviewOpen(false);
                if (isSoleApprover) await handleReviewAndApprove();
                else await handleConfirmReview();
              }}
              disabled={actionLoading}
            >
              {isSoleApprover ? 'Phê duyệt hoàn tất' : 'Chuyển PGĐ duyệt'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
