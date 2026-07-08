import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BellRing, Loader2, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MEMBER_GROUP_LABELS, type CouncilMemberGroup } from '@/lib/council';
import { isSessionExpiredError, SESSION_EXPIRED_MESSAGE } from '@/lib/invokeError';

interface Props {
  roundId: string;
  roundName: string;
  roundOpen: boolean;
  votingDeadline: string | null;
}

interface MemberRow { id: string; profile_id: string; member_group: CouncilMemberGroup; full_name: string; email: string | null; }
interface SubjectRow { id: string; full_name: string; profile_id: string | null; }
interface EvalRow { id: string; subject_id: string; evaluator_id: string; status: string; }

// Bảng theo dõi tiến độ bỏ phiếu — chỉ hiển thị AI đã gửi phiếu (phục vụ đôn đốc),
// KHÔNG hiển thị điểm số để giữ nguyên tính ẩn danh của kết quả chấm.
export function CouncilProgressTab({ roundId, roundName, roundOpen, votingDeadline }: Props) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [evals, setEvals] = useState<EvalRow[]>([]);
  const [remindingIds, setRemindingIds] = useState<Set<string>>(new Set());
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());
  const [remindingAll, setRemindingAll] = useState(false);

  const load = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    const [membersRes, subjectsRes, evalsRes] = await Promise.all([
      supabase.from('council_members').select('id, profile_id, member_group, is_active, profiles(full_name, email)').eq('is_active', true),
      supabase.from('council_subjects').select('id, full_name, profile_id').eq('round_id', roundId).eq('is_active', true).order('sort_order'),
      supabase.from('council_evaluations').select('id, subject_id, evaluator_id, status').eq('round_id', roundId),
    ]);
    const err = membersRes.error || subjectsRes.error || evalsRes.error;
    if (err) { toast.error('Lỗi tải tiến độ: ' + err.message); setLoading(false); return; }
    setMembers((membersRes.data || []).map((m) => {
      const p = m.profiles as unknown as { full_name: string; email: string | null } | null;
      return {
        id: m.id, profile_id: m.profile_id, member_group: m.member_group as CouncilMemberGroup,
        full_name: p?.full_name || '?', email: p?.email || null,
      };
    }));
    setSubjects((subjectsRes.data || []) as SubjectRow[]);
    setEvals((evalsRes.data || []) as EvalRow[]);
    setLoading(false);
  }, [roundId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="text-sm text-muted-foreground flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  // Các đầu mối mà thành viên này chưa GỬI phiếu (nháp vẫn tính là chưa gửi)
  const pendingSubjectsOf = (member: MemberRow): SubjectRow[] =>
    subjects.filter((s) => {
      if (s.profile_id && s.profile_id === member.profile_id) return false;
      const ev = evals.find((e) => e.subject_id === s.id && e.evaluator_id === member.profile_id);
      return ev?.status !== 'submitted';
    });

  const remindMember = async (member: MemberRow): Promise<'sent' | 'skipped' | 'error'> => {
    const pending = pendingSubjectsOf(member);
    if (pending.length === 0) return 'skipped';
    setRemindingIds((prev) => new Set(prev).add(member.profile_id));
    try {
      const { data, error } = await supabase.functions.invoke('send-hr-notification', {
        body: {
          kind: 'council_vote_reminder',
          recipient_profile_id: member.profile_id,
          cycle_name: roundName,
          pending_subjects: pending.map((s) => s.full_name),
          deadline_text: votingDeadline ? new Date(votingDeadline).toLocaleString('vi-VN') : '',
        },
      });
      if (error) throw error;
      const res = data as { success?: boolean; skipped?: string };
      if (res?.success || res?.skipped === 'duplicate') {
        setRemindedIds((prev) => new Set(prev).add(member.profile_id));
        return res?.success ? 'sent' : 'skipped';
      }
      return 'skipped';
    } catch (e) {
      if (isSessionExpiredError(e)) toast.error(SESSION_EXPIRED_MESSAGE, { id: 'session-expired' });
      return 'error';
    } finally {
      setRemindingIds((prev) => { const n = new Set(prev); n.delete(member.profile_id); return n; });
    }
  };

  const remindOne = async (member: MemberRow) => {
    const result = await remindMember(member);
    if (result === 'sent') {
      toast.success(`Đã gửi email nhắc tới ${member.email || member.full_name}. Nếu chưa thấy thư, vui lòng kiểm tra mục Spam/Quảng cáo.`);
    } else if (result === 'skipped') {
      toast.info(`${member.full_name} đã được nhắc hôm nay${member.email ? ` (${member.email})` : ''} hoặc chưa có email trong hồ sơ.`);
    } else {
      toast.error(`Không gửi được email nhắc ${member.full_name}.`);
    }
  };

  const remindAll = async () => {
    const targets = members.filter((m) => pendingSubjectsOf(m).length > 0);
    if (targets.length === 0) { toast.info('Tất cả thành viên đã gửi đủ phiếu.'); return; }
    if (!window.confirm(`Gửi email nhắc ${targets.length} thành viên còn phiếu chưa gửi?`)) return;
    setRemindingAll(true);
    let sent = 0, skipped = 0, failed = 0;
    for (const m of targets) {
      const r = await remindMember(m);
      if (r === 'sent') sent++;
      else if (r === 'skipped') skipped++;
      else failed++;
    }
    setRemindingAll(false);
    toast.success(`Nhắc phiếu: ${sent} đã gửi, ${skipped} bỏ qua (đã nhắc/thiếu email)${failed ? `, ${failed} lỗi` : ''}.`);
  };

  const deleteEvaluation = async (ev: EvalRow, memberName: string, subjectName: string) => {
    if (!window.confirm(
      `Xóa phiếu của ${memberName} đánh giá ${subjectName}?\nToàn bộ điểm và nhận xét của phiếu này sẽ bị xóa để thành viên chấm lại từ đầu.`,
    )) return;
    const { error } = await supabase.from('council_evaluations').delete().eq('id', ev.id);
    if (error) { toast.error('Lỗi xóa phiếu: ' + error.message); return; }
    toast.success(`Đã xóa phiếu của ${memberName} — thành viên có thể chấm lại.`);
    load();
  };

  const cell = (member: MemberRow, subject: SubjectRow) => {
    if (subject.profile_id && subject.profile_id === member.profile_id) {
      return <span className="text-muted-foreground text-xs">×</span>; // không tự đánh giá
    }
    const ev = evals.find((e) => e.subject_id === subject.id && e.evaluator_id === member.profile_id);
    if (!ev) return <Badge variant="outline" className="text-[10px] text-muted-foreground">Chưa</Badge>;
    return (
      <span className="inline-flex items-center gap-1">
        {ev.status === 'submitted'
          ? <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">Đã gửi</Badge>
          : <Badge variant="secondary" className="text-[10px]">Nháp</Badge>}
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 text-destructive"
          title="Xóa phiếu để chấm lại"
          onClick={() => deleteEvaluation(ev, member.full_name, subject.full_name)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </span>
    );
  };

  const shortName = (full: string) => full.split(' ').slice(-2).join(' ');
  const totalExpected = subjects.reduce(
    (acc, s) => acc + members.filter((m) => !(s.profile_id && s.profile_id === m.profile_id)).length,
    0,
  );
  const totalSubmitted = evals.filter((e) => e.status === 'submitted').length;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground flex-1 min-w-[260px]">
          Tiến độ bỏ phiếu kỳ <strong>{roundName}</strong>: đã gửi <strong>{totalSubmitted}/{totalExpected}</strong> phiếu.
          Bảng chỉ hiển thị trạng thái gửi phiếu để đôn đốc — không hiển thị điểm nhằm giữ tính ẩn danh.
          Dấu × là ô cán bộ không tự đánh giá bản thân. Nút <Trash2 className="w-3 h-3 inline text-destructive" /> xóa
          phiếu (điểm + nhận xét) để thành viên chấm lại từ đầu.
        </p>
        {roundOpen && (
          <Button size="sm" variant="outline" onClick={remindAll} disabled={remindingAll}>
            {remindingAll ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BellRing className="w-4 h-4 mr-1" />}
            Nhắc tất cả chưa gửi
          </Button>
        )}
      </div>
      <Card>
        {/* Cuộn 2 chiều tự chứa (max-h) + sticky header/cột đầu: trên điện thoại
            trang ngoài ngắn lại, vuốt dọc trong bảng luôn ăn, không bị cuộn ngang "nuốt". */}
        <CardContent className="p-0 overflow-auto max-h-[65vh] overscroll-contain">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-2 py-2 font-medium whitespace-nowrap sticky left-0 top-0 z-30 bg-card">Thành viên Hội đồng</th>
                {subjects.map((s) => (
                  <th key={s.id} className="px-2 py-2 font-medium text-center whitespace-nowrap sticky top-0 z-20 bg-card" title={s.full_name}>
                    {shortName(s.full_name)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-2 py-1.5 whitespace-nowrap sticky left-0 z-10 bg-card">
                    <div className="font-medium flex items-center gap-1.5">
                      {m.full_name}
                      {roundOpen && pendingSubjectsOf(m).length > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`h-6 w-6 p-0 ${remindedIds.has(m.profile_id) ? 'text-emerald-600' : 'text-muted-foreground'}`}
                          title={m.email
                            ? `Nhắc email ${m.full_name} (gửi tới ${m.email}) — còn ${pendingSubjectsOf(m).length} phiếu chưa gửi`
                            : `${m.full_name} chưa có email trong hồ sơ — bổ sung tại Danh sách cán bộ`}
                          disabled={remindingIds.has(m.profile_id) || remindingAll || !m.email}
                          onClick={() => remindOne(m)}
                        >
                          {remindingIds.has(m.profile_id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{MEMBER_GROUP_LABELS[m.member_group]}</div>
                  </td>
                  {subjects.map((s) => (
                    <td key={s.id} className="px-2 py-1.5 text-center">{cell(m, s)}</td>
                  ))}
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={subjects.length + 1} className="px-3 py-6 text-center text-muted-foreground">Chưa có thành viên Hội đồng.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
