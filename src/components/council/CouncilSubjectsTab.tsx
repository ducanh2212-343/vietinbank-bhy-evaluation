import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SUBJECT_LEVEL_LABELS, type CouncilSubjectLevel } from '@/lib/council';

interface SubjectRow {
  id?: string;
  full_name: string;
  position: string;
  subject_level: CouncilSubjectLevel;
  profile_id: string | null;
  supervisor_pgd_id: string | null;
  task_summary: string;
  measurement: string;
  is_active: boolean;
}

interface ProfileOption { id: string; full_name: string; position: string | null; }

interface Props {
  roundId: string;
  roundName: string;
}

const NONE = '__none__';

export function CouncilSubjectsTab({ roundId, roundName }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);

  const load = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    const [subjectsRes, profilesRes] = await Promise.all([
      supabase.from('council_subjects')
        .select('id, full_name, position, subject_level, profile_id, supervisor_pgd_id, task_summary, measurement, is_active, sort_order')
        .eq('round_id', roundId).order('sort_order'),
      supabase.from('profiles').select('id, full_name, position').eq('status', 'active').order('full_name'),
    ]);
    if (subjectsRes.error) { toast.error('Lỗi tải đầu mối: ' + subjectsRes.error.message); setLoading(false); return; }
    setRows((subjectsRes.data || []).map((s) => ({
      id: s.id, full_name: s.full_name, position: s.position || '',
      subject_level: s.subject_level as CouncilSubjectLevel,
      profile_id: s.profile_id, supervisor_pgd_id: s.supervisor_pgd_id,
      task_summary: s.task_summary || '', measurement: s.measurement || '', is_active: s.is_active,
    })));
    setProfiles((profilesRes.data || []) as ProfileOption[]);
    setDeletedIds([]);
    setLoading(false);
  }, [roundId]);

  useEffect(() => { load(); }, [load]);

  const pgdOptions = profiles.filter((p) => (p.position || '').toLowerCase().startsWith('phó giám đốc'));

  const update = (idx: number, patch: Partial<SubjectRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeRow = (idx: number) => {
    const row = rows[idx];
    if (row.id && !window.confirm(`Xóa đầu mối "${row.full_name}" khỏi kỳ ${roundName}?\nLƯU Ý: toàn bộ phiếu đánh giá của đầu mối này trong kỳ sẽ bị xóa theo. Nếu chỉ muốn tạm ẩn, hãy tắt "Hiệu lực".`)) return;
    setRows((prev) => {
      if (row.id) setDeletedIds((d) => [...d, row.id!]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, {
      full_name: '', position: '', subject_level: 'truong_phong',
      profile_id: null, supervisor_pgd_id: null, task_summary: '', measurement: '', is_active: true,
    }]);
  };

  const saveAll = async () => {
    if (!roundId) return;
    if (rows.some((r) => !r.full_name.trim())) { toast.error('Còn đầu mối chưa nhập họ tên'); return; }
    setSaving(true);
    try {
      for (const id of deletedIds) {
        const { error } = await supabase.from('council_subjects').delete().eq('id', id);
        if (error) throw error;
      }
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const payload = {
          round_id: roundId,
          full_name: r.full_name.trim(),
          position: r.position.trim() || null,
          subject_level: r.subject_level,
          profile_id: r.profile_id,
          supervisor_pgd_id: r.subject_level === 'truong_phong' ? r.supervisor_pgd_id : null,
          task_summary: r.task_summary.trim() || null,
          measurement: r.measurement.trim() || null,
          sort_order: i + 1,
          is_active: r.is_active,
        };
        if (r.id) {
          const { error } = await supabase.from('council_subjects').update(payload).eq('id', r.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('council_subjects').insert(payload);
          if (error) throw error;
        }
      }
      toast.success(`Đã lưu danh sách đầu mối kỳ ${roundName}`);
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
        Danh sách cán bộ đầu mối được Hội đồng đánh giá trong kỳ <strong>{roundName}</strong> (Phụ lục 1C).
        "Liên kết tài khoản" giúp hệ thống tự loại cán bộ khỏi danh sách chấm của chính họ và cho phép họ xem
        báo cáo kết quả của mình. "PGĐ phụ trách" áp trọng số 10% với đầu mối cấp Trưởng phòng.
      </p>
      {rows.map((r, idx) => (
        <Card key={r.id || `new-${idx}`}>
          <CardContent className={`p-4 space-y-2.5 ${r.is_active ? '' : 'opacity-70'}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">Đầu mối {idx + 1}</Badge>
              <div className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  Hiệu lực
                  <Switch checked={r.is_active} onCheckedChange={(v) => update(idx, { is_active: v })} />
                </label>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeRow(idx)} title="Xóa đầu mối">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-medium">Họ và tên</label>
                <Input value={r.full_name} onChange={(e) => update(idx, { full_name: e.target.value })} className="mt-0.5 h-8 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-medium">Chức vụ công tác</label>
                <Input value={r.position} onChange={(e) => update(idx, { position: e.target.value })} className="mt-0.5 h-8 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-medium">Cấp đánh giá (quyết định bảng trọng số)</label>
                <Select value={r.subject_level} onValueChange={(v) => update(idx, { subject_level: v as CouncilSubjectLevel })}>
                  <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SUBJECT_LEVEL_LABELS) as CouncilSubjectLevel[]).map((l) => (
                      <SelectItem key={l} value={l} className="text-xs">{SUBJECT_LEVEL_LABELS[l]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[11px] font-medium">Liên kết tài khoản trên hệ thống</label>
                <Select value={r.profile_id || NONE} onValueChange={(v) => update(idx, { profile_id: v === NONE ? null : v })}>
                  <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE} className="text-xs">— Chưa có tài khoản —</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.full_name}{p.position ? ` — ${p.position}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {r.subject_level === 'truong_phong' && (
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium">PGĐ phụ trách (trọng số 10%)</label>
                  <Select value={r.supervisor_pgd_id || NONE} onValueChange={(v) => update(idx, { supervisor_pgd_id: v === NONE ? null : v })}>
                    <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE} className="text-xs">— Không xác định —</SelectItem>
                      {pgdOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.full_name}{p.position ? ` — ${p.position}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <label className="text-[11px] font-medium">Nhiệm vụ trọng tâm đầu mối</label>
              <Textarea value={r.task_summary} onChange={(e) => update(idx, { task_summary: e.target.value })} rows={2} className="mt-0.5 text-xs" />
            </div>
            <div>
              <label className="text-[11px] font-medium">Phương thức đánh giá/đo lường/cam kết</label>
              <Textarea value={r.measurement} onChange={(e) => update(idx, { measurement: e.target.value })} rows={2} className="mt-0.5 text-xs" />
            </div>
          </CardContent>
        </Card>
      ))}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={addRow}>
          <Plus className="w-4 h-4 mr-1" /> Thêm đầu mối
        </Button>
        <Button size="sm" onClick={saveAll} disabled={saving} className="ml-auto">
          {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
          Lưu danh sách đầu mối
        </Button>
      </div>
    </div>
  );
}
