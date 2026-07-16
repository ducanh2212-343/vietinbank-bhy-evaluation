// Trang "Dấu ấn Bắc Hưng Yên Mark" (/dau-an)
// - GĐ/TCTH admin: nhập & chỉnh khung dấu ấn cho từng PGĐ (tiêu đề, năng lực lãnh đạo,
//   giá trị cốt lõi, tối đa 2 Skill, hạn, trạng thái) → thẻ Kanban tự sinh cho PGĐ.
// - PGĐ: xem dấu ấn của mình, cập nhật STAR + sản phẩm quản trị để lại
//   (tiến độ hằng tuần cập nhật trên thẻ Kanban như mọi thẻ khác).
// - Xuất "hành trình tạo dấu ấn" theo năng lực & skill ra Word.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Award, Download, Pencil, Plus, Sparkles, Archive, CalendarCheck, AlertTriangle, History } from 'lucide-react';
import { exportLeadershipJourney } from '@/lib/exportLeadershipJourney';
import { fetchWeeklyUpdateMap, type KanbanCard, type WeeklyUpdateMap } from '@/lib/kanban';
import { UpdateProgressDialog } from '@/components/kanban/UpdateProgressDialog';

const sb = supabase as any;

// Nhịp hằng tuần: cập nhật viết theo khung STAR, tích lũy thành dòng thời gian của dấu ấn
const STAR_SUGGESTIONS = [
  'Bối cảnh tuần này:',
  'Hành động lãnh đạo của tôi:',
  'Đối tượng chịu tác động:',
  'Kết quả / chuyển biến đo được:',
  'Vướng mắc cần Giám đốc hỗ trợ:',
  'Sản phẩm quản trị để lại:',
];
const STAR_HINT = 'Viết theo khung STAR: Bối cảnh → Nhiệm vụ → Hành động lãnh đạo cá nhân → Kết quả. Mỗi cập nhật là một mốc trên dòng thời gian minh chứng cho dấu ấn cuối kỳ.';

const LOG_LABEL: Record<string, string> = {
  created: 'Tạo thẻ', status_change: 'Chuyển trạng thái', progress_update: 'Cập nhật tiến độ',
  completion_requested: 'Gửi hoàn thành', completion_confirmed: 'Lãnh đạo xác nhận',
  returned: 'Trả lại bổ sung', evidence_added: 'Bổ sung bằng chứng',
};
const KANBAN_LABEL: Record<string, string> = { todo: 'Chưa bắt đầu', doing: 'Đang làm', done: 'Hoàn thành' };

interface LogRow {
  card_id: string;
  log_type: string;
  new_status: string | null;
  progress_percent: number | null;
  progress_note: string | null;
  current_result: string | null;
  blocker_note: string | null;
  support_needed: string | null;
  evidence_text: string | null;
  evidence_url: string | null;
  created_at: string;
}

function logNote(l: LogRow): string {
  const parts: string[] = [];
  if (l.new_status) parts.push(KANBAN_LABEL[l.new_status] || l.new_status);
  if (l.progress_percent != null) parts.push(`${l.progress_percent}%`);
  if (l.progress_note) parts.push(l.progress_note);
  if (l.current_result) parts.push(`Kết quả: ${l.current_result}`);
  if (l.blocker_note) parts.push(`Vướng mắc: ${l.blocker_note}`);
  if (l.support_needed) parts.push(`Cần hỗ trợ: ${l.support_needed}`);
  if (l.evidence_text) parts.push(`Bằng chứng: ${l.evidence_text}`);
  return parts.join(' · ');
}

interface Option { id: string; code?: string | null; name: string }
interface MarkRow {
  id: string;
  profile_id: string;
  title: string;
  description: string | null;
  role_focus: string | null;
  status: string;
  deadline: string | null;
  sort_order: number;
  star_situation: string | null;
  star_task: string | null;
  star_action: string | null;
  star_result: string | null;
  deliverable: string | null;
  leadership_competency_id: string | null;
  core_value_id: string | null;
  profiles: { full_name: string } | null;
  leadership_competencies: { name: string } | null;
  core_values: { name: string } | null;
  leadership_mark_skills: { sort_order: number; skill_id: string; skill_catalog: { code: string | null; name: string } | null }[];
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp', active: 'Đang thực hiện', confirmed: 'Đã ghi nhận', archived: 'Đã lưu trữ',
};
const STATUS_TONE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  archived: 'bg-muted text-muted-foreground',
};

