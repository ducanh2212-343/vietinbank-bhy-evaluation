import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Heart, CheckCircle2, AlertCircle, AlertTriangle, BookOpen, ClipboardList, Sparkles } from 'lucide-react';
import { ATTITUDE_DIMENSIONS } from '@/components/bm/AttitudeConstants';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { ATTITUDE_FOCUS_OPTIONS, endOfMonth, endOfQuarter } from './attitudeFocusOptions';
import { AttitudeBehaviorStandards } from './AttitudeBehaviorStandards';

interface AttitudeCatalogRow {
  id: number;
  name: string;
  failing_behaviors: string | null;
  expected_behaviors: string | null;
  outstanding_behaviors: string | null;
  self_improvement: string | null;
  manager_action: string | null;
  progress_evidence: string | null;
}

/* ── Types ── */
export interface AttitudeAssessment {
  attitude_dimension_id: number;
  attitude_name: string;
  // NEW 3-level rating: '' | 'noi_bat' | 'dat_mong_doi' | 'can_cai_thien'
  self_status: string;
  manager_status: string;

  // NEW fields
  evidence_text?: string;
  improvement_required?: boolean;
  improvement_focus?: string[];
  improvement_focus_other?: string;
  improvement_action?: string;
  improvement_deadline?: string;
  improvement_deadline_preset?: 'end_month' | 'end_quarter' | 'custom';
  expected_evidence?: string;
  support_needed?: string;
  improvement_status?: 'not_started' | 'in_progress' | 'completed';
  progress_note?: string;

  // LEGACY fields — kept for back-compat with BM01 export, StaffEvaluation, BMFormPage
  current_status?: string;
  issue_summary?: string;
  desired_status?: string;
  evidence?: string;
  improvement_goal?: string;
  employee_comment?: string;
  manager_comment?: string;
}

interface Props {
  assessments: AttitudeAssessment[];
  onChange: (a: AttitudeAssessment[]) => void;
  isManager: boolean;
}

/* ── 3 mức mới ── */
const RATING_OPTIONS = [
  { value: 'noi_bat', label: 'Nổi bật', color: 'bg-emerald-100 text-emerald-700 border-emerald-300', badgeCls: 'bg-emerald-100 text-emerald-700 border-emerald-200', tip: 'Vượt chuẩn, lan toả cho người khác' },
  { value: 'dat_mong_doi', label: 'Đạt mong đợi', color: 'bg-sky-100 text-sky-700 border-sky-300', badgeCls: 'bg-sky-100 text-sky-700 border-sky-200', tip: 'Thực hiện ổn định theo chuẩn' },
  { value: 'can_cai_thien', label: 'Cần cải thiện', color: 'bg-amber-100 text-amber-700 border-amber-300', badgeCls: 'bg-amber-100 text-amber-700 border-amber-200', tip: 'Còn khoảng cách so với chuẩn' },
] as const;

function getRatingOption(value: string) {
  return RATING_OPTIONS.find(r => r.value === value);
}

function hasPlan(a: AttitudeAssessment): boolean {
  return !!(
    a.self_status === 'can_cai_thien' ||
    a.manager_status === 'can_cai_thien' ||
    a.improvement_required
  );
}

function planComplete(a: AttitudeAssessment): boolean {
  if (!hasPlan(a)) return true;
  const focus = a.improvement_focus || [];
  const focusOk = focus.length > 0 && (!focus.includes('other') || (a.improvement_focus_other || '').trim().length > 0);
  return focusOk && !!a.improvement_action?.trim() && !!a.improvement_deadline;
}

/** Minh chứng chỉ bắt buộc khi Nổi bật / Cần cải thiện / đã đưa vào KH cải thiện. */
function needsEvidence(a: AttitudeAssessment): boolean {
  return a.self_status === 'noi_bat' || a.self_status === 'can_cai_thien' || !!a.improvement_required;
}

function isComplete(a: AttitudeAssessment): boolean {
  if (!a.self_status) return false;
  if (needsEvidence(a) && !(a.evidence_text || '').trim()) return false;
  return planComplete(a);
}

