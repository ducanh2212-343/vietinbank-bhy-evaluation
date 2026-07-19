import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { NotebookPen, Sparkles, ThumbsUp, Wrench, RotateCcw, Archive, Share2, CheckCircle2, Lock, LockOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useNepTotAccess } from '@/hooks/useNepTotAccess';
import { ATTITUDE_DIMENSIONS } from '@/components/bm/AttitudeConstants';
import {
  type BehaviorNoteStatus, type BehaviorType, type ImpactLevel,
  BEHAVIOR_TYPE_LABELS, NOTE_STATUS_LABELS, IMPACT_LEVEL_LABELS,
  MAX_SKILLS_PER_NOTE, MAX_ATTITUDES_PER_NOTE, parseStructuringResponse,
} from '@/lib/nepTot';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

type BehaviorNote = Tables<'behavior_notes'>;
type SkillOption = { id: string; code: string; name: string };

const ALL = '__all__';

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Nhật ký hành vi (Nếp Tốt): xem mẩu nhớ chưa hoàn thiện, hoàn thiện với gợi ý
 * AI, xác nhận, chia sẻ cho cán bộ, lưu trữ. Không có xếp hạng/đếm công khai.
 */
export default function BehaviorJournalPage() {
  const { canRecord, canViewJournal, profileId, staff } = useNepTotAccess();

  const [notes, setNotes] = useState<BehaviorNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  // Bộ lọc
  const [statusFilter, setStatusFilter] = useState<BehaviorNoteStatus>('nhap');
  const [employeeFilter, setEmployeeFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [skillFilter, setSkillFilter] = useState(ALL);
  const [attitudeFilter, setAttitudeFilter] = useState(ALL);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Dialog hoàn thiện
  const [editing, setEditing] = useState<BehaviorNote | null>(null);
  const [edit, setEdit] = useState({
    rawText: '', behaviorType: 'tich_cuc' as BehaviorType, situation: '', behavior: '',
    impact: '', skillIds: [] as string[], attitudeIds: [] as number[],
    impactLevel: '' as '' | ImpactLevel, isRepeated: null as boolean | null,
  });
  const [aiHint, setAiHint] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [notesRes, skillsRes] = await Promise.all([
        supabase.from('behavior_notes').select('*').order('occurred_at', { ascending: false }).limit(500),
        supabase.from('skill_catalog').select('id, code, name').eq('is_active', true).order('sort_order'),
      ]);
      if (notesRes.error) throw notesRes.error;
      const list = notesRes.data ?? [];
      setNotes(list);
      setSkills((skillsRes.data ?? []) as SkillOption[]);

      // Tên cán bộ: ưu tiên danh sách trong scope; bổ sung tên còn thiếu (VD cán bộ đã chuyển phòng)
      const map: Record<string, string> = {};
      staff.forEach((s) => { map[s.id] = s.full_name; });
      const missing = Array.from(new Set(list.map((n) => n.employee_id))).filter((id) => !map[id]);
      if (missing.length) {
        const { data } = await supabase.from('profiles').select('id, full_name').in('id', missing);
        (data ?? []).forEach((p) => { map[p.id] = p.full_name; });
      }
      setNameMap(map);
    } catch (e) {
      console.error(e);
      toast.error('Không tải được nhật ký hành vi.');
    } finally {
      setLoading(false);
    }
  }, [staff]);

  useEffect(() => { void load(); }, [load]);

  const draftCount = useMemo(() => notes.filter((n) => n.status === 'nhap' && n.observer_id === profileId).length, [notes, profileId]);

  const filtered = useMemo(() => notes.filter((n) => {
    if (n.status !== statusFilter) return false;
    if (employeeFilter !== ALL && n.employee_id !== employeeFilter) return false;
    if (typeFilter !== ALL && n.behavior_type !== typeFilter) return false;
    if (skillFilter !== ALL && !n.skill_ids.includes(skillFilter)) return false;
    if (attitudeFilter !== ALL && !n.attitude_dimension_ids.includes(Number(attitudeFilter))) return false;
    if (fromDate && n.occurred_at < new Date(fromDate).toISOString()) return false;
    if (toDate && n.occurred_at > new Date(`${toDate}T23:59:59`).toISOString()) return false;
    return true;
  }), [notes, statusFilter, employeeFilter, typeFilter, skillFilter, attitudeFilter, fromDate, toDate]);

  const openEdit = (n: BehaviorNote) => {
    setEditing(n);
    setEdit({
      rawText: n.raw_text,
      behaviorType: n.behavior_type as BehaviorType,
      situation: n.situation ?? '',
      behavior: n.behavior ?? '',
      impact: n.impact ?? '',
      skillIds: n.skill_ids ?? [],
      attitudeIds: n.attitude_dimension_ids ?? [],
      impactLevel: (n.impact_level as ImpactLevel | null) ?? '',
      isRepeated: n.is_repeated,
    });
    setAiHint('');
  };

  const runAi = async () => {
    if (!editing) return;
    setAiLoading(true);
    try {
      const emp = staff.find((s) => s.id === editing.employee_id);
      // Không gửi tên/mã cán bộ ra AI — chỉ vị trí + đơn vị
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          mode: 'behavior_structuring',
          raw_text: edit.rawText,
          behavior_type_label: BEHAVIOR_TYPE_LABELS[edit.behaviorType],
          occurred_at: fmtDateTime(editing.occurred_at),
          position_title: emp?.position_title || 'cán bộ',
          department_name: emp?.department_name || '',
          skills_catalog: skills.map((s) => `${s.code} · ${s.name}`).join('\n'),
          attitudes_catalog: ATTITUDE_DIMENSIONS.map((a) => `${a.id}. ${a.name}`).join('\n'),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const suggestion = parseStructuringResponse(data?.text ?? '');
      if (!suggestion) {
        toast.error('AI trả về định dạng không đọc được — thử lại hoặc tự điền tay.');
        return;
      }
      const codeToId = new Map(skills.map((s) => [s.code, s.id]));
      setEdit((p) => ({
        ...p,
        situation: suggestion.situation || p.situation,
        behavior: suggestion.behavior || suggestion.rewrite || p.behavior,
        impact: suggestion.impact || p.impact,
        skillIds: suggestion.skill_codes.map((c) => codeToId.get(c)).filter((v): v is string => !!v).slice(0, MAX_SKILLS_PER_NOTE),
        attitudeIds: suggestion.attitude_ids.slice(0, MAX_ATTITUDES_PER_NOTE),
        impactLevel: suggestion.impact_level ?? p.impactLevel,
      }));
      setAiHint(suggestion.is_repeated_hint);
      // Lưu bản gợi ý gốc để đối chiếu về sau
      await supabase.from('behavior_notes').update({ ai_draft: suggestion as never }).eq('id', editing.id);
      toast.success('AI đã đề xuất bản cấu trúc — kiểm tra, chỉnh sửa rồi xác nhận.');
    } catch (e: unknown) {
      toast.error(`Lỗi gọi AI: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setAiLoading(false);
    }
  };

  const persistEdit = async (status?: BehaviorNoteStatus) => {
    if (!editing) return;
    if (status === 'da_xac_nhan' && !edit.behavior.trim() && !edit.rawText.trim()) {
      toast.error('Cần mô tả hành vi trước khi xác nhận.');
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase.from('behavior_notes').update({
        raw_text: edit.rawText.trim(),
        behavior_type: edit.behaviorType,
        situation: edit.situation.trim() || null,
        behavior: edit.behavior.trim() || null,
        impact: edit.impact.trim() || null,
        skill_ids: edit.skillIds,
        attitude_dimension_ids: edit.attitudeIds,
        impact_level: edit.impactLevel || null,
        is_repeated: edit.isRepeated,
        ...(status ? { status } : {}),
      }).eq('id', editing.id);
      if (error) throw error;
      toast.success(status === 'da_xac_nhan' ? 'Đã xác nhận bản ghi — có thể dùng cho phân tích.' : 'Đã lưu.');
      setEditing(null);
      void load();
    } catch (e: unknown) {
      toast.error(`Lỗi khi lưu: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingEdit(false);
    }
  };

  const setNoteStatus = async (n: BehaviorNote, status: BehaviorNoteStatus) => {
    const { error } = await supabase.from('behavior_notes').update({ status }).eq('id', n.id);
    if (error) toast.error(`Lỗi: ${error.message}`);
    else void load();
  };

  const toggleVisibility = async (n: BehaviorNote) => {
    const next = n.visibility === 'rieng_tu' ? 'quan_ly' : 'rieng_tu';
    const { error } = await supabase.from('behavior_notes').update({ visibility: next }).eq('id', n.id);
    if (error) toast.error(`Lỗi: ${error.message}`);
    else {
      toast.success(next === 'rieng_tu'
        ? 'Đã chuyển riêng tư — chỉ mình bạn xem được bản ghi này.'
        : 'Đã mở lại cho các quản lý của cán bộ xem (sau khi xác nhận).');
      void load();
    }
  };

  const toggleShare = async (n: BehaviorNote, share: boolean) => {
    const { error } = await supabase.from('behavior_notes').update({ shared_with_employee: share }).eq('id', n.id);
    if (error) toast.error(`Lỗi: ${error.message}`);
    else {
      toast.success(share ? 'Đã chia sẻ bản ghi cho cán bộ.' : 'Đã thu hồi chia sẻ.');
      void load();
    }
  };

  if (!canViewJournal) {
    return (
      <div className="max-w-2xl mx-auto mt-10 text-center text-muted-foreground">
        <NotebookPen className="w-10 h-10 mx-auto mb-3 opacity-40" />
        Nhật ký hành vi dành cho lãnh đạo có phạm vi ghi nhận (Trưởng/Phó phòng, PGĐ, Giám đốc) và quản trị chi nhánh.
      </div>
    );
  }

  const skillName = (id: string) => skills.find((s) => s.id === id);
  const canToggleType = (v: BehaviorType) => setEdit((p) => ({ ...p, behaviorType: v }));

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-primary" /> Nhật ký hành vi
          </h1>
          <p className="text-sm text-muted-foreground">
            Nếp Tốt — Sổ tay hành vi BHY. Dữ liệu chỉ hỗ trợ tư vấn/coaching, không tự thay đổi điểm đánh giá.
          </p>
        </div>
        {draftCount > 0 && (
          <Badge variant="secondary" className="text-amber-700 bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300">
            {draftCount} mẩu nhớ chưa hoàn thiện
          </Badge>
        )}
      </div>

      {/* Tab trạng thái */}
      <div className="flex gap-1.5">
        {(Object.keys(NOTE_STATUS_LABELS) as BehaviorNoteStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
            }`}
          >
            {NOTE_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Bộ lọc */}
      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Cán bộ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả cán bộ</SelectItem>
              {/* Hợp danh sách scope + tên xuất hiện trong nhật ký (admin không có scope ghi) */}
              {Array.from(new Map([
                ...staff.map((s) => [s.id, s.full_name] as const),
                ...Object.entries(nameMap),
              ]).entries())
                .sort((a, b) => a[1].localeCompare(b[1], 'vi'))
                .map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Loại" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Cả hai loại</SelectItem>
              <SelectItem value="tich_cuc">{BEHAVIOR_TYPE_LABELS.tich_cuc}</SelectItem>
              <SelectItem value="can_cai_thien">{BEHAVIOR_TYPE_LABELS.can_cai_thien}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={skillFilter} onValueChange={setSkillFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Skill" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi skill</SelectItem>
              {skills.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} · {s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={attitudeFilter} onValueChange={setAttitudeFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Nhóm thái độ" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Mọi nhóm thái độ</SelectItem>
              {ATTITUDE_DIMENSIONS.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.id}. {a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 text-sm" aria-label="Từ ngày" />
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 text-sm" aria-label="Đến ngày" />
        </CardContent>
      </Card>

      {/* Danh sách */}
      {loading ? (
        <div className="text-center text-muted-foreground py-10">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          {statusFilter === 'nhap'
            ? 'Không có mẩu nhớ nào — bấm nút “+” ở góc màn hình để ghi nhanh khi nhớ ra một tình huống.'
            : 'Không có bản ghi phù hợp bộ lọc.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <Card key={n.id} className="overflow-hidden">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="font-semibold text-sm">{nameMap[n.employee_id] || 'Cán bộ'}</span>
                      <Badge
                        variant="outline"
                        className={n.behavior_type === 'tich_cuc'
                          ? 'border-emerald-400 text-emerald-700 dark:text-emerald-300'
                          : 'border-amber-400 text-amber-700 dark:text-amber-300'}
                      >
                        {n.behavior_type === 'tich_cuc' ? <ThumbsUp className="w-3 h-3 mr-1" /> : <Wrench className="w-3 h-3 mr-1" />}
                        {BEHAVIOR_TYPE_LABELS[n.behavior_type as BehaviorType]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{fmtDateTime(n.occurred_at)}</span>
                      {n.observer_id !== profileId && <Badge variant="secondary" className="text-[10px]">Người khác ghi</Badge>}
                      {n.visibility === 'rieng_tu' && (
                        <Badge variant="secondary" className="text-[10px]"><Lock className="w-3 h-3 mr-0.5" />Riêng tư</Badge>
                      )}
                      {n.shared_with_employee && (
                        <Badge variant="secondary" className="text-[10px]"><Share2 className="w-3 h-3 mr-0.5" />Đã chia sẻ</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{n.behavior || n.raw_text}</p>
                    {(n.skill_ids.length > 0 || n.attitude_dimension_ids.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {n.skill_ids.map((id) => {
                          const s = skillName(id);
                          return s ? <Badge key={id} variant="secondary" className="text-[10px]">{s.code}</Badge> : null;
                        })}
                        {n.attitude_dimension_ids.map((id) => {
                          const a = ATTITUDE_DIMENSIONS.find((x) => x.id === id);
                          return a ? <Badge key={id} variant="secondary" className="text-[10px]">TĐ{id} · {a.name}</Badge> : null;
                        })}
                      </div>
                    )}
                  </div>

                  {n.observer_id === profileId && (
                    <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                      <Button
                        size="sm" variant="ghost" className="h-8"
                        title={n.visibility === 'rieng_tu'
                          ? 'Đang riêng tư (chỉ mình tôi) — bấm để các quản lý của cán bộ xem được'
                          : 'Các quản lý của cán bộ đang xem được — bấm để chuyển riêng tư'}
                        onClick={() => toggleVisibility(n)}
                      >
                        {n.visibility === 'rieng_tu' ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
                      </Button>
                      {n.status === 'nhap' && (
                        <Button size="sm" variant="default" className="h-8" onClick={() => openEdit(n)}>
                          Hoàn thiện
                        </Button>
                      )}
                      {n.status === 'da_xac_nhan' && (
                        <>
                          <Button size="sm" variant="outline" className="h-8" onClick={() => openEdit(n)}>Sửa</Button>
                          <Button
                            size="sm" variant="outline" className="h-8"
                            title={n.shared_with_employee ? 'Thu hồi chia sẻ' : 'Chia sẻ cho cán bộ xem'}
                            onClick={() => toggleShare(n, !n.shared_with_employee)}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8" title="Lưu trữ" onClick={() => setNoteStatus(n, 'luu_tru')}>
                            <Archive className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {n.status === 'luu_tru' && (
                        <Button size="sm" variant="ghost" className="h-8" title="Khôi phục về nháp" onClick={() => setNoteStatus(n, 'nhap')}>
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog hoàn thiện */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hoàn thiện bản ghi hành vi</DialogTitle>
            <DialogDescription>
              {editing ? `${nameMap[editing.employee_id] || 'Cán bộ'} · ${fmtDateTime(editing.occurred_at)}` : ''}
              {' — '}AI chỉ gợi ý; bạn kiểm tra và xác nhận trước khi bản ghi được dùng.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Mẩu nhớ gốc</Label>
              <Textarea value={edit.rawText} onChange={(e) => setEdit((p) => ({ ...p, rawText: e.target.value }))} rows={2} className="text-sm mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => canToggleType('tich_cuc')}
                className={`rounded-lg border px-2 py-2 text-sm font-medium ${edit.behaviorType === 'tich_cuc' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'hover:bg-muted'}`}
              >
                {BEHAVIOR_TYPE_LABELS.tich_cuc}
              </button>
              <button
                onClick={() => canToggleType('can_cai_thien')}
                className={`rounded-lg border px-2 py-2 text-sm font-medium ${edit.behaviorType === 'can_cai_thien' ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' : 'hover:bg-muted'}`}
              >
                {BEHAVIOR_TYPE_LABELS.can_cai_thien}
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={runAi} disabled={aiLoading} className="w-full">
              <Sparkles className="w-4 h-4 mr-1.5" />
              {aiLoading ? 'AI đang phân tích...' : 'AI gợi ý bản cấu trúc'}
            </Button>
            {aiHint && <p className="text-xs text-muted-foreground italic">Gợi ý về mức lặp lại: {aiHint}</p>}

            <div className="grid gap-2">
              <div>
                <Label className="text-xs">Tình huống</Label>
                <Textarea value={edit.situation} onChange={(e) => setEdit((p) => ({ ...p, situation: e.target.value }))} rows={2} className="text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Hành vi quan sát được</Label>
                <Textarea value={edit.behavior} onChange={(e) => setEdit((p) => ({ ...p, behavior: e.target.value }))} rows={2} className="text-sm mt-1" />
              </div>
              <div>
                <Label className="text-xs">Tác động / kết quả</Label>
                <Textarea value={edit.impact} onChange={(e) => setEdit((p) => ({ ...p, impact: e.target.value }))} rows={2} className="text-sm mt-1" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Skill liên quan (tối đa {MAX_SKILLS_PER_NOTE})</Label>
              <div className="flex flex-wrap gap-1 mt-1 max-h-28 overflow-y-auto rounded-lg border p-2">
                {skills.map((s) => {
                  const on = edit.skillIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setEdit((p) => ({
                        ...p,
                        skillIds: on
                          ? p.skillIds.filter((x) => x !== s.id)
                          : p.skillIds.length >= MAX_SKILLS_PER_NOTE ? p.skillIds : [...p.skillIds, s.id],
                      }))}
                      className={`px-2 py-0.5 rounded-full text-[11px] border ${on ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                      title={s.name}
                    >
                      {s.code}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs">Nhóm thái độ liên quan (tối đa {MAX_ATTITUDES_PER_NOTE})</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {ATTITUDE_DIMENSIONS.map((a) => {
                  const on = edit.attitudeIds.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => setEdit((p) => ({
                        ...p,
                        attitudeIds: on
                          ? p.attitudeIds.filter((x) => x !== a.id)
                          : p.attitudeIds.length >= MAX_ATTITUDES_PER_NOTE ? p.attitudeIds : [...p.attitudeIds, a.id],
                      }))}
                      className={`px-2 py-1 rounded-full text-[11px] border text-left ${on ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                    >
                      {a.id}. {a.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <Label className="text-xs">Mức độ tác động</Label>
                <Select value={edit.impactLevel || 'none'} onValueChange={(v) => setEdit((p) => ({ ...p, impactLevel: v === 'none' ? '' : (v as ImpactLevel) }))}>
                  <SelectTrigger className="h-9 text-sm mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Chưa đánh giá</SelectItem>
                    {(Object.keys(IMPACT_LEVEL_LABELS) as ImpactLevel[]).map((k) => (
                      <SelectItem key={k} value={k}>{IMPACT_LEVEL_LABELS[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-5">
                <Switch
                  id="nt-repeated"
                  checked={edit.isRepeated === true}
                  onCheckedChange={(v) => setEdit((p) => ({ ...p, isRepeated: v }))}
                />
                <Label htmlFor="nt-repeated" className="text-xs">Hành vi đã lặp lại</Label>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => persistEdit()} disabled={savingEdit}>Lưu nháp</Button>
              <Button onClick={() => persistEdit('da_xac_nhan')} disabled={savingEdit}>
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Xác nhận bản ghi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