interface FrameForm {
  id: string | null;
  profile_id: string;
  title: string;
  description: string;
  role_focus: string;
  leadership_competency_id: string;
  core_value_id: string;
  skill1: string;
  skill2: string;
  deadline: string;
  status: string;
  sort_order: number;
}

const EMPTY_FRAME: FrameForm = {
  id: null, profile_id: '', title: '', description: '', role_focus: '',
  leadership_competency_id: '', core_value_id: '', skill1: '', skill2: '',
  deadline: '', status: 'active', sort_order: 1,
};

export default function LeadershipMarksPage() {
  const { profileId, isAdmin, roles, loading: authLoading } = useAuth();
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [cardByMark, setCardByMark] = useState<Record<string, KanbanCard>>({});
  const [weekly, setWeekly] = useState<WeeklyUpdateMap>({});
  const [logsByMark, setLogsByMark] = useState<Record<string, LogRow[]>>({});
  const [updateCard, setUpdateCard] = useState<KanbanCard | null>(null);
  const [openTimeline, setOpenTimeline] = useState<Record<string, boolean>>({});
  const [competencies, setCompetencies] = useState<Option[]>([]);
  const [coreValues, setCoreValues] = useState<Option[]>([]);
  const [skills, setSkills] = useState<Option[]>([]);
  const [pgdProfiles, setPgdProfiles] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  // Dialog khung (admin) & dialog STAR (chủ dấu ấn)
  const [frame, setFrame] = useState<FrameForm | null>(null);
  const [starMark, setStarMark] = useState<MarkRow | null>(null);
  const [starForm, setStarForm] = useState({ star_situation: '', star_task: '', star_action: '', star_result: '', deliverable: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [marksRes, compRes, cvRes] = await Promise.all([
      sb.from('leadership_marks')
        .select(`
          id, profile_id, title, description, role_focus, status, deadline, sort_order,
          star_situation, star_task, star_action, star_result, deliverable,
          leadership_competency_id, core_value_id,
          profiles ( full_name ),
          leadership_competencies ( name ),
          core_values ( name ),
          leadership_mark_skills ( sort_order, skill_id, skill_catalog ( code, name ) )
        `)
        .order('sort_order'),
      sb.from('leadership_competencies').select('id, code, name').eq('is_active', true).order('sort_order'),
      sb.from('core_values').select('id, code, name').order('sort_order'),
    ]);
    if (marksRes.error) {
      toast.error('Không tải được dấu ấn: ' + marksRes.error.message);
    } else {
      const markRows = (marksRes.data as MarkRow[]) || [];
      setMarks(markRows);
      // Thẻ Kanban của từng dấu ấn + trạng thái "đã cập nhật tuần này" + dòng thời gian
      const ids = markRows.map(m => m.id);
      if (ids.length) {
        const { data: cardRows } = await sb.from('kanban_cards')
          .select('*').in('leadership_mark_id', ids).eq('is_active', true);
        const byMark: Record<string, KanbanCard> = {};
        ((cardRows || []) as any[]).forEach(c => { if (c.leadership_mark_id) byMark[c.leadership_mark_id] = c; });
        setCardByMark(byMark);
        const cardList = Object.values(byMark);
        setWeekly(await fetchWeeklyUpdateMap(cardList));
        if (cardList.length) {
          const cardToMark: Record<string, string> = {};
          Object.entries(byMark).forEach(([mid, c]) => { cardToMark[c.id] = mid; });
          const { data: logRows } = await sb.from('kanban_card_logs')
            .select('card_id, log_type, new_status, progress_percent, progress_note, current_result, blocker_note, support_needed, evidence_text, evidence_url, created_at')
            .in('card_id', cardList.map(c => c.id))
            .order('created_at', { ascending: false });
          const lbm: Record<string, LogRow[]> = {};
          ((logRows || []) as LogRow[]).forEach(l => {
            const mid = cardToMark[l.card_id];
            if (!mid) return;
            (lbm[mid] = lbm[mid] || []).push(l);
          });
          setLogsByMark(lbm);
        }
      }
    }
    setCompetencies((compRes.data as Option[]) || []);
    setCoreValues((cvRes.data as Option[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  // Danh mục phục vụ form admin (chỉ tải khi cần)
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data: skillRows } = await sb.from('skill_catalog').select('id, code, name').order('code');
      setSkills((skillRows as Option[]) || []);
      const { data: roleRows } = await sb.from('user_roles').select('user_id').eq('role', 'pgd');
      const userIds = (roleRows || []).map((r: any) => r.user_id);
      if (userIds.length) {
        const { data: profRows } = await sb.from('profiles').select('id, full_name').in('user_id', userIds).order('full_name');
        setPgdProfiles(((profRows || []) as any[]).map(r => ({ id: r.id, name: r.full_name })));
      }
    })();
  }, [isAdmin]);

  const byProfile = useMemo(() => {
    const map = new Map<string, { name: string; roleFocus: string | null; marks: MarkRow[] }>();
    marks.filter(m => m.status !== 'archived').forEach(m => {
      const entry = map.get(m.profile_id) || { name: m.profiles?.full_name || '—', roleFocus: m.role_focus, marks: [] };
      entry.marks.push(m);
      if (!entry.roleFocus && m.role_focus) entry.roleFocus = m.role_focus;
      map.set(m.profile_id, entry);
    });
    return map;
  }, [marks]);

  const openFrameDialog = (m: MarkRow | null, presetProfile?: string) => {
    if (!m) {
      setFrame({ ...EMPTY_FRAME, profile_id: presetProfile || '', sort_order: 1 });
      return;
    }
    const sk = [...(m.leadership_mark_skills || [])].sort((a, b) => a.sort_order - b.sort_order);
    setFrame({
      id: m.id,
      profile_id: m.profile_id,
      title: m.title,
      description: m.description || '',
      role_focus: m.role_focus || '',
      leadership_competency_id: m.leadership_competency_id || '',
      core_value_id: m.core_value_id || '',
      skill1: sk[0]?.skill_id || '',
      skill2: sk[1]?.skill_id || '',
      deadline: m.deadline || '',
      status: m.status,
      sort_order: m.sort_order,
    });
  };

  const saveFrame = async () => {
    if (!frame) return;
    if (!frame.profile_id || !frame.title.trim()) {
      toast.error('Cần chọn PGĐ và nhập tên dấu ấn');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        profile_id: frame.profile_id,
        title: frame.title.trim(),
        description: frame.description.trim() || null,
        role_focus: frame.role_focus.trim() || null,
        leadership_competency_id: frame.leadership_competency_id || null,
        core_value_id: frame.core_value_id || null,
        deadline: frame.deadline || null,
        status: frame.status,
        sort_order: frame.sort_order,
      };
      let markId = frame.id;
      if (markId) {
        const { error } = await sb.from('leadership_marks').update(payload).eq('id', markId);
        if (error) throw error;
      } else {
        // Gắn kỳ hiện hành (in_progress mới nhất) cho dấu ấn mới
        const { data: cycles } = await sb.from('evaluation_cycles')
          .select('id, start_date').eq('status', 'in_progress').order('start_date', { ascending: false }).limit(1);
        const { data: inserted, error } = await sb.from('leadership_marks')
          .insert({ ...payload, cycle_id: cycles?.[0]?.id ?? null, created_by: profileId })
          .select('id').single();
        if (error) throw error;
        markId = inserted.id;
      }
      // Đồng bộ tối đa 2 skill (xóa rồi chèn lại — trigger tự cập nhật thẻ Kanban)
      const wanted = [frame.skill1, frame.skill2].filter(Boolean);
      await sb.from('leadership_mark_skills').delete().eq('mark_id', markId);
      for (let i = 0; i < wanted.length; i++) {
        const { error } = await sb.from('leadership_mark_skills')
          .insert({ mark_id: markId, skill_id: wanted[i], sort_order: i + 1 });
        if (error) throw error;
      }
      toast.success('Đã lưu dấu ấn — thẻ Kanban của PGĐ được cập nhật tự động');
      setFrame(null);
      load();
    } catch (e: any) {
      toast.error('Lỗi lưu dấu ấn: ' + (e.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  const archiveMark = async (m: MarkRow) => {
    if (!window.confirm(`Lưu trữ dấu ấn "${m.title}"? Thẻ Kanban tương ứng sẽ được ẩn.`)) return;
    const { error } = await sb.from('leadership_marks').update({ status: 'archived' }).eq('id', m.id);
    if (error) toast.error(error.message); else { toast.success('Đã lưu trữ'); load(); }
  };

  const confirmMark = async (m: MarkRow) => {
    const { error } = await sb.from('leadership_marks').update({ status: 'confirmed' }).eq('id', m.id);
    if (error) toast.error(error.message); else { toast.success('Đã ghi nhận dấu ấn'); load(); }
  };

  const openStarDialog = (m: MarkRow) => {
    setStarMark(m);
    setStarForm({
      star_situation: m.star_situation || '',
      star_task: m.star_task || '',
      star_action: m.star_action || '',
      star_result: m.star_result || '',
      deliverable: m.deliverable || '',
    });
  };

  const saveStar = async () => {
    if (!starMark) return;
    setSaving(true);
    const { error } = await sb.from('leadership_marks').update({
      star_situation: starForm.star_situation.trim() || null,
      star_task: starForm.star_task.trim() || null,
      star_action: starForm.star_action.trim() || null,
      star_result: starForm.star_result.trim() || null,
      deliverable: starForm.deliverable.trim() || null,
    }).eq('id', starMark.id);
    setSaving(false);
    if (error) { toast.error('Lỗi lưu STAR: ' + error.message); return; }
    toast.success('Đã lưu STAR & sản phẩm để lại');
    setStarMark(null);
    load();
  };

  const doExport = async (pid: string, name: string) => {
    setExporting(pid);
    try {
      await exportLeadershipJourney(pid, name);
      toast.success('Đã xuất hành trình dấu ấn');
    } catch (e: any) {
      toast.error(e.message || 'Không xuất được');
    } finally {
      setExporting(null);
    }
  };

  if (authLoading || loading) {
    return <div className="p-6 text-muted-foreground">Đang tải dấu ấn…</div>;
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" /> Dấu ấn Bắc Hưng Yên Mark
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Khung dấu ấn Ban Giám đốc giao — mỗi dấu ấn gắn 1 năng lực lãnh đạo, 1 giá trị cốt lõi
            và tối đa 2 Skill; tiến độ theo dõi trên thẻ <Link className="underline" to="/hanh-dong-phat-trien">Kanban</Link> của từng PGĐ.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium text-foreground">Nhịp vận hành:</span> cập nhật tiến độ tối thiểu
            <span className="font-medium"> 1 lần/tuần</span> (giống thẻ Kanban tự đánh giá) — tuần chưa cập nhật sẽ
            <span className="text-destructive font-medium"> báo đỏ</span>. Cập nhật viết theo khung STAR và
            tự xếp thành dòng thời gian của dấu ấn.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => openFrameDialog(null)}>
            <Plus className="w-4 h-4 mr-1" /> Thêm dấu ấn
          </Button>
        )}
      </div>

      {byProfile.size === 0 && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">
          Chưa có dấu ấn nào trong phạm vi bạn được xem.
        </CardContent></Card>
      )}

      {Array.from(byProfile.entries()).map(([pid, group]) => (
        <Card key={pid}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
              <span>
                {group.name}
                {group.roleFocus && (
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                    Trọng tâm vai trò: {group.roleFocus}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{group.marks.length} dấu ấn</Badge>
                <Button size="sm" variant="outline" disabled={exporting === pid}
                        onClick={() => doExport(pid, group.name)}>
                  <Download className="w-4 h-4 mr-1" />
                  {exporting === pid ? 'Đang xuất…' : 'Xuất hành trình'}
                </Button>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {group.marks.map(m => {
              const sk = [...(m.leadership_mark_skills || [])].sort((a, b) => a.sort_order - b.sort_order);
              const starDone = [m.star_situation, m.star_task, m.star_action, m.star_result].filter(Boolean).length;
              const isOwner = m.profile_id === profileId;
              const card = cardByMark[m.id];
              // Nhịp hằng tuần áp dụng khi dấu ấn đang chạy và thẻ chưa hoàn thành
              const needsWeekly = m.status === 'active' && !!card && card.kanban_status !== 'done';
              const updatedThisWeek = card ? !!weekly[card.id] : false;
              const weeklyRed = needsWeekly && !updatedThisWeek;
              const logs = logsByMark[m.id] || [];
              const canUpdate = !!card && m.status === 'active' && (isOwner || roles.includes('system_admin'));
              return (
                <div key={m.id}
                     className={`rounded-lg border p-3 space-y-2 ${weeklyRed ? 'border-destructive/60 bg-destructive/5' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium">{m.sort_order}. {m.title}</p>
                    <span className="flex items-center gap-1.5">
                      {needsWeekly && (updatedThisWeek ? (
                        <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0">
                          <CalendarCheck className="w-3 h-3 mr-1" /> Đã cập nhật tuần này
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Chưa cập nhật tuần này
                        </Badge>
                      ))}
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_TONE[m.status] || ''}`}>
                        {STATUS_LABEL[m.status] || m.status}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    {m.leadership_competencies?.name && (
                      <Badge variant="outline">{m.leadership_competencies.name}</Badge>
                    )}
                    {m.core_values?.name && (
                      <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-300">
                        {m.core_values.name}
                      </Badge>
                    )}
                    {sk.map(s => (
                      <Badge key={s.skill_id} variant="secondary">
                        {s.skill_catalog?.code ? `${s.skill_catalog.code} · ${s.skill_catalog.name}` : s.skill_catalog?.name}
                      </Badge>
                    ))}
                    {m.deadline && (
                      <Badge variant="outline">Hạn {new Date(m.deadline).toLocaleDateString('vi-VN')}</Badge>
                    )}
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{m.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant={starDone === 4 ? 'default' : 'secondary'} className="text-[10px]">
                      STAR {starDone}/4{m.deliverable ? ' · có sản phẩm để lại' : ''}
                    </Badge>
                    {card && (
                      <Badge variant="outline" className="text-[10px]">
                        {KANBAN_LABEL[card.kanban_status] || card.kanban_status} · {card.progress_percent}%
                      </Badge>
                    )}
                    {canUpdate && (
                      <Button size="sm" variant={weeklyRed ? 'destructive' : 'default'}
                              onClick={() => setUpdateCard(card)}>
                        <CalendarCheck className="w-3.5 h-3.5 mr-1" /> Cập nhật tuần
                      </Button>
                    )}
                    {(isOwner || isAdmin) && (
                      <Button size="sm" variant="outline" onClick={() => openStarDialog(m)}>
                        <Sparkles className="w-3.5 h-3.5 mr-1" /> Cập nhật STAR
                      </Button>
                    )}
                    {logs.length > 0 && (
                      <Button size="sm" variant="ghost"
                              onClick={() => setOpenTimeline(prev => ({ ...prev, [m.id]: !prev[m.id] }))}>
                        <History className="w-3.5 h-3.5 mr-1" /> Dòng thời gian ({logs.length})
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openFrameDialog(m)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Sửa khung
                        </Button>
                        {m.status === 'active' && (
                          <Button size="sm" variant="outline" className="text-emerald-700"
                                  onClick={() => confirmMark(m)}>
                            Ghi nhận
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-muted-foreground"
                                onClick={() => archiveMark(m)}>
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  {openTimeline[m.id] && logs.length > 0 && (
                    <div className="mt-2 border-l-2 border-muted pl-3 space-y-2">
                      {logs.map((l, i) => (
                        <div key={i} className="text-xs">
                          <p className="text-muted-foreground">
                            {new Date(l.created_at).toLocaleString('vi-VN')}
                            <span className="ml-1.5 font-medium text-foreground">{LOG_LABEL[l.log_type] || l.log_type}</span>
                          </p>
                          {logNote(l) && <p className="whitespace-pre-wrap">{logNote(l)}</p>}
                          {l.evidence_url && (
                            <a href={l.evidence_url} target="_blank" rel="noreferrer" className="underline text-primary">
                              Bằng chứng đính kèm
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {isAdmin && (
              <Button size="sm" variant="ghost" onClick={() => openFrameDialog(null, pid)}>
                <Plus className="w-4 h-4 mr-1" /> Thêm dấu ấn cho {group.name}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}

      {/* ── Dialog cập nhật tuần (tái dùng cơ chế Kanban, gợi ý STAR) ───── */}
      {updateCard && (
        <UpdateProgressDialog
          card={updateCard}
          open={!!updateCard}
          onClose={() => setUpdateCard(null)}
          onSaved={load}
          dialogTitle="Cập nhật tuần — Dấu ấn"
          hint={STAR_HINT}
          suggestions={STAR_SUGGESTIONS}
        />
      )}

      {/* ── Dialog khung dấu ấn (admin) ─────────────────────────────────── */}
      <Dialog open={!!frame} onOpenChange={(o) => !o && setFrame(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{frame?.id ? 'Sửa khung dấu ấn' : 'Thêm dấu ấn'}</DialogTitle>
          </DialogHeader>
          {frame && (
            <div className="space-y-3">
              <div>
                <Label>Phó Giám đốc</Label>
                <Select value={frame.profile_id} onValueChange={v => setFrame({ ...frame, profile_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Chọn PGĐ" /></SelectTrigger>
                  <SelectContent>
                    {pgdProfiles.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tên dấu ấn</Label>
                <Input value={frame.title} onChange={e => setFrame({ ...frame, title: e.target.value })} />
              </div>
              <div>
                <Label>Yêu cầu / mô tả</Label>
                <Textarea rows={3} value={frame.description}
                          onChange={e => setFrame({ ...frame, description: e.target.value })} />
              </div>
              <div>
                <Label>Trọng tâm vai trò (chung của PGĐ)</Label>
                <Input value={frame.role_focus} onChange={e => setFrame({ ...frame, role_focus: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Năng lực lãnh đạo</Label>
                  <Select value={frame.leadership_competency_id}
                          onValueChange={v => setFrame({ ...frame, leadership_competency_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      {competencies.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Giá trị cốt lõi bổ trợ</Label>
                  <Select value={frame.core_value_id}
                          onValueChange={v => setFrame({ ...frame, core_value_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Chọn" /></SelectTrigger>
                    <SelectContent>
                      {coreValues.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Skill 1</Label>
                  <Select value={frame.skill1} onValueChange={v => setFrame({ ...frame, skill1: v })}>
                    <SelectTrigger><SelectValue placeholder="Chọn skill" /></SelectTrigger>
                    <SelectContent>
                      {skills.map(o => <SelectItem key={o.id} value={o.id}>{o.code} · {o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Skill 2 (tùy chọn)</Label>
                  <Select value={frame.skill2} onValueChange={v => setFrame({ ...frame, skill2: v })}>
                    <SelectTrigger><SelectValue placeholder="Chọn skill" /></SelectTrigger>
                    <SelectContent>
                      {skills.filter(o => o.id !== frame.skill1)
                        .map(o => <SelectItem key={o.id} value={o.id}>{o.code} · {o.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Hạn hoàn thành</Label>
                  <Input type="date" value={frame.deadline}
                         onChange={e => setFrame({ ...frame, deadline: e.target.value })} />
                </div>
                <div>
                  <Label>Thứ tự</Label>
                  <Input type="number" min={1} value={frame.sort_order}
                         onChange={e => setFrame({ ...frame, sort_order: Number(e.target.value) || 1 })} />
                </div>
                <div>
                  <Label>Trạng thái</Label>
                  <Select value={frame.status} onValueChange={v => setFrame({ ...frame, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Nháp</SelectItem>
                      <SelectItem value="active">Đang thực hiện</SelectItem>
                      <SelectItem value="confirmed">Đã ghi nhận</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFrame(null)}>Hủy</Button>
            <Button onClick={saveFrame} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu dấu ấn'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog STAR (PGĐ chủ dấu ấn / admin) ────────────────────────── */}
      <Dialog open={!!starMark} onOpenChange={(o) => !o && setStarMark(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>STAR — {starMark?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Chuẩn đầu ra cuối kỳ: chỉ rõ hành động lãnh đạo cá nhân, đối tượng chịu tác động và
            mối liên hệ hành động → kết quả; kèm sản phẩm quản trị để lại.
          </p>
          <div className="space-y-3">
            <div>
              <Label>Bối cảnh (Situation)</Label>
              <Textarea rows={2} value={starForm.star_situation}
                        onChange={e => setStarForm({ ...starForm, star_situation: e.target.value })} />
            </div>
            <div>
              <Label>Nhiệm vụ (Task)</Label>
              <Textarea rows={2} value={starForm.star_task}
                        onChange={e => setStarForm({ ...starForm, star_task: e.target.value })} />
            </div>
            <div>
              <Label>Hành động lãnh đạo của cá nhân (Action)</Label>
              <Textarea rows={3} value={starForm.star_action}
                        onChange={e => setStarForm({ ...starForm, star_action: e.target.value })} />
            </div>
            <div>
              <Label>Kết quả (Result)</Label>
              <Textarea rows={3} value={starForm.star_result}
                        onChange={e => setStarForm({ ...starForm, star_result: e.target.value })} />
            </div>
            <div>
              <Label>Sản phẩm quản trị để lại (công cụ, phương thức, dashboard, quy trình…)</Label>
              <Textarea rows={2} value={starForm.deliverable}
                        onChange={e => setStarForm({ ...starForm, deliverable: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStarMark(null)}>Hủy</Button>
            <Button onClick={saveStar} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu STAR'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
