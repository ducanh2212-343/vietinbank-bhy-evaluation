import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { MEMBER_GROUP_LABELS, type CouncilMemberGroup } from '@/lib/council';

interface Props {
  roundId: string;
  roundName: string;
}

interface MemberRow { id: string; profile_id: string; member_group: CouncilMemberGroup; full_name: string; }
interface SubjectRow { id: string; full_name: string; profile_id: string | null; }
interface EvalRow { subject_id: string; evaluator_id: string; status: string; }

// Bảng theo dõi tiến độ bỏ phiếu — chỉ hiển thị AI đã gửi phiếu (phục vụ đôn đốc),
// KHÔNG hiển thị điểm số để giữ nguyên tính ẩn danh của kết quả chấm.
export function CouncilProgressTab({ roundId, roundName }: Props) {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [evals, setEvals] = useState<EvalRow[]>([]);

  const load = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    const [membersRes, subjectsRes, evalsRes] = await Promise.all([
      supabase.from('council_members').select('id, profile_id, member_group, is_active, profiles(full_name)').eq('is_active', true),
      supabase.from('council_subjects').select('id, full_name, profile_id').eq('round_id', roundId).eq('is_active', true).order('sort_order'),
      supabase.from('council_evaluations').select('subject_id, evaluator_id, status').eq('round_id', roundId),
    ]);
    const err = membersRes.error || subjectsRes.error || evalsRes.error;
    if (err) { toast.error('Lỗi tải tiến độ: ' + err.message); setLoading(false); return; }
    setMembers((membersRes.data || []).map((m) => {
      const p = m.profiles as unknown as { full_name: string } | null;
      return { id: m.id, profile_id: m.profile_id, member_group: m.member_group as CouncilMemberGroup, full_name: p?.full_name || '?' };
    }));
    setSubjects((subjectsRes.data || []) as SubjectRow[]);
    setEvals((evalsRes.data || []) as EvalRow[]);
    setLoading(false);
  }, [roundId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="text-sm text-muted-foreground flex items-center gap-2 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  const cell = (member: MemberRow, subject: SubjectRow) => {
    if (subject.profile_id && subject.profile_id === member.profile_id) {
      return <span className="text-muted-foreground text-xs">×</span>; // không tự đánh giá
    }
    const ev = evals.find((e) => e.subject_id === subject.id && e.evaluator_id === member.profile_id);
    if (ev?.status === 'submitted') return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">Đã gửi</Badge>;
    if (ev) return <Badge variant="secondary" className="text-[10px]">Nháp</Badge>;
    return <Badge variant="outline" className="text-[10px] text-muted-foreground">Chưa</Badge>;
  };

  const shortName = (full: string) => full.split(' ').slice(-2).join(' ');
  const totalExpected = subjects.reduce(
    (acc, s) => acc + members.filter((m) => !(s.profile_id && s.profile_id === m.profile_id)).length,
    0,
  );
  const totalSubmitted = evals.filter((e) => e.status === 'submitted').length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Tiến độ bỏ phiếu kỳ <strong>{roundName}</strong>: đã gửi <strong>{totalSubmitted}/{totalExpected}</strong> phiếu.
        Bảng chỉ hiển thị trạng thái gửi phiếu để đôn đốc — không hiển thị điểm nhằm giữ tính ẩn danh.
        Dấu × là ô cán bộ không tự đánh giá bản thân.
      </p>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium whitespace-nowrap">Thành viên Hội đồng</th>
                {subjects.map((s) => (
                  <th key={s.id} className="px-2 py-2 font-medium text-center whitespace-nowrap" title={s.full_name}>
                    {shortName(s.full_name)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="font-medium">{m.full_name}</div>
                    <div className="text-[10px] text-muted-foreground">{MEMBER_GROUP_LABELS[m.member_group]}</div>
                  </td>
                  {subjects.map((s) => (
                    <td key={s.id} className="px-2 py-2 text-center">{cell(m, s)}</td>
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