/* ── Component ── */
export function EvalSectionC({ assessments, onChange, isManager }: Props) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<Record<number, AttitudeCatalogRow>>({});

  useEffect(() => {
    let mounted = true;
    supabase
      .from('attitude_dimensions_catalog')
      .select('id, name, failing_behaviors, expected_behaviors, outstanding_behaviors, self_improvement, manager_action, progress_evidence')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!mounted || !data) return;
        const map: Record<number, AttitudeCatalogRow> = {};
        data.forEach((r: any) => { map[r.id] = r; });
        setCatalog(map);
      });
    return () => { mounted = false; };
  }, []);

  const toggleItem = (id: number) => {
    setOpenId(prev => (prev === id ? null : id));
  };

  const update = (dimId: number, patch: Partial<AttitudeAssessment>) => {
    onChange(assessments.map(a => a.attitude_dimension_id === dimId ? { ...a, ...patch } : a));
  };

  const toggleFocus = (a: AttitudeAssessment, code: string) => {
    const cur = a.improvement_focus || [];
    let next: string[];
    if (cur.includes(code)) {
      next = cur.filter(c => c !== code);
    } else {
      // Giới hạn 2 lựa chọn (cho phép 'other' nằm trong giới hạn)
      if (cur.length >= 2) return;
      next = [...cur, code];
    }
    update(a.attitude_dimension_id, { improvement_focus: next });
  };

  const setDeadlinePreset = (a: AttitudeAssessment, preset: 'end_month' | 'end_quarter' | 'custom') => {
    if (preset === 'end_month') update(a.attitude_dimension_id, { improvement_deadline_preset: preset, improvement_deadline: endOfMonth() });
    else if (preset === 'end_quarter') update(a.attitude_dimension_id, { improvement_deadline_preset: preset, improvement_deadline: endOfQuarter() });
    else update(a.attitude_dimension_id, { improvement_deadline_preset: 'custom' });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="w-4 h-4" /> C. Đánh giá và cải thiện 6 nhóm thái độ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {assessments.map(a => {
          const isOpen = openId === a.attitude_dimension_id;
          const ratingOpt = getRatingOption(a.self_status);
          const mgrOpt = getRatingOption(a.manager_status);
          const mismatch = !!(a.self_status && a.manager_status && a.self_status !== a.manager_status);
          const showPlan = hasPlan(a);
          const complete = isComplete(a);
          const cat = catalog[a.attitude_dimension_id];
          const focusOpts = ATTITUDE_FOCUS_OPTIONS[a.attitude_dimension_id] || [];
          const focusSet = new Set(a.improvement_focus || []);

          return (
            <Collapsible key={a.attitude_dimension_id} open={isOpen} onOpenChange={() => toggleItem(a.attitude_dimension_id)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">{a.attitude_dimension_id}</Badge>
                    <span className="font-medium text-sm truncate text-left">{a.attitude_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {ratingOpt && (
                      <Badge className={cn('text-[10px] border', ratingOpt.badgeCls)}>{ratingOpt.label}</Badge>
                    )}
                    {showPlan && (
                      <Badge className="text-[10px] border bg-violet-100 text-violet-700 border-violet-200">Có KH cải thiện</Badge>
                    )}
                    {a.improvement_status === 'completed' && (
                      <Badge className="text-[10px] border bg-emerald-100 text-emerald-700 border-emerald-200">Đã hoàn thành</Badge>
                    )}
                    {mismatch && (
                      <Badge className="text-[10px] border bg-orange-100 text-orange-700 border-orange-200" title="Chênh lệch đánh giá cán bộ vs lãnh đạo">Chênh lệch</Badge>
                    )}
                    {complete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/40" />
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border border-t-0 rounded-b-lg p-3 space-y-4">
                  {/* ─── A. Đánh giá ─── */}
                  <section className="space-y-3">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> A. Đánh giá
                    </h4>

                    {/* Self rating */}
                    <div>
                      <label className="text-xs font-medium text-foreground mb-2 block">Mức tự đánh giá của cán bộ *</label>
                      <div className="grid grid-cols-3 gap-2">
                        {RATING_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => update(a.attitude_dimension_id, { self_status: opt.value })}
                            className={cn(
                              'rounded-lg border-2 px-2 py-2.5 text-xs font-medium transition-all text-center',
                              a.self_status === opt.value
                                ? cn(opt.color, 'border-current ring-2 ring-offset-1 ring-current/30')
                                : 'border-border bg-background hover:bg-muted/50',
                            )}
                            title={opt.tip}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chuẩn hành vi tham khảo — luôn hiển thị, minh hoạ từng mức */}
                    <AttitudeBehaviorStandards
                      groupId={a.attitude_dimension_id}
                      selectedLevel={a.self_status}
                      alwaysOpen
                    />


                    {/* Manager rating */}
                    <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-3">
                      <label className="text-xs font-semibold text-primary mb-2 block">
                        Mức đánh giá của lãnh đạo cấp trên {isManager && '*'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {RATING_OPTIONS.map(opt => {
                          const selected = a.manager_status === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={!isManager}
                              onClick={() => update(a.attitude_dimension_id, { manager_status: opt.value })}
                              className={cn(
                                'rounded-lg border-2 px-2 py-2.5 text-xs font-medium transition-all text-center',
                                selected
                                  ? cn(opt.color, 'border-current ring-2 ring-offset-1 ring-current/30')
                                  : 'border-border bg-background',
                                isManager ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-70 cursor-not-allowed',
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      {!isManager && !a.manager_status && (
                        <p className="text-[10px] text-muted-foreground mt-2 italic">Chưa có đánh giá của lãnh đạo cấp trên</p>
                      )}
                      {mismatch && (
                        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded p-2">
                          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>Có chênh lệch đánh giá giữa cán bộ ({ratingOpt?.label}) và lãnh đạo ({mgrOpt?.label}). Cần trao đổi để thống nhất nhận diện hành vi và hướng cải thiện.</span>
                        </div>
                      )}
                    </div>

                    {/* Điểm cần cải thiện chính — chọn ngay từ phần đánh giá */}
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1">
                        Điểm cần cải thiện chính <span className="text-muted-foreground font-normal">({(a.improvement_focus || []).length}/2)</span>
                      </label>
                      <p className="text-[10px] text-muted-foreground mb-2">Chọn tối đa 1–2 điểm cần tập trung cải thiện trong quý.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {focusOpts.map(opt => {
                          const checked = focusSet.has(opt.code);
                          const disabled = !checked && (a.improvement_focus || []).length >= 2;
                          return (
                            <button
                              key={opt.code}
                              type="button"
                              onClick={() => toggleFocus(a, opt.code)}
                              disabled={disabled}
                              className={cn(
                                'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                                checked
                                  ? 'bg-violet-600 text-white border-violet-600'
                                  : disabled
                                    ? 'bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed'
                                    : 'bg-background text-foreground border-border hover:bg-violet-50',
                              )}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      {focusSet.has('other') && (
                        <Input
                          value={a.improvement_focus_other || ''}
                          onChange={e => update(a.attitude_dimension_id, { improvement_focus_other: e.target.value })}
                          placeholder="Mô tả ngắn điểm cần cải thiện khác..."
                          className="mt-2 h-8 text-xs"
                        />
                      )}
                    </div>

                    {/* Evidence — bắt buộc khi Nổi bật / Cần cải thiện / có KH cải thiện */}
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1">
                        Minh chứng/biểu hiện hiện tại {needsEvidence(a) ? '*' : <span className="text-muted-foreground font-normal">(không bắt buộc)</span>}
                      </label>
                      <p className="text-[10px] text-muted-foreground mb-1.5">Nêu 1 tình huống, hành vi hoặc kết quả cụ thể trong kỳ đánh giá thể hiện mức anh/chị đã chọn.</p>
                      <Textarea
                        value={a.evidence_text || ''}
                        onChange={e => update(a.attitude_dimension_id, { evidence_text: e.target.value })}
                        className="min-h-[60px] text-xs"
                        placeholder="Ví dụ: Trong kỳ vừa qua, tôi đã… Kết quả là… Việc này thể hiện tôi…"
                      />
                    </div>

                    {/* Tick "đưa vào KH cải thiện" */}
                    <label className="flex items-start gap-2 cursor-pointer text-xs">
                      <Checkbox
                        checked={!!a.improvement_required}
                        onCheckedChange={v => update(a.attitude_dimension_id, { improvement_required: !!v })}
                        className="mt-0.5"
                      />
                      <span>Đưa nhóm thái độ này vào <b>kế hoạch cải thiện trong quý</b> (tự bật nếu chọn "Cần cải thiện").</span>
                    </label>
                  </section>


                  {/* ─── C. Kế hoạch cải thiện trong quý ─── */}
                  {showPlan && (
                    <section className="space-y-3 rounded-lg border-2 border-violet-200 bg-violet-50/40 p-3">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-violet-700 flex items-center gap-1.5">
                        <ClipboardList className="w-3 h-3" /> C. Kế hoạch cải thiện trong quý
                      </h4>

                      {/* Tóm tắt điểm cần cải thiện đã chọn ở phần đánh giá */}
                      {(a.improvement_focus || []).length > 0 ? (
                        <div className="text-[11px] text-violet-900 bg-white/60 border border-violet-200 rounded-md px-2.5 py-1.5">
                          <span className="font-medium">Điểm tập trung:</span>{' '}
                          {(a.improvement_focus || [])
                            .map(code => {
                              if (code === 'other') return a.improvement_focus_other?.trim() || 'Khác';
                              return focusOpts.find(o => o.code === code)?.label || code;
                            })
                            .join(' • ')}
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                          Chưa chọn "Điểm cần cải thiện chính" ở phần đánh giá phía trên.
                        </div>
                      )}


                      {/* Action */}
                      <div>
                        <label className="text-xs font-medium block mb-1">Hành động cải thiện cụ thể *</label>
                        <p className="text-[10px] text-muted-foreground mb-1">Nêu một việc cụ thể anh/chị sẽ thực hiện để cải thiện nhóm thái độ này.</p>
                        <Textarea
                          value={a.improvement_action || ''}
                          onChange={e => update(a.attitude_dimension_id, { improvement_action: e.target.value })}
                          className="min-h-[48px] text-xs"
                          placeholder="Tôi sẽ…"
                        />
                      </div>

                      {/* Deadline */}
                      <div>
                        <label className="text-xs font-medium block mb-1">Thời hạn hoàn thành *</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {[
                            { v: 'end_month', label: 'Cuối tháng này' },
                            { v: 'end_quarter', label: 'Cuối quý' },
                            { v: 'custom', label: 'Ngày khác' },
                          ].map(p => (
                            <button
                              key={p.v}
                              type="button"
                              onClick={() => setDeadlinePreset(a, p.v as any)}
                              className={cn(
                                'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                                a.improvement_deadline_preset === p.v
                                  ? 'bg-primary text-primary-foreground border-primary'
                                  : 'bg-background border-border hover:bg-muted/50',
                              )}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                        <Input
                          type="date"
                          value={a.improvement_deadline || ''}
                          onChange={e => update(a.attitude_dimension_id, { improvement_deadline: e.target.value, improvement_deadline_preset: 'custom' })}
                          className="h-8 text-xs w-44"
                        />
                      </div>

                      {/* Optional fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium block mb-1">Kết quả/Bằng chứng hoàn thành</label>
                          <p className="text-[10px] text-muted-foreground mb-1">Nêu căn cứ cho thấy hành động cải thiện đã được thực hiện hoặc có tiến bộ.</p>
                          <Textarea
                            value={a.expected_evidence || ''}
                            onChange={e => update(a.attitude_dimension_id, { expected_evidence: e.target.value })}
                            className="min-h-[44px] text-xs"
                            placeholder="Ví dụ: Có bản tóm tắt, có kết quả công việc, phản hồi của quản lý…"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium block mb-1">Hỗ trợ cần từ quản lý/đồng nghiệp</label>
                          <p className="text-[10px] text-muted-foreground mb-1">Không bắt buộc.</p>
                          <Textarea
                            value={a.support_needed || ''}
                            onChange={e => update(a.attitude_dimension_id, { support_needed: e.target.value })}
                            className="min-h-[44px] text-xs"
                            placeholder="Tôi cần hỗ trợ về…"
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <label className="text-xs font-medium block mb-1">Trạng thái thực hiện</label>
                        <Select
                          value={a.improvement_status || 'not_started'}
                          onValueChange={v => update(a.attitude_dimension_id, { improvement_status: v as any })}
                        >
                          <SelectTrigger className="h-8 text-xs w-48"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Chưa bắt đầu</SelectItem>
                            <SelectItem value="in_progress">Đang thực hiện</SelectItem>
                            <SelectItem value="completed">Đã hoàn thành</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </section>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}

function RefRow({ color, title, body, last }: { color: string; title: string; body: string | null; last?: boolean }) {
  const bgMap: Record<string, string> = {
    amber: 'bg-amber-50/60 text-amber-900',
    sky: 'bg-sky-50/60 text-sky-900',
    emerald: 'bg-emerald-50/60 text-emerald-900',
    violet: 'bg-violet-50/60 text-violet-900',
    orange: 'bg-orange-50/60 text-orange-900',
    slate: 'bg-slate-50/60 text-slate-800',
  };
  const titleMap: Record<string, string> = {
    amber: 'text-amber-700',
    sky: 'text-sky-700',
    emerald: 'text-emerald-700',
    violet: 'text-violet-700',
    orange: 'text-orange-700',
    slate: 'text-slate-700',
  };
  return (
    <div className={cn('p-2.5', bgMap[color], !last && 'border-b border-slate-200')}>
      <div className={cn('font-semibold mb-1', titleMap[color])}>{title}</div>
      <p className="leading-relaxed whitespace-pre-line">{body || '—'}</p>
    </div>
  );
}
