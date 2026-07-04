import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Save, Trash2, History } from 'lucide-react';
import { toast } from 'sonner';

type SourceType = 'skill' | 'attitude' | 'ai';

export interface TransferItem {
  type: SourceType;
  action_text: string;
  expected_result: string;
  skill_id?: string | null;
  attitude_dim_id?: number | null;
  attitude_name?: string | null;
  label?: string;
}

interface Props {
  formId: string | null;
  previousFormId: string | null;
  previousCycleName?: string;
  isManager: boolean;
  onTransferIncomplete?: (items: TransferItem[]) => void;
}

interface PrevActionItem {
  id: string;
  type: SourceType;
  label: string;
  text: string;
  expected: string;
  deadline: string;
  skill_id?: string | null;
  attitude_dim_id?: number | null;
  attitude_name?: string | null;
}

interface ReviewRow {
  id?: string;
  form_id: string;
  source_form_id: string;
  source_action_id: string | null;
  source_action_type: SourceType;
  is_extra: boolean;
  action_text: string;
  expected_result: string;
  actual_result: string;
  self_status: string;
  status: string;
  evidence: string;
  employee_note: string;
  manager_note: string;
  row_no: number;
  _label?: string;
  _skill_id?: string | null;
  _attitude_dim_id?: number | null;
  _attitude_name?: string | null;
}

