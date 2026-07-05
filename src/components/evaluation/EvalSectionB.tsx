import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkillLevelBadge } from '@/components/SkillLevelBadge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronDown, Target, Sparkles, Loader2, X, Plus, Trash2, Layers } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { makeSupplementaryAssessment } from '@/lib/evaluationPersistence';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { BrandMascotAI } from '@/components/branding/BrandAssets';

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
}: Props) {
  const { isEnabled: isAiEnabled } = useAiFeatures();
  const [openId, setOpenId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiResults, setAiResults] = useState<Record<string, string>>({});
  const [evidenceAiLoading, setEvidenceAiLoading] = useState<Record<string, boolean>>({});
  const [evidenceAiResults, setEvidenceAiResults] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);

  const supportsSupplementary = !!onSupplementaryChange && !!allSkills;
  const suppList = supplementary || [];

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
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
      const text = (data as any)?.text || '';
      if (!text) throw new Error('AI không trả về nội dung');
      setEvidenceAiResults((prev) => ({ ...prev, [a.skill_id]: text }));
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('429')) toast.error('Quá nhiều yêu cầu AI, vui lòng thử lại sau.');
      else toast.error(`Lỗi AI: ${msg || 'không kết nối được'}`);
    } finally {
      setEvidenceAiLoading((prev) => ({ ...prev, [a.skill_id]: false }));
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

  const renderRow = (a: CoreSkillAssessment, idx: number, kind: 'core' | 'supp') => {
    const isSupp = kind === 'supp';
    const selfLvl = a.self_assessed_level ?? 0;
    const gapMin = isSupp ? 0 : a.minimum_level - selfLvl;
    const gapAdv = isSupp ? 0 : a.advanced_level - selfLvl;
    const rowKey = `${kind}-${a.skill_id}`;
    const isOpen = openId === rowKey;
    const numberLabel = isSupp ? `B${idx + 1}` : String(idx + 1);
    const isLevelUp = !!levelUpSkillIds?.has(a.skill_id);

    return (
      <Collapsible key={rowKey} open={isOpen} onOpenChange={() => toggleItem(rowKey)}>
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
                <Badge variant="outline" className="text-[9px] border-violet-300 text-violet-700 bg-violet-50 flex-shrink-0">
                  Bổ trợ
                </Badge>
              )}
              <span className="sm:hidden font-medium text-sm whitespace-normal break-words leading-snug text-left w-full">
                {a.skill_code ? `${a.skill_code}. ` : ''}
                {a.skill_name}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
              <SkillLevelBadge level={selfLvl} skillId={a.skill_id} />
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

            {/* Self & Manager levels */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Tự đánh giá (NV)</label>
                <Select
                  value={String(a.self_assessed_level ?? 0)}
                  onValueChange={(v) => updateRow(kind, idx, 'self_assessed_level', parseInt(v))}
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
              />
              {selfLvl >= 3 && !(a.evidence || '').trim() && (
                <p className="mt-1 text-[11px] text-orange-700">
                  Level Chuyên gia/Bậc thầy cần được chứng minh — phiếu sẽ không nộp được nếu bỏ trống minh chứng.
                </p>
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

            <div>
              <label className="text-xs text-muted-foreground">Nhận xét của quản lý</label>
              <Textarea
                value={a.manager_note}
                onChange={(e) => updateRow(kind, idx, 'manager_note', e.target.value)}
                className="min-h-[36px] text-xs"
                disabled={!isManager}
              />
            </div>

          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-3">
      {/* B1. Core skills */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4" /> B. Đánh giá Skill lõi theo vị trí
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {assessments.length} skill lõi
            {supportsSupplementary && suppList.length > 0 ? ` + ${suppList.length} skill bổ trợ` : ''}
          </p>
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
                    className="h-8 text-xs gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
                    disabled={availableForPicker.length === 0}
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm skill bổ trợ
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="end">
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
    <div className="rounded-md border border-slate-200 bg-slate-50/40 overflow-hidden">
      {assessment.description && (
        <div className="px-3 py-2 bg-slate-100/70 border-b border-slate-200">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-600 mb-0.5">Mô tả skill</div>
          <p className="text-xs text-slate-700 leading-relaxed">{assessment.description}</p>
        </div>
      )}

      {hasAnyLevel && (
        <div className="overflow-x-auto">
          <div className="grid grid-cols-4 min-w-[720px] divide-x divide-slate-200">
            {levels.map((l) => {
              const isMin = hasPositionLevels && l.n === minL;
              const isAdv = hasPositionLevels && l.n === advL;
              const isCurrent = l.n === currentLvl;
              const cellBg = isMin ? 'bg-orange-50' : isAdv ? 'bg-green-50' : 'bg-white';
              return (
                <div key={l.n} className={cellBg + ' p-2.5 text-[11px] leading-relaxed text-slate-700'}>
                  <div className="flex items-center gap-1 mb-1.5">
                    <span className="font-bold text-slate-900">L{l.n}</span>
                    <span className="text-[10px] text-slate-500">— {l.label}</span>
                    {isMin && <span title="Tối thiểu cho vị trí" className="text-orange-600 text-[10px] font-semibold">★ TT</span>}
                    {isAdv && <span title="Nâng cao cho vị trí" className="text-green-600 text-[10px] font-semibold">▲ NC</span>}
                    {isCurrent && currentLvl > 0 && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">Hiện tại</span>}
                  </div>
                  <p>{l.text || <span className="italic text-slate-400">(chưa có mô tả)</span>}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {nextUpskill?.text && (
        <div className="border-t border-slate-200">
          <button
            type="button"
            onClick={() => setShowUpskill((s) => !s)}
            className="w-full px-3 py-2 text-left text-[11px] font-semibold text-violet-700 hover:bg-violet-50/60 flex items-center gap-2"
          >
            <Sparkles className="w-3 h-3" />
            Cách thăng cấp {nextUpskill.label} {currentLvl === 0 ? '(từ Chưa hình thành)' : ''}
            <ChevronDown className={`w-3 h-3 ml-auto transition-transform ${showUpskill ? 'rotate-180' : ''}`} />
          </button>
          {showUpskill && (
            <div className="px-3 pb-3 text-[11px] leading-relaxed text-violet-900 bg-violet-50/40">
              {nextUpskill.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
