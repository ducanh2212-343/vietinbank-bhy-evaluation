// Trang "Dấu ấn Bắc Hưng Yên Mark" (/dau-an)
// - GĐ/TCTH admin: nhập & chỉnh khung dấu ấn cho từng PGĐ (tiêu đề, năng lực lãnh đạo,
//   giá trị cốt lõi, tối đa 2 Skill, hạn, trạng thái) → thẻ Kanban tự sinh cho PGĐ.
// - PGĐ: xem dấu ấn của mình, cập nhật STAR + sản phẩm quản trị để lại
//   (tiến độ hằng tuần cập nhật trên thẻ Kanban như mọi thẻ khác).
// - Kết kỳ: GĐ bấm «Chốt dấu ấn» → dấu ấn chờ PGĐ nộp STAR ĐẦY ĐỦ (bắt buộc,
//   mỗi phần tối thiểu 50 ký tự) → đã chốt thì ẩn khỏi kỳ hiện hành, nhường chỗ
//   cho kỳ mới (dự kiến hạn 31/10/2026).
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
import { Award, Download, Pencil, Plus, Sparkles, Archive, CalendarCheck, AlertTriangle, History, Lock, Undo2, ChevronDown, ChevronRight } from 'lucide-react';
// exportLeadershipJourney nạp lúc bấm nút — nó kéo theo docx + file-saver
// (~106 kB gzip), không đáng tải chỉ để mở trang xem danh sách dấu ấn.
import { fetchWeeklyUpdateMap, isWeeklyTracked, type KanbanCard, type WeeklyUpdateMap } from '@/lib/kanban';
import { UpdateProgressDialog } from '@/components/kanban/UpdateProgressDialog';
import { Ct2DongThoiGian } from '@/components/one/move2/Ct2DongThoiGian';
import { tachBangChung } from '@/lib/safeUrl';
import { dongTuBangChungDauAn, type BangChungDauAn } from '@/lib/ct2';
import { dauTuanVn } from '@/components/one/move2/useCt2Bgd';

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
/**
 * Mỗi phần STAR phải có ít nhất chừng này ký tự mới được nộp để chốt — trùng với
 * hàm dau_an_star_du_de_chot ở migration 20261031090000 (máy chủ chặn lần cuối).
 * Trước đây STAR là tùy chọn nên cuối kỳ nhiều dấu ấn kết thúc với STAR trống.
 */
const SO_KY_TU_TOI_THIEU_STAR = 50;
/** Kỳ dấu ấn kế tiếp dự kiến kết thúc 31/10/2026 — hạn mặc định khi thêm dấu ấn mới */
const HAN_KY_MOI = '2026-10-31';
const STAR_HINT = 'Viết theo khung STAR: Bối cảnh → Nhiệm vụ → Hành động lãnh đạo cá nhân → Kết quả. Mỗi cập nhật là một mốc trên dòng thời gian minh chứng cho dấu ấn cuối kỳ.';

const LOG_LABEL: Record<string, string> = {
  created: 'Tạo thẻ', status_change: 'Chuyển trạng thái', progress_update: 'Cập nhật tiến độ',
  completion_requested: 'Gửi hoàn thành', manager_confirmed: 'Lãnh đạo xác nhận',
  manager_returned: 'Trả lại bổ sung', evidence_added: 'Bổ sung bằng chứng',
};
const KANBAN_LABEL: Record<string, string> = { todo: 'Chưa bắt đầu', doing: 'Đang làm', done: 'Hoàn thành' };