const STATUS_OPTIONS = [
  { value: 'planned', label: 'Chưa bắt đầu' },
  { value: 'in_progress', label: 'Đang thực hiện' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Huỷ' },
];

const TYPE_BADGE: Record<SourceType, { label: string; cls: string }> = {
  skill: { label: 'Skill', cls: 'bg-blue-100 text-blue-700' },
  attitude: { label: 'Thái độ', cls: 'bg-amber-100 text-amber-700' },
  ai: { label: 'AI', cls: 'bg-violet-100 text-violet-700' },
};

export function PreviousActionsReview({ formId, previousFormId, previousCycleName, isManager, onTransferIncomplete }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prevActions, setPrevActions] = useState<PrevActionItem[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);

  const load = useCallback(async () => {
    if (!formId || !previousFormId) { setLoading(false); return; }
    setLoading(true);

    const [skRes, atRes, aiRes, rvRes] = await Promise.all([
      supabase.from('form_skill_actions')
        .select('id, action_text, expected_result, deadline, skill_priority_id, form_skill_priorities!inner(skill_id, skill_catalog(name, code))')
        .eq('form_id', previousFormId).order('row_no'),
      supabase.from('form_attitude_actions')
        .select('id, action_text, expected_evidence, deadline, attitude_priority_id, form_attitude_priorities!inner(attitude_dimension_id, attitude_name)')
        .eq('form_id', previousFormId).order('row_no'),
      supabase.from('form_ai_actions_v2')
        .select('id, ai_action_text, expected_result, deadline')
        .eq('form_id', previousFormId).order('row_no'),
      supabase.from('form_previous_action_reviews')
        .select('*').eq('form_id', formId).order('row_no'),
    ]);

    const items: PrevActionItem[] = [];
    (skRes.data || []).forEach((r: any) => {
      const sp = r.form_skill_priorities;
      const skill = sp?.skill_catalog;
      items.push({
        id: r.id, type: 'skill',
        label: skill ? `${skill.code ? `[${skill.code}] ` : ''}${skill.name}` : 'Skill',
        text: r.action_text || '', expected: r.expected_result || '', deadline: r.deadline || '',
        skill_id: sp?.skill_id || null,
      });
    });
    (atRes.data || []).forEach((r: any) => {
      const ap = r.form_attitude_priorities;
      items.push({
        id: r.id, type: 'attitude',
        label: ap?.attitude_name || 'Thái độ',
        text: r.action_text || '', expected: r.expected_evidence || '', deadline: r.deadline || '',
        attitude_dim_id: ap?.attitude_dimension_id || null,
        attitude_name: ap?.attitude_name || null,
      });
    });
    (aiRes.data || []).forEach((r: any) => {
      items.push({
        id: r.id, type: 'ai', label: 'AI',
        text: r.ai_action_text || '', expected: r.expected_result || '', deadline: r.deadline || '',
      });
    });
    setPrevActions(items);

    // Build review rows: one per previous action (link), plus any extra rows
    const existing = (rvRes.data || []) as any[];
    const byKey = new Map<string, any>();
    existing.forEach(r => {
      if (!r.is_extra && r.source_action_id) byKey.set(`${r.source_action_type}:${r.source_action_id}`, r);
    });

    const built: ReviewRow[] = [];
    items.forEach((it, idx) => {
      const key = `${it.type}:${it.id}`;
      const ex = byKey.get(key);
      built.push({
        id: ex?.id,
        form_id: formId,
        source_form_id: previousFormId,
        source_action_id: it.id,
        source_action_type: it.type,
        is_extra: false,
        action_text: it.text,
        expected_result: it.expected,
        actual_result: ex?.actual_result || '',
        self_status: ex?.self_status || 'planned',
        status: ex?.status || 'planned',
        evidence: ex?.evidence || '',
        employee_note: ex?.employee_note || '',
        manager_note: ex?.manager_note || '',
        row_no: idx + 1,
        _label: it.label,
        _skill_id: it.skill_id,
        _attitude_dim_id: it.attitude_dim_id,
        _attitude_name: it.attitude_name,
      });
    });
    existing.filter(r => r.is_extra).forEach((r, i) => {
      built.push({
        id: r.id,
        form_id: formId,
        source_form_id: previousFormId,
        source_action_id: null,
        source_action_type: r.source_action_type,
        is_extra: true,
        action_text: r.action_text || '',
        expected_result: r.expected_result || '',
        actual_result: r.actual_result || '',
        self_status: r.self_status || 'planned',
        status: r.status || 'planned',
        evidence: r.evidence || '',
        employee_note: r.employee_note || '',
        manager_note: r.manager_note || '',
        row_no: items.length + i + 1,
      });
    });
    setRows(built);
    setLoading(false);
  }, [formId, previousFormId]);

  useEffect(() => { load(); }, [load]);

  const update = (idx: number, patch: Partial<ReviewRow>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  };

  const addExtra = () => {
    if (!formId || !previousFormId) return;
    setRows(prev => [...prev, {
      form_id: formId, source_form_id: previousFormId, source_action_id: null,
      source_action_type: 'skill', is_extra: true,
      action_text: '', expected_result: '', actual_result: '', self_status: 'planned', status: 'planned',
      evidence: '', employee_note: '', manager_note: '',
      row_no: prev.length + 1,
    }]);
  };

  const removeExtra = async (idx: number) => {
    const row = rows[idx];
    if (!row.is_extra) return;
    if (row.id) {
      const { error } = await supabase.from('form_previous_action_reviews').delete().eq('id', row.id);
      if (error) { toast.error('Lỗi xoá: ' + error.message); return; }
    }
    setRows(prev => prev.filter((_, i) => i !== idx));
    toast.success('Đã xoá hành động');
  };

  const saveAll = async () => {
    if (!formId) return;
    setSaving(true);
    try {
      for (const r of rows) {
        const payload: any = {
          form_id: r.form_id, source_form_id: r.source_form_id,
          source_action_id: r.source_action_id, source_action_type: r.source_action_type,
          is_extra: r.is_extra,
          action_text: r.action_text || null,
          expected_result: r.expected_result || null,
          actual_result: r.actual_result || null,
          status: r.status, self_status: r.self_status, evidence: r.evidence || null,
          employee_note: r.employee_note || null,
          manager_note: r.manager_note || null,
          row_no: r.row_no,
        };
        if (r.id) {
          const { error } = await supabase.from('form_previous_action_reviews').update(payload).eq('id', r.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('form_previous_action_reviews').insert(payload);
          if (error) throw error;
        }
      }
      toast.success('Đã lưu rà soát hành động kỳ trước');

      // Auto carry-over: when manager marks any row as not completed, push them to current plan
      if (isManager && onTransferIncomplete) {
        const incompletes = rows.filter(r => r.status !== 'completed' && (r.action_text || '').trim());
        if (incompletes.length) {
          onTransferIncomplete(incompletes.map(r => ({
            type: r.source_action_type,
            action_text: r.action_text,
            expected_result: r.expected_result,
            skill_id: r._skill_id || null,
            attitude_dim_id: r._attitude_dim_id || null,
            attitude_name: r._attitude_name || null,
            label: r._label,
          })));
          toast.info(`Tự động chuyển ${incompletes.length} hành động chưa hoàn thành sang KH kỳ này`);
        }
      }

      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Lỗi khi lưu');
    } finally { setSaving(false); }
  };

  if (!formId || !previousFormId) return null;
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Rà soát hành động kỳ trước</CardTitle></CardHeader>
        <CardContent><div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Đang tải…</div></CardContent>
      </Card>
    );
  }

  if (prevActions.length === 0 && rows.filter(r => r.is_extra).length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Rà soát hành động kỳ trước</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Không tìm thấy hành động đã lập ở {previousCycleName || 'kỳ trước'}.</p>
          {!isManager && (
            <Button size="sm" variant="outline" className="mt-3" onClick={addExtra}>
              <Plus className="w-3 h-3 mr-1" /> Thêm hành động upskill ngoài kế hoạch
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" /> Rà soát hành động {previousCycleName ? `(${previousCycleName})` : 'kỳ trước'}
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">Tự động link — không được xoá</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Cập nhật kết quả thực tế cho từng hành động đã lập kỳ trước. Có thể bổ sung các hành động upskill đã thực hiện ngoài kế hoạch.
        </p>
        {rows.length > 0 && (() => {
          const total = rows.length;
          const selfDone = rows.filter(r => r.self_status === 'completed').length;
          const mgrDone = rows.filter(r => r.status === 'completed').length;
          const pct = Math.round((mgrDone / total) * 100);
          return (
            <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px]">
              <Badge variant="outline">{total} hành động</Badge>
              <Badge variant="outline" className="border-sky-300 text-sky-700">Tự đánh giá hoàn thành: {selfDone}/{total}</Badge>
              <Badge variant="outline" className="border-amber-300 text-amber-700">CBQL xác nhận hoàn thành: {mgrDone}/{total} ({pct}%)</Badge>
            </div>
          );
        })()}
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r, idx) => {
          const tb = TYPE_BADGE[r.source_action_type];
          return (
            <div key={r.id || `new-${idx}`} className="border rounded-lg p-3 bg-muted/20 space-y-2">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Badge className={`${tb.cls} border-0`}>{tb.label}</Badge>
                {r.is_extra && <Badge variant="outline" className="border-emerald-500 text-emerald-700">Ngoài kế hoạch</Badge>}
                {r._label && <span className="font-medium">{r._label}</span>}
                {r.is_extra && !isManager && (
                  <Button size="sm" variant="ghost" className="ml-auto h-6 px-2 text-destructive" onClick={() => removeExtra(idx)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {r.is_extra ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Loại</label>
                    <Select value={r.source_action_type} onValueChange={(v) => update(idx, { source_action_type: v as SourceType })} disabled={isManager}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skill">Skill</SelectItem>
                        <SelectItem value="attitude">Thái độ</SelectItem>
                        <SelectItem value="ai">AI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-muted-foreground">Mô tả hành động</label>
                    <Textarea value={r.action_text} onChange={e => update(idx, { action_text: e.target.value })} rows={2} disabled={isManager} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-muted-foreground">Kết quả mong đợi</label>
                    <Input value={r.expected_result} onChange={e => update(idx, { expected_result: e.target.value })} className="h-8" disabled={isManager} />
                  </div>
                </div>
              ) : (
                <div className="text-sm space-y-1">
                  <div><span className="text-muted-foreground text-xs">Hành động: </span>{r.action_text || <em className="text-muted-foreground">Chưa nhập</em>}</div>
                  {r.expected_result && <div className="text-xs text-muted-foreground">Kết quả mong đợi: {r.expected_result}</div>}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium text-sky-700">
                    Tự đánh giá (cán bộ)
                  </label>
                  <Select value={r.self_status} onValueChange={(v) => update(idx, { self_status: v })} disabled={isManager}>
                    <SelectTrigger className={`h-8 text-sm ${!isManager ? 'border-sky-300' : ''}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground font-medium text-amber-700">
                    Trạng thái (CBQL đánh giá)
                  </label>
                  <Select value={r.status} onValueChange={(v) => update(idx, { status: v })} disabled={!isManager}>
                    <SelectTrigger className={`h-8 text-sm ${isManager ? 'border-amber-300' : ''}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">Bằng chứng</label>
                  <Input value={r.evidence} onChange={e => update(idx, { evidence: e.target.value })} className="h-8" disabled={isManager} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-muted-foreground">Kết quả thực tế</label>
                  <Textarea value={r.actual_result} onChange={e => update(idx, { actual_result: e.target.value })} rows={2} disabled={isManager} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-muted-foreground">Ghi chú cán bộ</label>
                  <Textarea value={r.employee_note} onChange={e => update(idx, { employee_note: e.target.value })} rows={2} disabled={isManager} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-muted-foreground font-medium text-amber-700">Nhận xét CBQL</label>
                  <Textarea
                    value={r.manager_note}
                    onChange={e => update(idx, { manager_note: e.target.value })}
                    rows={2}
                    disabled={!isManager}
                    placeholder={isManager ? 'Nhận xét của CBQL cho hành động này…' : '(CBQL nhập)'}
                    className={isManager ? 'border-amber-300 focus-visible:ring-amber-500' : ''}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-2 flex-wrap pt-2">
          {!isManager && (
            <Button size="sm" variant="outline" onClick={addExtra}>
              <Plus className="w-3 h-3 mr-1" /> Thêm hành động upskill ngoài kế hoạch
            </Button>
          )}
          {!isManager && onTransferIncomplete && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const incompletes = rows.filter(r => r.status !== 'completed' && (r.action_text || '').trim());
                if (!incompletes.length) { toast.info('Không có hành động chưa hoàn thành để chuyển'); return; }
                onTransferIncomplete(incompletes.map(r => ({
                  type: r.source_action_type,
                  action_text: r.action_text,
                  expected_result: r.expected_result,
                  skill_id: r._skill_id || null,
                  attitude_dim_id: r._attitude_dim_id || null,
                  attitude_name: r._attitude_name || null,
                  label: r._label,
                })));
                toast.success(`Đã chuyển ${incompletes.length} hành động chưa hoàn thành xuống KH phát triển kỳ này`);
              }}
            >
              Chuyển hành động chưa hoàn thành → KH kỳ này
            </Button>
          )}
          <Button size="sm" onClick={saveAll} disabled={saving} className="ml-auto">
            {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
            Lưu rà soát
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
