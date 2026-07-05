import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, Plus, Search, Target, ListChecks, ChevronDown, GraduationCap, Trash2 } from 'lucide-react';
import { SkillLevelBadge } from '@/components/SkillLevelBadge';
import { useSkillLevelImages } from '@/hooks/useSkillLevelImages';
import type { SkillPriority } from './SkillPriorityPicker';
import type { SkillAction } from './SkillActionsBlock';
import { VtbCourseSuggestion } from './VtbCourseSuggestion';
import { IdpPlanSuggestion } from './IdpPlanSuggestion';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { cn } from '@/lib/utils';

interface Skill { id: string; name: string; code: string | null; skill_group: string; sort_order: number; }
interface CoreSkillInfo { skill_id: string; minimum_level: number; advanced_level: number; }
interface AssessedLevel { skill_id: string; current_level: number | null; }

interface Props {
  priorities: SkillPriority[];
  actions: SkillAction[];
  onPrioritiesChange: (p: SkillPriority[]) => void;
  onActionsChange: (a: SkillAction[]) => void;
  allSkills: Skill[];
  coreSkills: CoreSkillInfo[];
  assessedLevels?: AssessedLevel[];
  positionId?: string | null;
  readOnly?: boolean;
}

const ACTION_TYPES = [
  { value: '70', label: '70% Học qua công việc', short: '70%', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', accent: 'border-l-emerald-500' },
  { value: '20', label: '20% Coaching/Shadow', short: '20%', color: 'bg-sky-100 text-sky-800 border-sky-300', accent: 'border-l-sky-500' },
  { value: '10', label: '10% Đào tạo/Tài liệu', short: '10%', color: 'bg-violet-100 text-violet-800 border-violet-300', accent: 'border-l-violet-500' },
];

const typeMeta = (v: string) => ACTION_TYPES.find(t => t.value === v) || ACTION_TYPES[0];

export function SkillDevelopmentBlock({
  priorities, actions, onPrioritiesChange, onActionsChange,
  allSkills, coreSkills, assessedLevels = [], positionId, readOnly,
}: Props) {

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { getImageUrl } = useSkillLevelImages();
  const { isEnabled: isAiEnabled } = useAiFeatures();

  const coreMap = useMemo(() => new Map(coreSkills.map(c => [c.skill_id, c])), [coreSkills]);
  const assessedMap = useMemo(() => new Map(assessedLevels.map(a => [a.skill_id, a.current_level])), [assessedLevels]);
  const selectedIds = new Set(priorities.map(p => p.skill_id));

  useEffect(() => {
    // Phiếu chỉ xem (đã duyệt/lịch sử): giữ nguyên level đã lưu, không đồng bộ lại
    if (readOnly) return;
    if (!assessedLevels.length) return;
    let dirty = false;
    const updated = priorities.map(p => {
      const lv = assessedMap.get(p.skill_id);
      if (lv != null && lv !== p.current_level) {
        dirty = true;
        return { ...p, current_level: lv };
      }
      return p;
    });
    if (dirty) onPrioritiesChange(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessedLevels]);

  const filtered = allSkills.filter(s =>
    !selectedIds.has(s.id) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) || (s.code || '').toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => {
    const aCore = coreMap.has(a.id) ? 0 : 1;
    const bCore = coreMap.has(b.id) ? 0 : 1;
    if (aCore !== bCore) return aCore - bCore;
    return a.sort_order - b.sort_order;
  });

  const addSkill = (skill: Skill) => {
    if (priorities.length >= 3) return;
    const core = coreMap.get(skill.id);
    const assessedLv = assessedMap.get(skill.id) ?? null;
    const newP: SkillPriority = {
      skill_id: skill.id,
      current_level: assessedLv,
      target_level: core?.advanced_level || null,
      priority_order: priorities.length + 1,
      reason_text: '',
      source_type: core ? 'core_skill' : 'supplementary_skill',
      status: 'planned',
      skill_name: skill.name,
      skill_code: skill.code || undefined,
      skill_group: skill.skill_group,
    };
    onPrioritiesChange([...priorities, newP]);
    setDialogOpen(false);
  };

  const removeSkill = (idx: number) => {
    const removed = priorities[idx];
    const pid = removed.id || removed.skill_id;
    onPrioritiesChange(priorities.filter((_, i) => i !== idx).map((p, i) => ({ ...p, priority_order: i + 1 })));
    onActionsChange(actions.filter(a => a.skill_priority_id !== pid));
  };

  const updatePriority = (idx: number, field: keyof SkillPriority, value: any) => {
    const updated = [...priorities];
    (updated[idx] as any)[field] = value;
    onPrioritiesChange(updated);
  };

  const addAction = (priorityId: string) => {
    const existing = actions.filter(a => a.skill_priority_id === priorityId);
    onActionsChange([...actions, {
      skill_priority_id: priorityId, row_no: existing.length + 1,
      action_type: '70', action_text: '', expected_result: '',
      deadline: '', requested_support: '', evidence_expected: '',
      status: 'planned', actual_result: '', manager_review: '',
    }]);
  };

  const updateAction = (globalIdx: number, field: keyof SkillAction, value: string) => {
    const updated = [...actions];
    (updated[globalIdx] as any)[field] = value;
    onActionsChange(updated);
  };

  const removeAction = (globalIdx: number) => onActionsChange(actions.filter((_, i) => i !== globalIdx));

  return (
    <Card>
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base">D.1. Skill ưu tiên & hành động upskill (tối đa 3)</CardTitle>
          <Badge variant="outline">{priorities.length}/3</Badge>
        </div>
        <p className="text-xs text-muted-foreground italic mt-1">
          Anh/chị tự chọn skill up kỳ này theo thực tiễn công việc, có thể tham khảo ý kiến lãnh đạo Phòng / Ban giám đốc.
          Mỗi skill là một khối độc lập, level hiện tại tự động lấy từ mục B.
        </p>
      </CardHeader>
      <CardContent className="space-y-6 px-3 sm:px-6">
        {(() => {
          const gapSuggestions = coreSkills
            .map(cs => {
              const cur = assessedMap.get(cs.skill_id);
              if (cur == null) return null;
              if (cur >= cs.minimum_level) return null;
              if (selectedIds.has(cs.skill_id)) return null;
              const sk = allSkills.find(s => s.id === cs.skill_id);
              if (!sk) return null;
              return { skill: sk, current: cur, minimum: cs.minimum_level };
            })
            .filter((x): x is { skill: Skill; current: number; minimum: number } => x !== null);
          if (gapSuggestions.length === 0 || readOnly || priorities.length >= 3) return null;
          return (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50/60 p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <Target className="w-3.5 h-3.5" />
                <span>Gợi ý skill còn GAP so với chuẩn vị trí (tham khảo)</span>
              </div>
              <p className="text-[11px] text-amber-800/80">
                Đây là gợi ý dựa trên mục B. Anh/chị không bắt buộc chọn các skill này — hãy chọn skill up kỳ phù hợp thực tiễn công việc.
              </p>
              <div className="flex flex-wrap gap-2">
                {gapSuggestions.map(g => (
                  <button
                    key={g.skill.id}
                    type="button"
                    onClick={() => addSkill(g.skill)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-background px-2 py-1 text-xs hover:bg-amber-100"
                  >
                    <Plus className="w-3 h-3" />
                    {g.skill.code && <span className="font-mono text-[10px] text-muted-foreground">{g.skill.code}</span>}
                    <span className="font-medium">{g.skill.name}</span>
                    <Badge variant="outline" className="text-[9px]">L{g.current}→L{g.minimum}</Badge>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {priorities.map((p, idx) => {
          const pid = p.id || p.skill_id;
          const pActions = actions.filter(a => a.skill_priority_id === pid);
          const assessedLv = assessedMap.get(p.skill_id);
          const lockedCurrent = assessedLv != null;
          return (
            <div
              key={pid}
              className="relative rounded-xl border-2 border-primary/40 bg-card shadow-sm overflow-hidden"
            >
              {/* Numbered left rail */}
              <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-12 bg-primary flex items-start justify-center pt-3">
                <span className="text-primary-foreground font-bold text-xl sm:text-2xl leading-none">#{p.priority_order}</span>
              </div>

              <div className="pl-12 sm:pl-14 pr-3 sm:pr-4 py-3 space-y-4">
                {/* Skill header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {p.skill_code && (
                      <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.skill_code}</span>
                    )}
                    <span className="font-semibold text-base sm:text-lg leading-tight break-words">{p.skill_name || p.skill_id}</span>
                    <Badge variant={p.source_type === 'core_skill' ? 'default' : 'secondary'} className="text-[10px]">
                      {p.source_type === 'core_skill' ? 'Skill lõi' : 'Skill bổ sung'}
                    </Badge>
                    {p.skill_group && (
                      <Badge variant="outline" className="text-[10px]">{p.skill_group}</Badge>
                    )}
                  </div>
                  {!readOnly && (
                    <Button variant="ghost" size="sm" onClick={() => removeSkill(idx)} title="Xoá skill"><X className="w-4 h-4" /></Button>
                  )}
                </div>

                {/* Section A: Skill info */}
                <section className="rounded-lg border bg-background p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-primary">
                    <Target className="w-3.5 h-3.5" />
                    <span>A. Thông tin skill</span>
                  </div>

                  {/* Level summary bar */}
                  <div className="flex items-center gap-3 flex-wrap text-sm bg-muted/40 rounded-md p-3 border">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Hiện tại{lockedCurrent ? ' (tự động từ mục B / kỳ gần nhất)' : ''}:</span>
                      <SkillLevelBadge level={p.current_level} imageUrl={getImageUrl(p.skill_id, p.current_level)} />
                    </div>
                    <span className="text-muted-foreground font-bold">→</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Mục tiêu:</span>
                      <SkillLevelBadge level={p.target_level} imageUrl={getImageUrl(p.skill_id, p.target_level)} />
                    </div>
                    <div className="ml-auto text-xs font-semibold px-2 py-1 rounded bg-primary/10 text-primary">
                      Gap: {p.current_level != null && p.target_level != null ? p.target_level - p.current_level : '—'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {!lockedCurrent && (
                      <div>
                        <label className="text-xs text-muted-foreground">Level hiện tại</label>
                        <Select value={p.current_level?.toString() ?? '0'} onValueChange={v => updatePriority(idx, 'current_level', parseInt(v))} disabled={readOnly}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Chọn" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">L0</SelectItem>
                            {[1, 2, 3, 4].map(l => <SelectItem key={l} value={l.toString()}>L{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground">Level mục tiêu</label>
                      <Select value={p.target_level?.toString() ?? '0'} onValueChange={v => updatePriority(idx, 'target_level', parseInt(v))} disabled={readOnly}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Chọn" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">L0</SelectItem>
                          {[1, 2, 3, 4].map(l => <SelectItem key={l} value={l.toString()}>L{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Trạng thái</label>
                      <Select value={p.status} onValueChange={v => updatePriority(idx, 'status', v)} disabled={readOnly}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planned">Đang lên kế hoạch</SelectItem>
                          <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                          <SelectItem value="completed">Hoàn thành</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Lý do ưu tiên skill này</label>
                    <Textarea value={p.reason_text} onChange={e => updatePriority(idx, 'reason_text', e.target.value)} className="min-h-[40px] text-sm" placeholder="Tại sao chọn skill này trong quý?" disabled={readOnly} />
                  </div>
                </section>

                {/* Section B: Actions */}
                <section className="rounded-lg border bg-muted/30 p-3 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-primary">
                      <ListChecks className="w-3.5 h-3.5" />
                      <span>B. Hành động upskill</span>
                      <Badge variant="secondary" className="text-[10px] ml-1">{pActions.length}</Badge>
                    </div>
                    {!readOnly && (
                      <Button variant="default" size="sm" onClick={() => addAction(pid)} className="h-7 text-xs">
                        <Plus className="w-3 h-3 mr-1" />Thêm hành động
                      </Button>
                    )}
                  </div>

                  {pActions.length === 0 && (
                    <div className="text-center py-4 px-3 border border-dashed rounded-md bg-background/50">
                      <p className="text-xs text-muted-foreground">
                        Chưa có hành động nào cho skill này.
                        {!readOnly && <> Nhấn <strong>+ Thêm hành động</strong> để bắt đầu.</>}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {pActions.map((action) => {
                      const globalIdx = actions.indexOf(action);
                      const meta = typeMeta(action.action_type);
                      return (
                        <Collapsible key={globalIdx} defaultOpen>
                          <div className={cn("bg-background rounded-md border border-l-4 overflow-hidden", meta.accent)}>
                            <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-muted/30">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="text-xs font-semibold">Hành động #{action.row_no}</span>
                                <Badge className={cn("text-[10px] border", meta.color)} variant="outline">{meta.short}</Badge>
                                {action.deadline && (
                                  <span className="text-[10px] text-muted-foreground">⏱ {action.deadline}</span>
                                )}
                                <Badge variant="outline" className="text-[9px]">{action.status === 'completed' ? '✓ Hoàn thành' : action.status === 'in_progress' ? 'Đang làm' : 'Kế hoạch'}</Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </Button>
                                </CollapsibleTrigger>
                                {!readOnly && (
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeAction(globalIdx)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            <CollapsibleContent>
                              <div className="p-2.5 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Loại hành động</label>
                                    <Select value={action.action_type} onValueChange={v => updateAction(globalIdx, 'action_type', v)} disabled={readOnly}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>{ACTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Deadline</label>
                                    <Input type="date" value={action.deadline} onChange={e => updateAction(globalIdx, 'deadline', e.target.value)} className="h-8 text-xs" disabled={readOnly} />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[10px] text-muted-foreground">Hành động cụ thể</label>
                                  <Textarea value={action.action_text} onChange={e => updateAction(globalIdx, 'action_text', e.target.value)} className="min-h-[36px] text-xs" disabled={readOnly} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Kết quả mong đợi</label>
                                    <Input value={action.expected_result} onChange={e => updateAction(globalIdx, 'expected_result', e.target.value)} className="h-8 text-xs" disabled={readOnly} />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Hỗ trợ cần thiết</label>
                                    <Input value={action.requested_support} onChange={e => updateAction(globalIdx, 'requested_support', e.target.value)} className="h-8 text-xs" disabled={readOnly} />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Minh chứng mong đợi</label>
                                    <Input value={action.evidence_expected} onChange={e => updateAction(globalIdx, 'evidence_expected', e.target.value)} className="h-8 text-xs" disabled={readOnly} />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground">Trạng thái hành động</label>
                                    <Select value={action.status} onValueChange={v => updateAction(globalIdx, 'status', v)} disabled={readOnly}>
                                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="planned">Kế hoạch</SelectItem>
                                        <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                                        <SelectItem value="completed">Hoàn thành</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>

                  {!readOnly && isAiEnabled('suggest_idp_plan') && (
                    <div className="rounded-md border border-dashed border-primary/30 bg-background/60 p-2">
                      <IdpPlanSuggestion priority={p} />
                    </div>
                  )}

                  {!readOnly && isAiEnabled('suggest_vtb_courses') && (
                    <div className="rounded-md border border-dashed border-primary/30 bg-background/60 p-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground mb-1">
                        <GraduationCap className="w-3.5 h-3.5" />
                        Gợi ý từ Trường ĐT VietinBank
                      </div>
                      <VtbCourseSuggestion
                        priority={p}
                        positionId={positionId}
                        existingActionsCount={pActions.length}
                        onAddAction={(a) => onActionsChange([...actions, a])}
                      />
                    </div>
                  )}
                </section>
              </div>
            </div>
          );
        })}

        {!readOnly && priorities.length < 3 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-dashed border-2 h-12"><Plus className="w-4 h-4 mr-2" />Thêm skill ưu tiên ({priorities.length}/3)</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
              <DialogHeader><DialogTitle>Chọn skill ưu tiên</DialogTitle></DialogHeader>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm skill..." className="pl-9" />
              </div>
              <div className="overflow-y-auto flex-1 space-y-1 max-h-[400px]">
                {filtered.map(s => {
                  const core = coreMap.get(s.id);
                  const lv = assessedMap.get(s.id);
                  return (
                    <button key={s.id} onClick={() => addSkill(s)} className="w-full flex items-center justify-between p-2 rounded hover:bg-muted text-left text-sm">
                      <div>
                        <span className="font-medium">{s.code ? `${s.code}. ` : ''}{s.name}</span>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {core && <Badge className="text-[9px]">Lõi (L{core.minimum_level}→L{core.advanced_level})</Badge>}
                          {lv != null && <Badge variant="outline" className="text-[9px]">Hiện tại: L{lv}</Badge>}
                          <Badge variant="outline" className="text-[9px]">{s.skill_group}</Badge>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Không tìm thấy skill</p>}
              </div>
            </DialogContent>
          </Dialog>
        )}

        {priorities.length === 0 && !readOnly && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Gợi ý: Chọn skill có gap lớn nhất hoặc liên quan nhất đến vị trí công tác.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
