import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, ArrowUp, Copy, ListPlus, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SECTION_LABELS, type CouncilSection } from '@/lib/council';
import { DEFAULT_COUNCIL_CRITERIA } from '@/lib/councilDefaults';

interface CriterionRow {
  id?: string;
  criterion_key: string;
  section: CouncilSection;
  title: string;
  description: string;
  anchor_10: string;
  anchor_8: string;
  anchor_6: string;
  anchor_3: string;
  anchor_0: string;
  is_active: boolean;
}

interface Props {
  roundId: string;
  roundName: string;
  rounds: { id: string; name: string }[];
}

const nextKey = (rows: CriterionRow[]): string => {
  const max = rows.reduce((acc, r) => {
    const m = r.criterion_key.match(/^tc(\d+)$/);
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `tc${max + 1}`;
};

const ANCHOR_FIELDS = ['anchor_10', 'anchor_8', 'anchor_6', 'anchor_3', 'anchor_0'] as const;
const ANCHOR_LABELS: Record<(typeof ANCHOR_FIELDS)[number], string> = {
  anchor_10: 'Mức 10đ', anchor_8: 'Mức 8đ', anchor_6: 'Mức 6đ', anchor_3: 'Mức 3đ', anchor_0: 'Mức 0đ',
};

export function CouncilCriteriaTab({ roundId, roundName, rounds }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<CriterionRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('council_criteria')
      .select('id, criterion_key, section, title, description, anchor_10, anchor_8, anchor_6, anchor_3, anchor_0, is_active, sort_order')
      .eq('round_id', roundId)
      .order('sort_order');
    if (error) { toast.error('Lỗi tải tiêu chí: ' + error.message); setLoading(false); return; }
    setRows((data || []).map((r) => ({
      id: r.id, criterion_key: r.criterion_key, section: r.section as CouncilSection,
      title: r.title, description: r.description || '',
      anchor_10: r.anchor_10 || '', anchor_8: r.anchor_8 || '', anchor_6: r.anchor_6 || '',
      anchor_3: r.anchor_3 || '', anchor_0: r.anchor_0 || '', is_active: r.is_active,
    })));
    setDeletedIds([]);
    setLoading(false);
  }, [roundId]);

  useEffect(() => { load(); }, [load]);

  const otherRounds = useMemo(() => rounds.filter((r) => r.id !== roundId), [rounds, roundId]);

  const initFromDefaults = () => {
    setRows(DEFAULT_COUNCIL_CRITERIA.map((c) => ({
      criterion_key: c.key, section: c.section, title: c.title, description: c.description,
      anchor_10: c.anchor_10, anchor_8: c.anchor_8, anchor_6: c.anchor_6, anchor_3: c.anchor_3, anchor_0: c.anchor_0,
      is_active: true,
    })));
    toast.info('Đã nạp bộ 10 tiêu chí mặc định — bấm "Lưu bộ câu hỏi" để áp dụng.');
  };

  const copyFromRound = async (sourceId: string) => {
    const source = rounds.find((r) => r.id === sourceId);
    const { data, error } = await supabase
      .from('council_criteria')
      .select('criterion_key, section, title, description, anchor_10, anchor_8, anchor_6, anchor_3, anchor_0, is_active, sort_order')
      .eq('round_id', sourceId)
      .order('sort_order');
    if (error) { toast.error('Lỗi sao chép: ' + error.message); return; }
    if (!data?.length) { toast.info(`${source?.name || 'Kỳ nguồn'} chưa có tiêu chí.`); return; }
    setRows(data.map((r) => ({
      criterion_key: r.criterion_key, section: r.section as CouncilSection, title: r.title,
      description: r.description || '', anchor_10: r.anchor_10 || '', anchor_8: r.anchor_8 || '',
      anchor_6: r.anchor_6 || '', anchor_3: r.anchor_3 || '', anchor_0: r.anchor_0 || '', is_active: r.is_active,
    })));
    setDeletedIds(rows.filter((r) => r.id).map((r) => r.id!));
    toast.success(`Đã sao chép ${data.length} tiêu chí từ ${source?.name} (bấm Lưu để áp dụng)`);
  };

  const update = (idx: number, patch: Partial<CriterionRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const move = (idx: number, dir: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const removeRow = (idx: number) => {
    const row = rows[idx];
    if (row.id && !window.confirm(`Xóa tiêu chí "${row.title}"?\nLƯU Ý: điểm đã chấm cho tiêu chí này ở kỳ ${roundName} sẽ bị xóa theo. Nếu chỉ muốn ẩn khỏi phiếu, hãy tắt "Hiệu lực".`)) return;
    setRows((prev) => {
      if (row.id) setDeletedIds((d) => [...d, row.id!]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, {
      criterion_key: nextKey(prev), section: 'nang_luc', title: '', description: '',
      anchor_10: '', anchor_8: '', anchor_6: '', anchor_3: '', anchor_0: '', is_active: true,
    }]);
  };

  const saveAll = async () => {
    if (!roundId) return;
    if (rows.some((r) => !r.title.trim())) { toast.error('Còn tiêu chí chưa nhập tên'); return; }
    setSaving(true);
    try {
      for (const id of deletedIds) {
        const { error } = await supabase.from('council_criteria').delete().eq('id', id);
        if (error) throw error;
      }
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const payload = {
          round_id: roundId,
          criterion_key: r.criterion_key,
          section: r.section,
          title: r.title.trim(),
          description: r.description.trim() || null,
          anchor_10: r.anchor_10.trim() || null,
          anchor_8: r.anchor_8.trim() || null,
          anchor_6: r.anchor_6.trim() || null,
          anchor_3: r.anchor_3.trim() || null,
          anchor_0: r.anchor_0.trim() || null,
          sort_order: i + 1,
          is_active: r.is_active,
        };
        if (r.id) {
          const { error } = await supabase.from('council_criteria').update(payload).eq('id', r.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('council_criteria').insert(payload);
          if (error) throw error;
        }
      }
      toast.success(`Đã lưu bộ câu hỏi đánh giá đầu mối cho ${roundName}`);
      await load();
    } catch (e) {
      toast.error('Lỗi lưu: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Bộ câu hỏi định hướng của kỳ <strong>{roundName}</strong>. Điểm đã chấm gắn theo tiêu chí nên
        <strong> sửa nội dung/đổi thứ tự không làm mất điểm</strong>; tắt "Hiệu lực" sẽ ẩn tiêu chí khỏi phiếu
        (điểm cũ được giữ lại); xóa tiêu chí sẽ xóa điểm đã chấm theo.
      </p>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Kỳ này chưa có bộ tiêu chí.</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button size="sm" onClick={initFromDefaults}>
                <ListPlus className="w-4 h-4 mr-1" /> Khởi tạo từ bộ mặc định (10 tiêu chí)
              </Button>
              {otherRounds.map((r) => (
                <Button key={r.id} size="sm" variant="outline" onClick={() => copyFromRound(r.id)}>
                  <Copy className="w-4 h-4 mr-1" /> Sao chép từ {r.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bộ câu hỏi {roundName} ({rows.length} tiêu chí)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((r, idx) => (
              <div key={r.id || `new-${r.criterion_key}`} className={`border rounded-lg p-3 space-y-2 ${r.is_active ? 'bg-muted/20' : 'bg-muted/50 opacity-70'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">Tiêu chí {idx + 1}</Badge>
                  <span className="text-[10px] text-muted-foreground">mã: {r.criterion_key}</span>
                  <Select value={r.section} onValueChange={(v) => update(idx, { section: v as CouncilSection })}>
                    <SelectTrigger className="w-[280px] h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(SECTION_LABELS) as CouncilSection[]).map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{SECTION_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      Hiệu lực
                      <Switch checked={r.is_active} onCheckedChange={(v) => update(idx, { is_active: v })} />
                    </label>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(idx, -1)} disabled={idx === 0} title="Lên">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(idx, 1)} disabled={idx === rows.length - 1} title="Xuống">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeRow(idx)} title="Xóa tiêu chí">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <Input
                  value={r.title}
                  onChange={(e) => update(idx, { title: e.target.value })}
                  placeholder="Tên tiêu chí…"
                  className="text-sm bg-background font-medium"
                />
                <Textarea
                  value={r.description}
                  onChange={(e) => update(idx, { description: e.target.value })}
                  rows={2}
                  placeholder="Mô tả ngắn về tiêu chí…"
                  className="text-sm bg-background"
                />
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground select-none">Chuẩn hành vi tham chiếu (mốc điểm 10/8/6/3/0)</summary>
                  <div className="mt-2 space-y-2">
                    {ANCHOR_FIELDS.map((f) => (
                      <div key={f}>
                        <label className="text-[11px] font-medium">{ANCHOR_LABELS[f]}</label>
                        <Textarea
                          value={r[f]}
                          onChange={(e) => update(idx, { [f]: e.target.value } as Partial<CriterionRow>)}
                          rows={2}
                          className="mt-0.5 text-xs bg-background"
                        />
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Button size="sm" variant="outline" onClick={addRow}>
                <Plus className="w-4 h-4 mr-1" /> Thêm tiêu chí
              </Button>
              <Button size="sm" onClick={saveAll} disabled={saving} className="ml-auto">
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Lưu bộ câu hỏi
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