interface LogRow {
  id: string;
  card_id: string;
  /** Người thao tác — để dòng thời gian ghi đúng ai làm, không phải «Hệ thống» */
  created_by: string | null;
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
  /** Lúc GĐ bấm «Chốt dấu ấn» — có giá trị là PGĐ phải nộp STAR đầy đủ */
  chot_yeu_cau_luc: string | null;
  /** Lúc PGĐ nộp STAR đủ, dấu ấn rời kỳ hiện hành */
  chot_luc: string | null;
  leadership_competency_id: string | null;
  core_value_id: string | null;
  profiles: { full_name: string } | null;
  leadership_competencies: { name: string } | null;
  core_values: { name: string } | null;
  leadership_mark_skills: { sort_order: number; skill_id: string; skill_catalog: { code: string | null; name: string } | null }[];
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Nháp', active: 'Đang thực hiện', confirmed: 'Đã ghi nhận', archived: 'Đã lưu trữ',
  cho_chot: 'GĐ đã chốt — chờ nộp STAR', da_chot: 'Đã chốt',
};
const STATUS_TONE: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  confirmed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  archived: 'bg-muted text-muted-foreground',
  cho_chot: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  da_chot: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

type StarForm = { star_situation: string; star_task: string; star_action: string; star_result: string; deliverable: string };
const STAR_NHAN: Array<{ khoa: keyof StarForm; nhan: string; dong: number }> = [
  { khoa: 'star_situation', nhan: 'Bối cảnh (Situation)', dong: 2 },
  { khoa: 'star_task', nhan: 'Nhiệm vụ (Task)', dong: 2 },
  { khoa: 'star_action', nhan: 'Hành động lãnh đạo của cá nhân (Action)', dong: 3 },
  { khoa: 'star_result', nhan: 'Kết quả (Result)', dong: 3 },
  { khoa: 'deliverable', nhan: 'Sản phẩm quản trị để lại (công cụ, phương thức, dashboard, quy trình…)', dong: 2 },
];
/** Những phần STAR còn thiếu hoặc quá ngắn để chốt */
function phanStarThieu(f: StarForm): string[] {
  return STAR_NHAN.filter(({ khoa }) => f[khoa].trim().length < SO_KY_TU_TOI_THIEU_STAR).map(({ nhan }) => nhan);
}
function ngayVn(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString('vi-VN') : '';
}

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
  deadline: HAN_KY_MOI, status: 'active', sort_order: 1,
};

