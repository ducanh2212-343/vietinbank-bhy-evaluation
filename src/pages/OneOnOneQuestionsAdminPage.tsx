import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowDown, ArrowUp, Copy, ListPlus, Loader2, MessagesSquare, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { filterQuarterCycles, pickDefaultCycle, type QuarterCycleOption } from '@/lib/evaluationCycles';
import { DEFAULT_ONE_ON_ONE_QUESTIONS } from '@/lib/oneOnOneDefaults';

interface QuestionRow {
  id?: string;
  question_key: string;
  question_text: string;
}

const nextKey = (rows: QuestionRow[]): string => {
  const max = rows.reduce((acc, r) => {
    const m = r.question_key.match(/^q(\d+)$/);
    return m ? Math.max(acc, Number(m[1])) : acc;
  }, 0);
  return `q${max + 1}`;
};

export default function OneOnOneQuestionsAdminPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cycles, setCycles] = useState<QuarterCycleOption[]>([]);
  const [cycleId, setCycleId] = useState('');
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [hasCustomSet, setHasCustomSet] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('evaluation_cycles')
        .select('id, name')
        .eq('cycle_type', 'quarterly')
        .order('start_date');
      const qs = filterQuarterCycles(data || []);
      setCycles(qs);
      setCycleId((prev) => prev || pickDefaultCycle(qs)?.id || '');
    })();
  }, []);

  const loadQuestions = useCallback(async () => {
    if (!cycleId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('one_on_one_questions')
      .select('id, question_key, question_text, sort_order')
      .eq('cycle_id', cycleId)
      .order('sort_order');
    if (error) {
      toast.error('Lỗi tải câu hỏi: ' + error.message);
      setLoading(false);
      return;
    }
    setRows((data || []).map((r) => ({ id: r.id, question_key: r.question_key, question_text: r.question_text })));
    setHasCustomSet((data || []).length > 0);
    setDeletedIds([]);
    setLoading(false);
  }, [cycleId]);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);

  const cycleName = useMemo(() => cycles.find((c) => c.id === cycleId)?.name || '', [cycles, cycleId]);
  const prevCycle = useMemo(() => {
    const idx = cycles.findIndex((c) => c.id === cycleId);
    return idx > 0 ? cycles[idx - 1] : undefined;
  }, [cycles, cycleId]);

  const initFromDefaults = () => {
    setRows(DEFAULT_ONE_ON_ONE_QUESTIONS.map((q) => ({ question_key: q.key, question_text: q.text })));
  };

  const copyFromPreviousCycle = async () => {
    if (!prevCycle) return;
    const { data, error } = await supabase
      .from('one_on_one_questions')
      .select('question_key, question_text, sort_order')
      .eq('cycle_id', prevCycle.id)
      .eq('is_active', true)
      .order('sort_order');
    if (error) { toast.error('Lỗi sao chép: ' + error.message); return; }
    if (!data?.length) {
      toast.info(`${prevCycle.name} dùng bộ mặc định — đã nạp bộ mặc định.`);
      initFromDefaults();
      return;
    }
    setRows(data.map((r) => ({ question_key: r.question_key, question_text: r.question_text })));
    toast.success(`Đã sao chép ${data.length} câu hỏi từ ${prevCycle.name} (bấm Lưu để áp dụng)`);
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
    setRows((prev) => {
      const row = prev[idx];
      if (row.id) setDeletedIds((d) => [...d, row.id!]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, { question_key: nextKey(prev), question_text: '' }]);
  };

  const saveAll = async () => {
    if (!cycleId) return;
    if (rows.some((r) => !r.question_text.trim())) {
      toast.error('Còn câu hỏi chưa nhập nội dung');
      return;
    }
    setSaving(true);
    try {
      for (const id of deletedIds) {
        const { error } = await supabase.from('one_on_one_questions').delete().eq('id', id);
        if (error) throw error;
      }
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const payload = {
          cycle_id: cycleId,
          question_key: r.question_key,
          question_text: r.question_text.trim(),
          sort_order: i + 1,
          is_active: true,
        };
        if (r.id) {
          const { error } = await supabase.from('one_on_one_questions').update(payload).eq('id', r.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('one_on_one_questions').insert(payload);
          if (error) throw error;
        }
      }
      toast.success(`Đã lưu bộ câu hỏi 1-1 cho ${cycleName}`);
      await loadQuestions();
    } catch (e) {
      toast.error('Lỗi lưu: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!cycleId || !hasCustomSet) return;
    setSaving(true);
    const { error } = await supabase.from('one_on_one_questions').delete().eq('cycle_id', cycleId);
    setSaving(false);
    if (error) { toast.error('Lỗi: ' + error.message); return; }
    toast.success(`${cycleName} quay về dùng bộ câu hỏi mặc định`);
    await loadQuestions();
  };

  if (!isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <MessagesSquare className="w-5 h-5 text-primary" /> Câu hỏi trao đổi 1-1 theo kỳ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Thiết đặt bộ câu hỏi 1-1 riêng cho từng kỳ đánh giá. Kỳ chưa thiết đặt sẽ dùng bộ câu hỏi mặc định ({DEFAULT_ONE_ON_ONE_QUESTIONS.length} câu).
          Câu trả lời của cán bộ gắn theo mã câu hỏi nên <strong>sửa nội dung hoặc đổi thứ tự không làm mất câu trả lời đã nhập</strong>;
          xoá câu hỏi sẽ ẩn câu trả lời tương ứng khỏi phiếu.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={cycleId} onValueChange={setCycleId}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Chọn kỳ" /></SelectTrigger>
          <SelectContent>
            {cycles.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant={hasCustomSet ? 'default' : 'outline'} className="text-[10px]">
          {hasCustomSet ? 'Bộ câu hỏi riêng của kỳ' : 'Đang dùng bộ mặc định'}
        </Badge>
        {hasCustomSet && (
          <Button size="sm" variant="outline" onClick={resetToDefaults} disabled={saving}>
            Quay về bộ mặc định
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              {cycleName || 'Kỳ này'} chưa có bộ câu hỏi riêng — biểu mẫu đang dùng bộ mặc định.
              Khởi tạo để chỉnh sửa theo kỳ:
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button size="sm" onClick={initFromDefaults}>
                <ListPlus className="w-4 h-4 mr-1" /> Khởi tạo từ bộ mặc định
              </Button>
              {prevCycle && (
                <Button size="sm" variant="outline" onClick={copyFromPreviousCycle}>
                  <Copy className="w-4 h-4 mr-1" /> Sao chép từ {prevCycle.name}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bộ câu hỏi {cycleName} ({rows.length} câu)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows.map((r, idx) => (
              <div key={r.id || `new-${r.question_key}`} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Câu {idx + 1}</Badge>
                  <span className="text-[10px] text-muted-foreground">mã: {r.question_key}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(idx, -1)} disabled={idx === 0} title="Lên">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => move(idx, 1)} disabled={idx === rows.length - 1} title="Xuống">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeRow(idx)} title="Xoá câu hỏi">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={r.question_text}
                  onChange={(e) => setRows((prev) => prev.map((row, i) => i === idx ? { ...row, question_text: e.target.value } : row))}
                  rows={2}
                  placeholder="Nội dung câu hỏi…"
                  className="text-sm bg-background"
                />
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={addRow}>
                <Plus className="w-4 h-4 mr-1" /> Thêm câu hỏi
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
