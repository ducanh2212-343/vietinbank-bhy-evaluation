import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkillLevelBadge } from '@/components/SkillLevelBadge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronDown, Target, Sparkles, Loader2, X, Plus, Trash2, Layers, Compass } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { makeSupplementaryAssessment } from '@/lib/evaluationPersistence';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { BrandMascotAI } from '@/components/branding/BrandAssets';
import { useSkillCriteria } from '@/hooks/useSkillCriteria';
import { LevelCheckWizard, type WizardApplyPayload } from '@/components/evaluation/LevelCheckWizard';
import { saveCriteriaResponses } from '@/lib/skillCriteria';
import { LevelQuickPick } from '@/components/evaluation/LevelQuickPick';
import { BARE_AGREEMENT_HINT, isBareAgreement } from '@/lib/reviewTextQuality';

export interface CoreSkillAssessment {
  skill_id: string;
  skill_name: string;
  skill_code: string | null;
  skill_group: string;
  minimum_level: number;
  advanced_level: number;
  self_assessed_level: number | null;
  manager_assessed_level: number | null;
  evidence: string;
  employee_comment: string;
  manager_note: string;
  description?: string | null;
  level1_description?: string | null;
  level2_description?: string | null;
  level3_description?: string | null;
  level4_description?: string | null;
  upskill_l0_l1?: string | null;
  upskill_l1_l2?: string | null;
  upskill_l2_l3?: string | null;
  upskill_l3_l4?: string | null;
}

/** Thông tin skill ở kỳ trước — hiện badge tham chiếu và cho phép chèn lại minh chứng cũ. */
export interface PrevSkillInfo {
  level: number;
  source: 'manager' | 'self';
  approved: boolean;
  evidence: string;
}

/** DOM id của hàng skill trong mục B — dùng chung với checklist để scroll tới đúng hàng. */
export function skillRowDomId(kind: 'core' | 'supp', skillId: string) {
  return `skill-row-${kind}-${skillId}`;
}

interface Props {
  assessments: CoreSkillAssessment[];
  onChange: (a: CoreSkillAssessment[]) => void;
  isManager: boolean;
  role?: string;
  // Supplementary skill support (optional — when omitted, the supplementary block is hidden)
  supplementary?: CoreSkillAssessment[];
  onSupplementaryChange?: (a: CoreSkillAssessment[]) => void;
  allSkills?: any[];
  /** Skill IDs that were auto-upskilled from previous quarter — rendered with a success highlight */
  levelUpSkillIds?: Set<string>;
  /** Có formId thì câu trả lời wizard tiêu chí được lưu lại cho quản lý xem breakdown */
  formId?: string | null;
  /** Điều khiển hàng đang mở từ ngoài (checklist jump-to-skill). Không truyền → tự quản lý như cũ. */
  openId?: string | null;
  onOpenIdChange?: (id: string | null) => void;
  /** Bật dãy nút chấm nhanh L0-L4 ngay trên hàng đóng (1 click/skill, không cần mở accordion) */
  quickRate?: boolean;
  quickRateTarget?: 'self' | 'manager';
  /** Level kỳ trước theo skill_id — badge "Kỳ trước: L2 ✓" + nút chèn minh chứng cũ */
  prevInfo?: Map<string, PrevSkillInfo>;
  prevCycleName?: string;
  onCopyPrevEvidence?: (kind: 'core' | 'supp', skillId: string) => void;
  /** Duyệt theo ngoại lệ (quản lý): nút "Đồng ý theo tự ĐG" per-skill + badge Lệch.
   *  CHỦ ĐÍCH không có "đồng ý tất cả" — mỗi skill là một quyết định riêng; skill cán bộ
   *  tự chấm L3+ phải mở hàng đọc minh chứng rồi mới đồng ý được (chống duyệt hình thức). */
  showAgreeControls?: boolean;
}

const LEVEL_OPTIONS = [
  { value: '0', label: 'L0 - Chưa hình thành' },
  { value: '1', label: 'L1 - Tân binh' },
  { value: '2', label: 'L2 - Độc lập' },
  { value: '3', label: 'L3 - Chuyên gia' },
  { value: '4', label: 'L4 - Bậc thầy' },
];

