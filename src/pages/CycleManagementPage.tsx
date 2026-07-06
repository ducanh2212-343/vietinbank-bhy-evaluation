import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarClock, Loader2, Plus, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { filterQuarterCycles, nextQuarterName, quarterDateRange } from '@/lib/evaluationCycles';
import { getEffectiveDeadline } from '@/lib/submissionKpi';

interface CycleRow {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  cycle_type: string;
  status: string;
  submission_deadline: string | null;
  late_penalty_points: number;
}

const CYCLE_STATUS_OPTIONS = [
  { value: 'draft', label: 'Chuẩn bị' },
  { value: 'in_progress', label: 'Đang mở' },
  { value: 'closed', label: 'Đã đóng' },
];

const cycleStatusLabel = (s: string) => CYCLE_STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

/** ISO timestamptz → giá trị cho <input type="datetime-local"> theo giờ máy người dùng. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface EditState {
  status: string;
  deadlineLocal: string;
  penalty: string;
  description: string;
}

export default function CycleManagementPage() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [cycles, setCycles] = useState<CycleRow[]>([]);
  const [edits, setEdits] = useState<Record<string, EditState>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCycle, setNewCycle] = useState({
    name: '',
    description: '',
    start: '',
    end: '',
    deadlineLocal: '',
    penalty: '1',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('evaluation_cycles')
      .select('id, name, description, start_date, end_date, cycle_type, status, submission_deadline, late_penalty_points')
      .order('start_date');
    if (error) {
      toast.error('Lỗi tải danh sách kỳ: ' + error.message);
      setLoading(false);
      return;
    }
    const rows = (data || []) as CycleRow[];
    setCycles(rows);
    const e: Record<string, EditState> = {};
    rows.forEach((c) => {
      e[c.id] = {
        status: c.status,
        deadlineLocal: isoToLocalInput(c.submission_deadline),
        penalty: String(c.late_penalty_points ?? 1),
        description: c.description || '',
      };
    });
    setEdits(e);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const latestQuarter = useMemo(() => {
    const qs = filterQuarterCycles(cycles);
    return qs.length ? qs[qs.length - 1] : undefined;
  }, [cycles]);

  const openCreate = () => {
    const suggestedName = latestQuarter ? nextQuarterName(latestQuarter.name) || '' : '';
    const range = suggestedName ? quarterDateRange(suggestedName) : null;
    setNewCycle({
      name: suggestedName,
      description: suggestedName ? `Đánh giá ${suggestedName}: rà soát kế hoạch hành động kỳ trước và xây dựng kế hoạch phát triển kỳ tiếp theo` : '',
      start: range?.start || '',
      end: range?.end || '',
      deadlineLocal: range ? `${range.end}T17:00` : '',
      penalty: '1',
    });
    setCreateOpen(true);
  };

  const handleNameChange = (name: string) => {
    const range = quarterDateRange(name);
    setNewCycle((prev) => ({
      ...prev,
      name,
      start: range?.start || prev.start,
      end: range?.end || prev.end,
    }));
  };

  const createCycle = async () => {
    if (!newCycle.name.trim() || !newCycle.start || !newCycle.end) {
      toast.error('Cần nhập tên kỳ, ngày bắt đầu và ngày kết thúc');
      return;
    }
    if (cycles.some((c) => c.name === newCycle.name.trim())) {
      toast.error(`Kỳ "${newCycle.name.trim()}" đã tồn tại`);
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('evaluation_cycles').insert({
      name: newCycle.name.trim(),
      description: newCycle.description.trim() || null,
      start_date: newCycle.start,
      end_date: newCycle.end,
      cycle_type: 'quarterly',
      status: 'in_progress',
      submission_deadline: localInputToIso(newCycle.deadlineLocal),
      late_penalty_points: Number(newCycle.penalty) || 0,
    });
    setCreating(false);
    if (error) {
      toast.error('Lỗi tạo kỳ: ' + error.message);
      return;
    }
    toast.success(`Đã tạo kỳ đánh giá ${newCycle.name.trim()}`);
    setCreateOpen(false);
    await load();
  };

  const saveCycle = async (c: CycleRow) => {
    const e = edits[c.id];
    if (!e) return;
    setSavingId(c.id);
    const { error } = await supabase
      .from('evaluation_cycles')
      .update({
        status: e.status as Database['public']['Enums']['evaluation_status'],
        submission_deadline: localInputToIso(e.deadlineLocal),
        late_penalty_points: Number(e.penalty) || 0,
        description: e.description.trim() || null,
      })
      .eq('id', c.id);
    setSavingId(null);
    if (error) {
      toast.error('Lỗi lưu kỳ: ' + error.message);
      return;
    }
    toast.success(`Đã lưu thiết đặt cho ${c.name}`);
    await load();
  };

  if (!isAdmin) {
    return <div className="p-6 text-sm text-muted-foreground">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" /> Quản lý kỳ đánh giá
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tạo kỳ đánh giá theo quý, thiết đặt <strong>mốc thời gian nộp biểu mẫu</strong> và số điểm KPI bị trừ khi chậm.
          Thời gian nộp cuối cùng tính theo thời điểm <strong>Phó giám đốc duyệt</strong>: biểu mẫu được duyệt sau mốc
          (hoặc chưa duyệt xong khi đã quá mốc) sẽ bị tính chậm trong "Báo cáo nộp biểu mẫu".
        </p>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Tạo kỳ mới{latestQuarter ? ` (${nextQuarterName(latestQuarter.name) || 'kỳ tiếp theo'})` : ''}
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>
      ) : cycles.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Chưa có kỳ đánh giá nào.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {cycles.map((c) => {
            const e = edits[c.id];
            if (!e) return null;
            const noDeadlineSet = !e.deadlineLocal;
            const effective = getEffectiveDeadline({ end_date: c.end_date, submission_deadline: localInputToIso(e.deadlineLocal) });
            return (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <Badge variant={e.status === 'in_progress' ? 'default' : 'outline'} className="text-[10px]">
                      {cycleStatusLabel(e.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.start_date).toLocaleDateString('vi-VN')} – {new Date(c.end_date).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">Trạng thái kỳ</label>
                      <Select value={e.status} onValueChange={(v) => setEdits((prev) => ({ ...prev, [c.id]: { ...prev[c.id], status: v } }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CYCLE_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          {!CYCLE_STATUS_OPTIONS.some((o) => o.value === e.status) && (
                            <SelectItem value={e.status}>{e.status}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">Mốc thời gian nộp biểu mẫu</label>
                      <Input
                        type="datetime-local"
                        className="h-9 text-sm"
                        value={e.deadlineLocal}
                        onChange={(ev) => setEdits((prev) => ({ ...prev, [c.id]: { ...prev[c.id], deadlineLocal: ev.target.value } }))}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground font-medium">Điểm KPI trừ khi nộp chậm</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.5"
                        className="h-9 text-sm"
                        value={e.penalty}
                        onChange={(ev) => setEdits((prev) => ({ ...prev, [c.id]: { ...prev[c.id], penalty: ev.target.value } }))}
                      />
                    </div>
                  </div>
                  {noDeadlineSet && (
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Chưa thiết đặt mốc — hệ thống tạm dùng 23:59 ngày kết thúc kỳ ({effective.toLocaleString('vi-VN')}).
                    </p>
                  )}
                  <div>
                    <label className="text-[11px] text-muted-foreground font-medium">Mô tả</label>
                    <Textarea
                      rows={2}
                      value={e.description}
                      onChange={(ev) => setEdits((prev) => ({ ...prev, [c.id]: { ...prev[c.id], description: ev.target.value } }))}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => saveCycle(c)} disabled={savingId === c.id}>
                      {savingId === c.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />}
                      Lưu thiết đặt
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tạo kỳ đánh giá mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Tên kỳ (định dạng "Quý I/2026")</label>
              <Input value={newCycle.name} onChange={(ev) => handleNameChange(ev.target.value)} placeholder="Quý IV/2026" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">Ngày bắt đầu</label>
                <Input type="date" value={newCycle.start} onChange={(ev) => setNewCycle((p) => ({ ...p, start: ev.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">Ngày kết thúc</label>
                <Input type="date" value={newCycle.end} onChange={(ev) => setNewCycle((p) => ({ ...p, end: ev.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">Mốc thời gian nộp biểu mẫu</label>
                <Input type="datetime-local" value={newCycle.deadlineLocal} onChange={(ev) => setNewCycle((p) => ({ ...p, deadlineLocal: ev.target.value }))} />
              </div>
              <div>
                <label className="text-[11px] text-muted-foreground font-medium">Điểm KPI trừ khi nộp chậm</label>
                <Input type="number" min={0} step="0.5" value={newCycle.penalty} onChange={(ev) => setNewCycle((p) => ({ ...p, penalty: ev.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium">Mô tả</label>
              <Textarea rows={2} value={newCycle.description} onChange={(ev) => setNewCycle((p) => ({ ...p, description: ev.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Huỷ</Button>
            <Button onClick={createCycle} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Tạo kỳ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