export default function LeadershipMarksPage() {
  const { profileId, isAdmin, roles, loading: authLoading } = useAuth();
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [cardByMark, setCardByMark] = useState<Record<string, KanbanCard>>({});
  const [weekly, setWeekly] = useState<WeeklyUpdateMap>({});
  const [logsByMark, setLogsByMark] = useState<Record<string, LogRow[]>>({});
  // Cửa ghi nhịp MỚI của dấu ấn (màn Điều hành BGĐ) đổ vào bảng riêng — phải
  // đọc cùng nhật ký thẻ, nếu không mạch mất hẳn phần ghi theo cách mới.
  const [bangChungByMark, setBangChungByMark] = useState<Record<string, BangChungDauAn[]>>({});
  const [updateCard, setUpdateCard] = useState<KanbanCard | null>(null);
  const [openTimeline, setOpenTimeline] = useState<Record<string, boolean>>({});
  // Tra tên cho dòng thời gian trộn: người ghi log, người trao đổi — bất kỳ ai
  const [tenNguoi, setTenNguoi] = useState<Map<string, string>>(new Map());
  const [competencies, setCompetencies] = useState<Option[]>([]);
  const [coreValues, setCoreValues] = useState<Option[]>([]);
  const [skills, setSkills] = useState<Option[]>([]);
  const [pgdProfiles, setPgdProfiles] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  // Dialog khung (admin) & dialog STAR (chủ dấu ấn)
  const [frame, setFrame] = useState<FrameForm | null>(null);
  const [starMark, setStarMark] = useState<MarkRow | null>(null);
  const [starForm, setStarForm] = useState<StarForm>({ star_situation: '', star_task: '', star_action: '', star_result: '', deliverable: '' });
  const [saving, setSaving] = useState(false);
  // Dấu ấn đã chốt gập lại — kỳ mới cần màn hình sạch, nhưng vẫn phải mở ra xem được
  const [moDaChot, setMoDaChot] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [marksRes, compRes, cvRes, profRes] = await Promise.all([
      sb.from('leadership_marks')
        .select(`
          id, profile_id, title, description, role_focus, status, deadline, sort_order,
          star_situation, star_task, star_action, star_result, deliverable,
          chot_yeu_cau_luc, chot_luc,
          leadership_competency_id, core_value_id,
          profiles ( full_name ),
          leadership_competencies ( name ),
          core_values ( name ),
          leadership_mark_skills ( sort_order, skill_id, skill_catalog ( code, name ) )
        `)
        .order('sort_order'),
      sb.from('leadership_competencies').select('id, code, name').eq('is_active', true).order('sort_order'),
      sb.from('core_values').select('id, code, name').order('sort_order'),
      sb.from('profiles').select('id, full_name'),
    ]);
    setTenNguoi(new Map((((profRes.data ?? []) as Array<{ id: string; full_name: string }>)
      .map((p) => [p.id, p.full_name]))));
    if (marksRes.error) {
      toast.error('Không tải được dấu ấn: ' + marksRes.error.message);
    } else {
      const markRows = (marksRes.data as MarkRow[]) || [];
      setMarks(markRows);
      // Thẻ Kanban của từng dấu ấn + trạng thái "đã cập nhật tuần này" + dòng thời gian
      const ids = markRows.map(m => m.id);
      // Luôn ghi đè state phụ thuộc để không giữ dữ liệu cũ khi danh sách rỗng lại
      const byMark: Record<string, KanbanCard> = {};
      const lbm: Record<string, LogRow[]> = {};
      const bcm: Record<string, BangChungDauAn[]> = {};
      let weeklyMap: WeeklyUpdateMap = {};
      if (ids.length) {
        // Tải THẲNG theo mark_id, không phụ thuộc thẻ Kanban: dấu ấn có thể có
        // bằng chứng tuần mà chưa từng có thẻ.
        const { data: bcRows } = await sb.from('ct2_bang_chung_dau_an')
          .select('id, mark_id, tuan, phan_star, noi_dung, nguoi_ghi, ghi_luc')
          .in('mark_id', ids)
          .order('ghi_luc', { ascending: false });
        ((bcRows || []) as Array<BangChungDauAn & { mark_id: string }>).forEach((b) => {
          (bcm[b.mark_id] = bcm[b.mark_id] || []).push(b);
        });
        const { data: cardRows } = await sb.from('kanban_cards')
          .select('*').in('leadership_mark_id', ids).eq('is_active', true);
        ((cardRows || []) as any[]).forEach(c => { if (c.leadership_mark_id) byMark[c.leadership_mark_id] = c; });
        const cardList = Object.values(byMark);
        weeklyMap = await fetchWeeklyUpdateMap(cardList);
        if (cardList.length) {
          const cardToMark: Record<string, string> = {};
          Object.entries(byMark).forEach(([mid, c]) => { cardToMark[c.id] = mid; });
          const { data: logRows } = await sb.from('kanban_card_logs')
            .select('id, card_id, created_by, log_type, new_status, progress_percent, progress_note, current_result, blocker_note, support_needed, evidence_text, evidence_url, created_at')
            .in('card_id', cardList.map(c => c.id))
            .order('created_at', { ascending: false });
          ((logRows || []) as LogRow[]).forEach(l => {
            const mid = cardToMark[l.card_id];
            if (!mid) return;
            (lbm[mid] = lbm[mid] || []).push(l);
          });
        }
      }
      setCardByMark(byMark);
      setWeekly(weeklyMap);
      setLogsByMark(lbm);
      setBangChungByMark(bcm);
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

  // Mốc thứ Hai của tuần này — lấy từ nguồn dùng chung với màn Điều hành BGĐ
  // để hai nơi không bao giờ hiểu «tuần này» lệch nhau một ngày.
  const tuanNay = dauTuanVn();

  const byProfile = useMemo(() => {
    const map = new Map<string, { name: string; roleFocus: string | null; marks: MarkRow[] }>();
    // Đã chốt thì rời kỳ hiện hành (xem ở mục gập «Đã chốt» phía dưới)
    marks.filter(m => m.status !== 'archived' && m.status !== 'da_chot').forEach(m => {
      const entry = map.get(m.profile_id) || { name: m.profiles?.full_name || '—', roleFocus: m.role_focus, marks: [] };
      entry.marks.push(m);
      if (!entry.roleFocus && m.role_focus) entry.roleFocus = m.role_focus;
      map.set(m.profile_id, entry);
    });
    return map;
  }, [marks]);

  const daChot = useMemo(() => {
    const map = new Map<string, { name: string; marks: MarkRow[] }>();
    marks.filter(m => m.status === 'da_chot').forEach(m => {
      const entry = map.get(m.profile_id) || { name: m.profiles?.full_name || '—', marks: [] };
      entry.marks.push(m);
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

  // GĐ chốt: một dấu ấn hoặc cả kỳ của một PGĐ. Chỉ chuyển trạng thái — mốc giờ,
  // người chốt do máy chủ tự ghi (trigger kiem_tra_chot_dau_an).
  const chotDauAn = async (list: MarkRow[], tenPgd?: string) => {
    const canChot = list.filter(m => m.status === 'active' || m.status === 'confirmed');
    if (!canChot.length) return;
    const hoi = tenPgd
      ? `Chốt ${canChot.length} dấu ấn của ${tenPgd}? PGĐ sẽ phải nộp khung STAR đầy đủ cho từng dấu ấn; nộp xong dấu ấn ẩn khỏi kỳ này.`
      : `Chốt dấu ấn "${canChot[0].title}"? PGĐ sẽ phải nộp khung STAR đầy đủ; nộp xong dấu ấn ẩn khỏi kỳ này.`;
    if (!window.confirm(hoi)) return;
    const { error } = await sb.from('leadership_marks').update({ status: 'cho_chot' }).in('id', canChot.map(m => m.id));
    if (error) { toast.error('Không chốt được: ' + error.message); return; }
    toast.success(`Đã chốt ${canChot.length} dấu ấn — chờ PGĐ nộp STAR`);
    load();
  };

  const rutLenhChot = async (m: MarkRow) => {
    if (!window.confirm(`Rút lệnh chốt dấu ấn "${m.title}" để PGĐ tiếp tục cập nhật tuần?`)) return;
    const { error } = await sb.from('leadership_marks').update({ status: 'active' }).eq('id', m.id);
    if (error) toast.error(error.message); else { toast.success('Đã mở lại dấu ấn'); load(); }
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

  /**
   * Lưu STAR. `nopDeChot` = PGĐ nộp để kết thúc dấu ấn đã bị GĐ chốt: bắt đủ
   * năm phần, mỗi phần ≥ 50 ký tự, rồi chuyển da_chot trong cùng một lệnh để
   * không có khoảnh khắc "đã chốt mà STAR trống". Lưu thường vẫn cho dở dang.
   */
  const saveStar = async (nopDeChot = false) => {
    if (!starMark) return;
    if (nopDeChot) {
      const thieu = phanStarThieu(starForm);
      if (thieu.length) {
        toast.error(`Chưa đủ để chốt — cần viết đủ (≥ ${SO_KY_TU_TOI_THIEU_STAR} ký tự) các phần: ${thieu.join('; ')}`);
        return;
      }
    }
    setSaving(true);
    const { error } = await sb.from('leadership_marks').update({
      star_situation: starForm.star_situation.trim() || null,
      star_task: starForm.star_task.trim() || null,
      star_action: starForm.star_action.trim() || null,
      star_result: starForm.star_result.trim() || null,
      deliverable: starForm.deliverable.trim() || null,
      ...(nopDeChot ? { status: 'da_chot' } : {}),
    }).eq('id', starMark.id);
    setSaving(false);
    if (error) { toast.error('Lỗi lưu STAR: ' + error.message); return; }
    toast.success(nopDeChot ? 'Đã nộp STAR — dấu ấn đã chốt và rời kỳ hiện hành' : 'Đã lưu STAR & sản phẩm để lại');
    setStarMark(null);
    load();
  };

  const doExport = async (pid: string, name: string) => {
    setExporting(pid);
    try {
      const { exportLeadershipJourney } = await import('@/lib/exportLeadershipJourney');
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
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium text-foreground">Kết kỳ:</span> Giám đốc bấm
            <span className="font-medium"> Chốt dấu ấn</span> → PGĐ phải nộp khung STAR đầy đủ
            (Bối cảnh, Nhiệm vụ, Hành động, Kết quả, Sản phẩm để lại) → dấu ấn ẩn khỏi kỳ này,
            sang kỳ mới (dự kiến hạn {ngayVn(HAN_KY_MOI)}).
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
                {isAdmin && group.marks.some(m => m.status === 'active' || m.status === 'confirmed') && (
                  <Button size="sm" variant="secondary" onClick={() => chotDauAn(group.marks, group.name)}>
                    <Lock className="w-4 h-4 mr-1" /> Chốt cả kỳ
                  </Button>
                )}
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
              // Nhịp hằng tuần: cùng quy tắc isWeeklyTracked với bảng Kanban cá nhân
              // Đã chốt thì không còn nhịp tuần — việc còn lại là nộp STAR
              const choChot = m.status === 'cho_chot';
              const needsWeekly = !!card && !choChot && isWeeklyTracked(card);
              // Tuần này coi là ĐÃ cập nhật nếu ghi bằng BẤT KỲ cửa nào: nhịp thẻ
              // Kanban (cách cũ) hoặc bằng chứng tuần ở màn Điều hành BGĐ (cách
              // mới). Trước 26/08 chỉ đếm cách cũ, nên PGĐ chuyển sang cách mới
              // bị báo đỏ «Chưa cập nhật tuần này» suốt ba tuần dù tuần nào cũng ghi.
              const daGhiBangChungTuanNay = (bangChungByMark[m.id] || []).some((b) => b.tuan === tuanNay);
              const updatedThisWeek = (card ? !!weekly[card.id] : false) || daGhiBangChungTuanNay;
              const weeklyRed = needsWeekly && !updatedThisWeek;
              const logs = logsByMark[m.id] || [];
              const bangChungTuan = bangChungByMark[m.id] || [];
              const soDongMach = logs.length + bangChungTuan.length;
              const canUpdate = !!card && m.status === 'active' && (isOwner || roles.includes('system_admin'));
              return (
                <div key={m.id}
                     className={`rounded-lg border p-3 space-y-2 ${weeklyRed ? 'border-destructive/60 bg-destructive/5' : choChot ? 'border-amber-400/70 bg-amber-50/60 dark:bg-amber-950/20' : ''}`}>
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
                      <Badge variant="outline" className="border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300">
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
                  {choChot && (
                    <div className="rounded-md border border-amber-300 dark:border-amber-500/40 bg-amber-100/60 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                      <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>
                        Giám đốc đã chốt dấu ấn này{m.chot_yeu_cau_luc ? ` ngày ${ngayVn(m.chot_yeu_cau_luc)}` : ''}.
                        {isOwner
                          ? ` Bạn cần nộp khung STAR đầy đủ (mỗi phần tối thiểu ${SO_KY_TU_TOI_THIEU_STAR} ký tự, viết càng đầy đủ càng tốt) — nộp xong dấu ấn sẽ ẩn khỏi kỳ này.`
                          : ' Đang chờ PGĐ nộp khung STAR đầy đủ.'}
                        {' '}STAR hiện có: {starDone}/4{m.deliverable ? ' + sản phẩm để lại' : ''}.
                      </span>
                    </div>
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
                      <Button size="sm" variant={choChot ? 'default' : 'outline'}
                              className={choChot ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                              onClick={() => openStarDialog(m)}>
                        <Sparkles className="w-3.5 h-3.5 mr-1" /> {choChot ? 'Nộp STAR để chốt' : 'Cập nhật STAR'}
                      </Button>
                    )}
                    {/* Luôn hiện — thẻ chưa có log vẫn phải mở được để TRAO ĐỔI */}
                    <Button size="sm" variant="ghost"
                            onClick={() => setOpenTimeline(prev => ({ ...prev, [m.id]: !prev[m.id] }))}>
                      <History className="w-3.5 h-3.5 mr-1" />
                      Dòng thời gian & trao đổi{soDongMach > 0 ? ` (${soDongMach})` : ''}
                    </Button>
                    {isAdmin && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => openFrameDialog(m)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Sửa khung
                        </Button>
                        {m.status === 'active' && (
                          <Button size="sm" variant="outline" className="text-emerald-700 dark:text-emerald-300"
                                  onClick={() => confirmMark(m)}>
                            Ghi nhận
                          </Button>
                        )}
                        {(m.status === 'active' || m.status === 'confirmed') && (
                          <Button size="sm" variant="secondary" onClick={() => chotDauAn([m])}>
                            <Lock className="w-3.5 h-3.5 mr-1" /> Chốt dấu ấn
                          </Button>
                        )}
                        {choChot && (
                          <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => rutLenhChot(m)}>
                            <Undo2 className="w-3.5 h-3.5 mr-1" /> Rút lệnh chốt
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-muted-foreground"
                                onClick={() => archiveMark(m)}>
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                  {/*
                    Dòng thời gian TRỘN của Kanban dùng nguyên xi cho dấu ấn
                    (GĐ yêu cầu 06/08 — «tương tự Kanban»): log máy thành dòng
                    Báo cáo, cộng cửa Trao đổi có nhắc đích danh, «Cần trả lời»,
                    thu hồi. Không dựng mạch riêng cho Mark — bốn mạch là bốn
                    chỗ sửa luật mỗi lần đổi, ba tháng sau chúng lệch nhau.
                    Trao đổi báo đủ tuyến của CHỦ DẤU ẤN qua trigger dùng chung.
                  */}
                  {openTimeline[m.id] && (
                    <div className="mt-2">
                      <Ct2DongThoiGian
                        phamVi="DAU_AN"
                        doiTuongId={m.id}
                        baoCao={[...logs.map((l) => {
                          // Cùng luật với bàn Kanban: ô bằng chứng do cán bộ tự gõ,
                          // chỉ giá trị qua được bộ lọc mới thành liên kết bấm được.
                          const bangChung = tachBangChung(l.evidence_url);
                          return {
                            id: l.id,
                            luc: l.created_at,
                            nguoi: l.created_by,
                            tieu_de: LOG_LABEL[l.log_type] || l.log_type,
                            phan_tram: l.progress_percent,
                            noi_dung: [
                              l.new_status ? (KANBAN_LABEL[l.new_status] || l.new_status) : null,
                              l.progress_note,
                            ].filter(Boolean).join(' · ') || null,
                            chi_tiet: [
                              ...(l.current_result ? [{ nhan: 'Kết quả', gia: l.current_result, mau: 'XANH' as const }] : []),
                              ...(l.blocker_note ? [{ nhan: 'Vướng mắc', gia: l.blocker_note, mau: 'DO' as const }] : []),
                              ...(l.support_needed ? [{ nhan: 'Cần hỗ trợ', gia: l.support_needed, mau: 'DO' as const }] : []),
                              ...(l.evidence_text ? [{ nhan: 'Bằng chứng', gia: l.evidence_text }] : []),
                              ...(bangChung.chuThuong ? [{ nhan: 'Đính kèm', gia: bangChung.chuThuong }] : []),
                            ],
                            url: bangChung.lienKet,
                          };
                        }), ...dongTuBangChungDauAn(bangChungTuan)]}
                        nguoiLienQuan={[{ id: m.profile_id, ten: m.profiles?.full_name ?? '—', vaiTro: 'chủ dấu ấn' }]}
                        tenNguoi={tenNguoi}
                        loiMoiDau="Chưa có dòng nào — cập nhật tuần và trao đổi sẽ hiện ở đây."
                        goiY="Trao đổi về dấu ấn này…"
                        onXong={load}
                      />
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

      {/* ── Dấu ấn đã chốt: rời kỳ hiện hành, gập lại nhưng vẫn tra cứu được ── */}
      {daChot.size > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <button type="button" className="flex items-center gap-2 text-sm font-medium text-left"
                    onClick={() => setMoDaChot(v => !v)}>
              {moDaChot ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Lock className="w-4 h-4 text-emerald-600" />
              Dấu ấn đã chốt ({Array.from(daChot.values()).reduce((n, g) => n + g.marks.length, 0)}) — kỳ trước
            </button>
          </CardHeader>
          {moDaChot && (
            <CardContent className="space-y-4">
              {Array.from(daChot.entries()).map(([pid, group]) => (
                <div key={pid} className="space-y-2">
                  <p className="text-sm font-medium">{group.name}</p>
                  {group.marks.map(m => (
                    <div key={m.id} className="rounded-lg border p-3 space-y-1.5 bg-muted/30">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium">{m.sort_order}. {m.title}</p>
                        <span className="text-[11px] text-muted-foreground">
                          Chốt {ngayVn(m.chot_luc)}{m.deadline ? ` · hạn ${ngayVn(m.deadline)}` : ''}
                        </span>
                      </div>
                      <dl className="grid gap-1 text-xs">
                        {STAR_NHAN.map(({ khoa, nhan }) => m[khoa] ? (
                          <div key={khoa}>
                            <dt className="font-medium text-muted-foreground">{nhan}</dt>
                            <dd className="whitespace-pre-wrap">{m[khoa]}</dd>
                          </div>
                        ) : null)}
                      </dl>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" className="text-muted-foreground h-7 px-2"
                                onClick={() => rutLenhChot(m)}>
                          <Undo2 className="w-3.5 h-3.5 mr-1" /> Mở lại dấu ấn
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

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
            <DialogTitle>
              {starMark?.status === 'cho_chot' ? 'Nộp STAR để chốt — ' : 'STAR — '}{starMark?.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Chuẩn đầu ra cuối kỳ: chỉ rõ hành động lãnh đạo cá nhân, đối tượng chịu tác động và
            mối liên hệ hành động → kết quả; kèm sản phẩm quản trị để lại.
          </p>
          {starMark?.status === 'cho_chot' && (
            <p className="text-xs rounded-md border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-amber-900 dark:text-amber-200">
              Giám đốc đã chốt dấu ấn này. Cả năm phần dưới đây là <span className="font-medium">bắt buộc</span>,
              mỗi phần tối thiểu {SO_KY_TU_TOI_THIEU_STAR} ký tự — hãy viết đầy đủ nhất có thể, đây là bản
              ghi cuối cùng của dấu ấn. Có thể «Lưu nháp» rồi quay lại; bấm «Nộp & chốt» khi đã hoàn chỉnh.
            </p>
          )}
          <div className="space-y-3">
            {STAR_NHAN.map(({ khoa, nhan, dong }) => {
              const soKyTu = starForm[khoa].trim().length;
              const thieu = starMark?.status === 'cho_chot' && soKyTu < SO_KY_TU_TOI_THIEU_STAR;
              return (
                <div key={khoa}>
                  <div className="flex items-baseline justify-between gap-2">
                    <Label>{nhan}{starMark?.status === 'cho_chot' && <span className="text-destructive"> *</span>}</Label>
                    <span className={`text-[10px] ${thieu ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {soKyTu}{starMark?.status === 'cho_chot' ? ` / tối thiểu ${SO_KY_TU_TOI_THIEU_STAR}` : ''} ký tự
                    </span>
                  </div>
                  <Textarea rows={dong} value={starForm[khoa]}
                            className={thieu ? 'border-destructive/60' : ''}
                            onChange={e => setStarForm({ ...starForm, [khoa]: e.target.value })} />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStarMark(null)}>Hủy</Button>
            {starMark?.status === 'cho_chot' ? (
              <>
                <Button variant="secondary" onClick={() => saveStar(false)} disabled={saving}>
                  {saving ? 'Đang lưu…' : 'Lưu nháp'}
                </Button>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => saveStar(true)}
                        disabled={saving || phanStarThieu(starForm).length > 0}>
                  <Lock className="w-3.5 h-3.5 mr-1" /> {saving ? 'Đang nộp…' : 'Nộp & chốt dấu ấn'}
                </Button>
              </>
            ) : (
              <Button onClick={() => saveStar(false)} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu STAR'}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