export function EvalSectionB({
  assessments,
  onChange,
  isManager,
  role,
  supplementary,
  onSupplementaryChange,
  allSkills,
  levelUpSkillIds,
  formId,
  openId: openIdProp,
  onOpenIdChange,
  quickRate,
  quickRateTarget = 'self',
  prevInfo,
  prevCycleName,
  onCopyPrevEvidence,
  showAgreeControls,
}: Props) {
  const { isEnabled: isAiEnabled } = useAiFeatures();
  const { getCriteria } = useSkillCriteria();
  const [internalOpenId, setInternalOpenId] = useState<string | null>(null);
  // Controlled nếu cha truyền openId (để checklist mở đúng hàng); uncontrolled như cũ nếu không
  const openId = openIdProp !== undefined ? openIdProp : internalOpenId;
  const setOpenId = (id: string | null) => {
    onOpenIdChange?.(id);
    if (openIdProp === undefined) setInternalOpenId(id);
  };
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiResults, setAiResults] = useState<Record<string, string>>({});
  const [evidenceAiLoading, setEvidenceAiLoading] = useState<Record<string, boolean>>({});
  const [evidenceAiResults, setEvidenceAiResults] = useState<Record<string, string>>({});
  const [suggestEvLoading, setSuggestEvLoading] = useState<Record<string, boolean>>({});
  const [suggestEvResults, setSuggestEvResults] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [wizardTarget, setWizardTarget] = useState<{ kind: 'core' | 'supp'; idx: number; a: CoreSkillAssessment } | null>(null);

  const applyWizardResult = async (payload: WizardApplyPayload) => {
    if (!wizardTarget) return;
    const { kind, idx, a } = wizardTarget;
    updateRow(kind, idx, 'self_assessed_level', payload.level);
    // Ghi tóm tắt vào minh chứng để quản lý thấy căn cứ (thay dòng wizard cũ nếu có)
    const cleaned = (a.evidence || '')
      .split('\n')
      .filter((line) => !line.startsWith('[Bộ tiêu chí]'))
      .join('\n')
      .trim();
    updateRow(kind, idx, 'evidence', cleaned ? `${cleaned}\n${payload.summary}` : payload.summary);
    toast.success(`Đã áp dụng L${payload.level} cho ${a.skill_name}`);
    if (formId) {
      const err = await saveCriteriaResponses(formId, a.skill_id, payload.answers);
      if (err) toast.error(`Không lưu được câu trả lời tiêu chí: ${err}`);
    }
  };

  const supportsSupplementary = !!onSupplementaryChange && !!allSkills;
  const suppList = supplementary || [];

  const toggleItem = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  // Chấm nhanh từ hàng đóng; tự chấm L3+ chưa có minh chứng → mở hàng để nhập ngay
  const handleQuickPick = (kind: 'core' | 'supp', idx: number, a: CoreSkillAssessment, lvl: number) => {
    const field = quickRateTarget === 'manager' ? 'manager_assessed_level' : 'self_assessed_level';
    updateRow(kind, idx, field, lvl);
    if (quickRateTarget === 'self' && lvl >= 3 && !(a.evidence || '').trim()) {
      const rowKey = `${kind}-${a.skill_id}`;
      setOpenId(rowKey);
      requestAnimationFrame(() => {
        document.getElementById(skillRowDomId(kind, a.skill_id))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  const updateRow = (
    kind: 'core' | 'supp',
    idx: number,
    field: keyof CoreSkillAssessment,
    value: any,
  ) => {
    if (kind === 'core') {
      const updated = [...assessments];
      (updated[idx] as any)[field] = value;
      onChange(updated);
    } else {
      if (!onSupplementaryChange) return;
      const updated = [...suppList];
      (updated[idx] as any)[field] = value;
      onSupplementaryChange(updated);
    }
  };

  const suggestAi = async (a: CoreSkillAssessment, kind: 'core' | 'supp') => {
    setAiLoading((prev) => ({ ...prev, [a.skill_id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          mode: 'coach_skill',
          role: role || 'cán bộ',
          is_core: kind === 'core',
          required: { min: a.minimum_level, adv: a.advanced_level },
          self_level: a.self_assessed_level,
          manager_level: a.manager_assessed_level,
          evidence: a.evidence || '',
          employee_comment: a.employee_comment || '',
          manager_note: a.manager_note || '',
          skill: {
            name: a.skill_name,
            code: a.skill_code,
            skill_group: a.skill_group,
            description: a.description,
            l1: a.level1_description,
            l2: a.level2_description,
            l3: a.level3_description,
            l4: a.level4_description,
            upskill_l0_l1: a.upskill_l0_l1,
            upskill_l1_l2: a.upskill_l1_l2,
            upskill_l2_l3: a.upskill_l2_l3,
            upskill_l3_l4: a.upskill_l3_l4,
          },
        },
      });
      if (error) throw error;
      const text = (data as any)?.text || '';
      if (!text) throw new Error('AI không trả về nội dung');
      setAiResults((prev) => ({ ...prev, [a.skill_id]: text }));
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('429')) toast.error('Quá nhiều yêu cầu AI, vui lòng thử lại sau.');
      else if (msg.includes('402')) toast.error('Hết credit AI. Vui lòng nạp thêm trong Cài đặt.');
      else toast.error(`Lỗi AI: ${msg || 'không kết nối được'}`);
    } finally {
      setAiLoading((prev) => ({ ...prev, [a.skill_id]: false }));
    }
  };


  const dismissSuggestion = (skillId: string) => {
    setAiResults((prev) => {
      const n = { ...prev };
      delete n[skillId];
      return n;
    });
  };

  // Thẩm định minh chứng khi tự chấm L3+: AI so minh chứng với mô tả level của skill
  const reviewEvidenceAi = async (a: CoreSkillAssessment, kind: 'core' | 'supp') => {
    setEvidenceAiLoading((prev) => ({ ...prev, [a.skill_id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          mode: 'evidence_review',
          role: role || 'cán bộ',
          is_core: kind === 'core',
          claimed_level: a.self_assessed_level,
          evidence: a.evidence || '',
          skill: {
            name: a.skill_name,
            code: a.skill_code,
            skill_group: a.skill_group,
            description: a.description,
            l1: a.level1_description,
            l2: a.level2_description,
            l3: a.level3_description,
            l4: a.level4_description,
          },
        },
      });
      if (error) throw error;
      const text = (data as { text?: string })?.text || '';
      if (!text) throw new Error('AI không trả về nội dung');
      setEvidenceAiResults((prev) => ({ ...prev, [a.skill_id]: text }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('429')) toast.error('Quá nhiều yêu cầu AI, vui lòng thử lại sau.');
      else toast.error(`Lỗi AI: ${msg || 'không kết nối được'}`);
    } finally {
      setEvidenceAiLoading((prev) => ({ ...prev, [a.skill_id]: false }));
    }
  };


  // Gợi ý DẠNG minh chứng phù hợp cho level đang tự chấm — chỉ tham khảo,
  // KHÔNG chèn tự động (minh chứng phải là việc thật của chính cán bộ).
  const suggestEvidenceAi = async (a: CoreSkillAssessment) => {
    setSuggestEvLoading((prev) => ({ ...prev, [a.skill_id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          mode: 'suggest_evidence',
          skill_name: a.skill_name,
          level: a.self_assessed_level,
          role: role || 'cán bộ',
          context: a.employee_comment || '',
        },
      });
      if (error) throw error;
      const text = (data as { text?: string })?.text || '';
      if (!text) throw new Error('AI không trả về nội dung');
      setSuggestEvResults((prev) => ({ ...prev, [a.skill_id]: text }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('429')) toast.error('Quá nhiều yêu cầu AI, vui lòng thử lại sau.');
      else toast.error(`Lỗi AI: ${msg || 'không kết nối được'}`);
    } finally {
      setSuggestEvLoading((prev) => ({ ...prev, [a.skill_id]: false }));
    }
  };

  const addSupplementary = (skillId: string) => {
    if (!onSupplementaryChange || !allSkills) return;
    if (suppList.some((s) => s.skill_id === skillId)) return;
    if (assessments.some((c) => c.skill_id === skillId)) return;
    const created = makeSupplementaryAssessment(skillId, allSkills);
    if (!created) return;
    onSupplementaryChange([...suppList, created]);
    setPickerOpen(false);
  };

  const removeSupplementary = (idx: number) => {
    if (!onSupplementaryChange) return;
    const updated = suppList.filter((_, i) => i !== idx);
    onSupplementaryChange(updated);
  };

  const usedSkillIds = new Set<string>([
    ...assessments.map((a) => a.skill_id),
    ...suppList.map((a) => a.skill_id),
  ]);
  const availableForPicker = (allSkills || []).filter((s: any) => !usedSkillIds.has(s.id));

  // Tiến độ chấm (null = chưa chấm; 0 vẫn tính là đã chấm)
  const ratedField: keyof CoreSkillAssessment =
    quickRateTarget === 'manager' ? 'manager_assessed_level' : 'self_assessed_level';
  const coreRatedCount = assessments.filter((a) => a[ratedField] != null).length;
  const suppRatedCount = suppList.filter((a) => a[ratedField] != null).length;

  // Đồng ý theo tự đánh giá — TỪNG skill một. Mức L3+ (Chuyên gia/Bậc thầy) không cho
  // đồng ý mù từ hàng đóng: mở hàng để đọc minh chứng trước, rồi đồng ý trong hàng.
  const agreeToSelf = (kind: 'core' | 'supp', idx: number, a: CoreSkillAssessment) => {
    if ((a.self_assessed_level ?? 0) >= 3) {
      const rowKey = `${kind}-${a.skill_id}`;
      if (openId !== rowKey) {
        setOpenId(rowKey);
        requestAnimationFrame(() => {
          document.getElementById(skillRowDomId(kind, a.skill_id))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        toast.info(`${a.skill_name}: cán bộ tự chấm L${a.self_assessed_level} — hãy đọc minh chứng rồi bấm Đồng ý trong hàng.`);
        return;
      }
    }
    updateRow(kind, idx, 'manager_assessed_level', a.self_assessed_level);
  };

  const renderRow = (a: CoreSkillAssessment, idx: number, kind: 'core' | 'supp') => {
    const isSupp = kind === 'supp';
    const selfLvl = a.self_assessed_level ?? 0;
    const gapMin = isSupp ? 0 : a.minimum_level - selfLvl;
    const gapAdv = isSupp ? 0 : a.advanced_level - selfLvl;
    const rowKey = `${kind}-${a.skill_id}`;
    const isOpen = openId === rowKey;
    const numberLabel = isSupp ? `B${idx + 1}` : String(idx + 1);
    const isLevelUp = !!levelUpSkillIds?.has(a.skill_id);

    const prev = prevInfo?.get(a.skill_id);
    const rawSelf = a.self_assessed_level;
    const rawMgr = a.manager_assessed_level;

    return (
      <Collapsible key={rowKey} id={skillRowDomId(kind, a.skill_id)} open={isOpen} onOpenChange={() => toggleItem(rowKey)}>
        <CollapsibleTrigger className="w-full">
          <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-lg transition-colors ${isLevelUp ? 'border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50' : 'hover:bg-muted/50'}`}>
            <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
              <Badge variant={isSupp ? 'secondary' : 'outline'} className="text-[10px] flex-shrink-0">
                {numberLabel}
              </Badge>
              <span className="hidden sm:inline font-medium text-sm truncate">
                {a.skill_code ? `${a.skill_code}. ` : ''}
                {a.skill_name}
              </span>
              {isLevelUp && (
                <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 flex-shrink-0">
                  ✨ Vừa upskill
                </Badge>
              )}
              {isSupp && (
                <Badge variant="outline" className="text-[9px] border-violet-300 dark:border-violet-500/40 text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 flex-shrink-0">
                  Bổ trợ
                </Badge>
              )}
              <span className="sm:hidden font-medium text-sm whitespace-normal break-words leading-snug text-left w-full">
                {a.skill_code ? `${a.skill_code}. ` : ''}
                {a.skill_name}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto flex-wrap justify-end">
              {prev && (
                <Badge
                  variant="outline"
                  className="text-[9px] text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 flex-shrink-0"
                  title={prev.approved ? 'Mức đã được quản lý duyệt ở kỳ trước' : 'Mức tự chấm ở kỳ trước'}
                >
                  Kỳ trước: L{prev.level}{prev.approved ? ' ✓' : ''}
                </Badge>
              )}
              {quickRate ? (
                <>
                  {quickRateTarget === 'manager' && (
                    <span className="inline-flex items-center gap-1" title="Mức tự đánh giá của cán bộ">
                      <span className="text-[9px] text-muted-foreground font-medium">NV</span>
                      <SkillLevelBadge level={rawSelf ?? 0} skillId={a.skill_id} />
                    </span>
                  )}
                  <LevelQuickPick
                    value={quickRateTarget === 'manager' ? rawMgr : rawSelf}
                    onChange={(lvl) => handleQuickPick(kind, idx, a, lvl)}
                    disabled={quickRateTarget === 'manager' ? !isManager : isManager}
                    ariaLabelPrefix={a.skill_name}
                  />
                </>
              ) : (
                <SkillLevelBadge level={selfLvl} skillId={a.skill_id} />
              )}
              {showAgreeControls && rawSelf != null && rawMgr == null && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    agreeToSelf(kind, idx, a);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      e.preventDefault();
                      agreeToSelf(kind, idx, a);
                    }
                  }}
                  className={`inline-flex items-center min-h-[32px] px-2 rounded-md border text-[11px] font-medium cursor-pointer flex-shrink-0 ${
                    rawSelf >= 3
                      ? 'border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20'
                      : 'border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                  }`}
                  title={
                    rawSelf >= 3
                      ? `Cán bộ tự chấm L${rawSelf} (Chuyên gia/Bậc thầy) — mở hàng đọc minh chứng trước khi đồng ý`
                      : `Đồng ý theo tự đánh giá của cán bộ — ghi nhận L${rawSelf}`
                  }
                >
                  {rawSelf >= 3 ? `Xem minh chứng L${rawSelf}` : `Đồng ý L${rawSelf}`}
                </span>
              )}
              {showAgreeControls && rawSelf == null && rawMgr == null && (
                <Badge variant="outline" className="text-[9px] text-muted-foreground flex-shrink-0">NV chưa chấm</Badge>
              )}
              {showAgreeControls && rawSelf != null && rawMgr != null && rawSelf !== rawMgr && (
                <Badge className="text-[9px] bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40 hover:bg-amber-100 flex-shrink-0">
                  Lệch · NV L{rawSelf}
                </Badge>
              )}
              {!isSupp && gapMin > 0 && (
                <Badge variant="destructive" className="text-[9px]">
                  Gap -{gapMin}
                </Badge>
              )}
              {isSupp && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSupplementary(idx);
                  }}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="Xoá skill bổ trợ này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border border-t-0 rounded-b-lg p-3 space-y-3">
            {/* Level requirements — only for core */}
            {!isSupp && (
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="text-muted-foreground">Tối thiểu: <strong className="text-foreground">L{a.minimum_level}</strong></span>
                <span className="text-muted-foreground">Nâng cao: <strong className="text-foreground">L{a.advanced_level}</strong></span>
                <span className="text-muted-foreground">Gap tối thiểu: <strong className={gapMin > 0 ? 'text-destructive' : 'text-green-600'}>{gapMin > 0 ? `-${gapMin}` : '✓'}</strong></span>
                <span className="text-muted-foreground">Gap nâng cao: <strong className={gapAdv > 0 ? 'text-orange-500' : 'text-green-600'}>{gapAdv > 0 ? `-${gapAdv}` : '✓'}</strong></span>
              </div>
            )}
            {isSupp && (
              <div className="text-[11px] text-muted-foreground italic">
                Skill bổ trợ ngoài chuẩn vị trí — không có L tối thiểu / nâng cao bắt buộc.
              </div>
            )}

            <SkillLevelReference assessment={a} />

            {/* Wizard xác định level theo bộ tiêu chí — hiện khi skill đã có tiêu chí */}
            {getCriteria(a.skill_id).length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                onClick={() => setWizardTarget({ kind, idx, a })}
              >
                <Compass className="w-3.5 h-3.5" />
                Xác định level theo bộ tiêu chí
              </Button>
            )}

            {/* Self & Manager levels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Tự đánh giá (NV)</label>
                <Select
                  value={String(a.self_assessed_level ?? 0)}
                  onValueChange={(v) => updateRow(kind, idx, 'self_assessed_level', parseInt(v))}
                  disabled={isManager}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Đánh giá của quản lý</label>
                <Select
                  value={String(a.manager_assessed_level ?? 0)}
                  onValueChange={(v) => updateRow(kind, idx, 'manager_assessed_level', parseInt(v))}
                  disabled={!isManager}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {showAgreeControls && isManager && rawMgr == null && rawSelf != null && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-1.5 h-7 text-xs border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                    onClick={() => updateRow(kind, idx, 'manager_assessed_level', rawSelf)}
                    title="Đã đọc minh chứng và nhất trí với mức cán bộ tự chấm"
                  >
                    Đồng ý L{rawSelf} theo tự đánh giá
                  </Button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">
                Minh chứng / Evidence
                {selfLvl >= 3 && <span className="text-orange-600 font-medium"> — bắt buộc khi tự chấm L3+</span>}
              </label>
              <Textarea
                value={a.evidence}
                onChange={(e) => updateRow(kind, idx, 'evidence', e.target.value)}
                className={`min-h-[40px] text-xs ${selfLvl >= 3 && !(a.evidence || '').trim() ? 'border-orange-400 focus-visible:ring-orange-400' : ''}`}
                placeholder={selfLvl >= 3
                  ? 'Bắt buộc: hồ sơ/việc thật đã xử lý, chứng chỉ, xác nhận của đồng nghiệp…'
                  : 'Minh chứng cụ thể cho level đánh giá...'}
                disabled={isManager}
              />
              {selfLvl >= 3 && !(a.evidence || '').trim() && (
                <p className="mt-1 text-[11px] text-orange-700">
                  Level Chuyên gia/Bậc thầy cần được chứng minh — phiếu sẽ không nộp được nếu bỏ trống minh chứng.
                </p>
              )}
              {!isManager && selfLvl >= 3 && !(a.evidence || '').trim() && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {prev?.evidence && onCopyPrevEvidence && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => onCopyPrevEvidence(kind, a.skill_id)}
                      title="Chèn lại minh chứng đã khai ở kỳ trước để cập nhật thay vì viết mới từ đầu"
                    >
                      Chèn minh chứng kỳ trước{prevCycleName ? ` (${prevCycleName})` : ''}
                    </Button>
                  )}
                  {isAiEnabled('suggest_evidence') && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => suggestEvidenceAi(a)}
                      disabled={suggestEvLoading[a.skill_id]}
                      title="AI gợi ý các DẠNG minh chứng phù hợp với level — tham khảo rồi tự viết bằng việc thật của bạn"
                    >
                      {suggestEvLoading[a.skill_id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrandMascotAI className="w-4 h-4" />}
                      AI gợi ý dạng minh chứng
                    </Button>
                  )}
                </div>
              )}
              {suggestEvResults[a.skill_id] && (
                <div className="mt-2 rounded-md border border-violet-200 bg-violet-50/60 dark:border-violet-500/30 dark:bg-violet-500/10 p-2.5 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                      <BrandMascotAI className="w-4 h-4" /> Gợi ý dạng minh chứng phù hợp L{selfLvl}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSuggestEvResults((prevR) => { const n = { ...prevR }; delete n[a.skill_id]; return n; })}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="prose prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 text-foreground">
                    <ReactMarkdown>{suggestEvResults[a.skill_id]}</ReactMarkdown>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Chỉ là gợi ý dạng minh chứng — hãy tự viết bằng hồ sơ/việc thật của chính bạn.
                  </p>
                </div>
              )}
              {selfLvl >= 3 && (a.evidence || '').trim() && isAiEnabled('evidence_review') && (
                <div className="mt-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => reviewEvidenceAi(a, kind)}
                    disabled={evidenceAiLoading[a.skill_id]}
                    title="AI so minh chứng với mô tả level của skill trước khi trình duyệt"
                  >
                    {evidenceAiLoading[a.skill_id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrandMascotAI className="w-4 h-4" />}
                    AI thẩm định minh chứng L{selfLvl}
                  </Button>
                  {evidenceAiResults[a.skill_id] && (
                    <div className="mt-2 rounded-md border border-violet-200 bg-violet-50/60 p-2.5 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-violet-800 flex items-center gap-1.5">
                          <BrandMascotAI className="w-4 h-4" /> Kết quả thẩm định minh chứng
                        </span>
                        <button
                          type="button"
                          onClick={() => setEvidenceAiResults((prev) => { const n = { ...prev }; delete n[a.skill_id]; return n; })}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="prose prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 text-foreground">
                        <ReactMarkdown>{evidenceAiResults[a.skill_id]}</ReactMarkdown>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        Kết quả chỉ để tham khảo trước khi trình duyệt — quyết định cuối cùng thuộc về người duyệt.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Nhận xét của nhân viên</label>
              <Textarea
                value={a.employee_comment}
                onChange={(e) => updateRow(kind, idx, 'employee_comment', e.target.value)}
                className="min-h-[36px] text-xs"
                disabled={isManager}
              />
            </div>

            <div>
              {isAiEnabled('coach_skill') && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => suggestAi(a, kind)}
                    disabled={aiLoading[a.skill_id]}
                    title="Tư vấn dựa trên minh chứng, mức yêu cầu vị trí và nhận xét"
                  >
                    {aiLoading[a.skill_id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrandMascotAI className="w-4 h-4" />}
                    Khuyến nghị AI
                  </Button>
                </div>
              )}
              {aiResults[a.skill_id] && (
                <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-primary flex items-center gap-1.5">
                      <BrandMascotAI className="w-4 h-4" /> Tư vấn từ AI
                    </span>
                    <button type="button" onClick={() => dismissSuggestion(a.skill_id)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="prose prose-xs max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 text-foreground">
                    <ReactMarkdown>{aiResults[a.skill_id]}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {(() => {
              const mismatchNeedsNote =
                !!showAgreeControls &&
                rawSelf != null &&
                rawMgr != null &&
                rawSelf !== rawMgr &&
                !(a.manager_note || '').trim();
              // "Đồng ý" suông: khuyến nghị mềm (không chặn lưu); nhường chỗ khi đã có cảnh báo chấm lệch.
              const bareAgreement = !mismatchNeedsNote && isBareAgreement(a.manager_note);
              return (
                <div>
                  <label className="text-xs text-muted-foreground">
                    Nhận xét của quản lý
                    {mismatchNeedsNote && (
                      <span className="text-amber-700 dark:text-amber-400 font-medium"> — bắt buộc khi chấm lệch với cán bộ</span>
                    )}
                  </label>
                  <Textarea
                    value={a.manager_note}
                    onChange={(e) => updateRow(kind, idx, 'manager_note', e.target.value)}
                    className={`min-h-[36px] text-xs ${mismatchNeedsNote || bareAgreement ? 'border-amber-400 focus-visible:ring-amber-400' : ''}`}
                    placeholder={
                      showAgreeControls && isManager
                        ? 'Vì sao bạn chấm mức này? Cán bộ cần làm gì để lên mức tiếp theo? (căn cứ trao đổi 1-1)'
                        : undefined
                    }
                    disabled={!isManager}
                  />
                  {mismatchNeedsNote && (
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                      Bạn chấm L{rawMgr} trong khi cán bộ tự chấm L{rawSelf} — ghi rõ lý do và định hướng upskill
                      để cán bộ hiểu (phiếu sẽ không xác nhận rà soát được nếu bỏ trống).
                    </p>
                  )}
                  {bareAgreement && (
                    <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">{BARE_AGREEMENT_HINT}</p>
                  )}
                </div>
              );
            })()}

          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-3">
      {wizardTarget && (
        <LevelCheckWizard
          open={!!wizardTarget}
          onOpenChange={(o) => { if (!o) setWizardTarget(null); }}
          skillId={wizardTarget.a.skill_id}
          skillName={wizardTarget.a.skill_name}
          skillCode={wizardTarget.a.skill_code}
          criteria={getCriteria(wizardTarget.a.skill_id)}
          startLevel={wizardTarget.a.self_assessed_level ?? 0}
          onApply={applyWizardResult}
        />
      )}

      {/* B1. Core skills */}
      <Card>
        <CardHeader className={`pb-2 space-y-1.5 ${quickRate ? 'sticky top-0 z-10 bg-card rounded-t-xl border-b' : ''}`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" /> B. Đánh giá Skill lõi theo vị trí
            </CardTitle>
            {quickRate && assessments.length > 0 && (
              <span className={`text-xs font-semibold tabular-nums ${coreRatedCount === assessments.length ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                Đã chấm {coreRatedCount}/{assessments.length}
                {suppList.length > 0 ? ` · bổ trợ ${suppRatedCount}/${suppList.length}` : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {assessments.length} skill lõi
            {supportsSupplementary && suppList.length > 0 ? ` + ${suppList.length} skill bổ trợ` : ''}
            {quickRate ? ' — chấm nhanh bằng dãy L0-L4 trên từng dòng, mở dòng khi cần xem mô tả/nhập minh chứng' : ''}
          </p>
          {quickRate && assessments.length > 0 && (
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${coreRatedCount === assessments.length ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${(coreRatedCount / assessments.length) * 100}%` }}
              />
            </div>
          )}
          {showAgreeControls && (
            <p className="text-[11px] text-muted-foreground">
              Duyệt từng skill: bấm "Đồng ý Lx" khi nhất trí với cán bộ, hoặc chấm mức khác trên dãy L0-L4.
              Skill tự chấm L3+ cần mở hàng đọc minh chứng trước. Chấm lệch thì ghi rõ nhận xét để trao đổi 1-1.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Chưa có skill lõi nào được cấu hình cho vị trí này.
            </p>
          ) : (
            assessments.map((a, idx) => renderRow(a, idx, 'core'))
          )}
        </CardContent>
      </Card>

      {/* B2. Supplementary skills */}
      {supportsSupplementary && (
        <Card className="border-violet-200/70">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-600" /> B2. Skill bổ trợ (ngoài chuẩn vị trí)
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tự thêm các skill khác trong bộ 38 mà bạn muốn được đánh giá thêm.
                </p>
              </div>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 border-violet-300 dark:border-violet-500/40 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/10"
                    disabled={availableForPicker.length === 0}
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm skill bổ trợ
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[min(320px,90vw)] p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Tìm skill..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Không còn skill khả dụng.</CommandEmpty>
                      <CommandGroup>
                        {availableForPicker.map((s: any) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.code || ''} ${s.name}`}
                            onSelect={() => addSupplementary(s.id)}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {s.code ? `${s.code}. ` : ''}{s.name}
                              </span>
                              {s.skill_group && (
                                <span className="text-[10px] text-muted-foreground">{s.skill_group}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {suppList.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 italic">
                Chưa thêm skill bổ trợ nào. Bấm "Thêm skill bổ trợ" để bổ sung.
              </p>
            ) : (
              suppList.map((a, idx) => renderRow(a, idx, 'supp'))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ── BM01-style level reference block ── */
function SkillLevelReference({ assessment }: { assessment: CoreSkillAssessment }) {
  const [showUpskill, setShowUpskill] = useState(false);
  const levels = [
    { n: 1, label: 'Tân binh', text: assessment.level1_description },
    { n: 2, label: 'Độc lập', text: assessment.level2_description },
    { n: 3, label: 'Chuyên gia', text: assessment.level3_description },
    { n: 4, label: 'Bậc thầy', text: assessment.level4_description },
  ];
  const hasAnyLevel = levels.some((l) => !!l.text);
  if (!assessment.description && !hasAnyLevel) return null;

  const minL = assessment.minimum_level;
  const advL = assessment.advanced_level;
  const hasPositionLevels = minL > 0 || advL > 0;
  const currentLvl = assessment.self_assessed_level ?? 0;

  const upskillMap: Record<number, { label: string; text?: string | null }> = {
    0: { label: 'L0 → L1', text: assessment.upskill_l0_l1 },
    1: { label: 'L1 → L2', text: assessment.upskill_l1_l2 },
    2: { label: 'L2 → L3', text: assessment.upskill_l2_l3 },
    3: { label: 'L3 → L4', text: assessment.upskill_l3_l4 },
  };
  const nextUpskill = currentLvl < 4 ? upskillMap[currentLvl] : null;

  return (
    <div className="rounded-md border border-border bg-muted/40 overflow-hidden">
      {assessment.description && (
        <div className="px-3 py-2 bg-muted/70 border-b border-border">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Mô tả skill</div>
          <p className="text-xs text-muted-foreground leading-relaxed">{assessment.description}</p>
        </div>
      )}

      {hasAnyLevel && (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-4 min-w-[720px] divide-x divide-border">
            {levels.map((l) => {
              const isMin = hasPositionLevels && l.n === minL;
              const isAdv = hasPositionLevels && l.n === advL;
              const isCurrent = l.n === currentLvl;
              const cellBg = isMin ? 'bg-orange-50 dark:bg-orange-500/10' : isAdv ? 'bg-green-50 dark:bg-green-500/10' : 'bg-card';
              return (
                <div key={l.n} className={cellBg + ' p-2.5 text-[11px] leading-relaxed text-muted-foreground'}>
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="font-bold text-foreground">L{l.n}</span>
                    <span className="text-[10px] text-muted-foreground">— {l.label}</span>
                    {isMin && <span title="Tối thiểu cho vị trí" className="text-orange-600 text-[10px] font-semibold">★ TT</span>}
                    {isAdv && <span title="Nâng cao cho vị trí" className="text-green-600 text-[10px] font-semibold">▲ NC</span>}
                    {isCurrent && currentLvl > 0 && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">Hiện tại</span>}
                  </div>
                  <p>{l.text || <span className="italic text-muted-foreground/70">(chưa có mô tả)</span>}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {nextUpskill?.text && (
        <div className="border-t border-border">
          <button
            type="button"
            onClick={() => setShowUpskill((s) => !s)}
            className="w-full px-3 py-2 text-left text-[11px] font-semibold text-violet-700 dark:text-violet-300 hover:bg-violet-50/60 dark:hover:bg-violet-500/10 flex items-center gap-2"
          >
            <Sparkles className="w-3 h-3" />
            Cách thăng cấp {nextUpskill.label} {currentLvl === 0 ? '(từ Chưa hình thành)' : ''}
            <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showUpskill ? 'rotate-180' : ''}`} />
          </button>
          {showUpskill && (
            <div className="px-3 pb-3 text-[11px] leading-relaxed text-violet-900 dark:text-violet-200 bg-violet-50/40 dark:bg-violet-500/10">
              {nextUpskill.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
