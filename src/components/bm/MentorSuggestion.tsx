import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeartHandshake, Loader2, UserCheck, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { SkillPriority } from './SkillPriorityPicker';
import type { SkillAction } from './SkillActionsBlock';

const MENTOR_CAPACITY = 2; // mỗi chuyên gia kèm tối đa 2 người / kỳ

interface MentorRow {
  profile_id: string;
  full_name: string;
  department_id: string | null;
  department_name: string | null;
  skill_level: number;
  active_mentees: number;
}

interface ActivePair {
  id: string;
  mentor_profile_id: string;
  mentor_name: string;
}

interface Props {
  priority: SkillPriority;
  cycleId: string;
  menteeProfileId: string;
  menteeDepartmentId?: string | null;
  existingActionsCount: number;
  onAddAction: (action: SkillAction) => void;
  readOnly?: boolean;
}

export function MentorSuggestion({
  priority, cycleId, menteeProfileId, menteeDepartmentId,
  existingActionsCount, onAddAction, readOnly,
}: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [mentors, setMentors] = useState<MentorRow[] | null>(null);
  const [pair, setPair] = useState<ActivePair | null>(null);

  const loadPair = useCallback(async () => {
    const { data } = await supabase
      .from('mentorship_pairs')
      .select('id, mentor_profile_id, mentor:profiles!mentorship_pairs_mentor_profile_id_fkey(full_name)')
      .eq('cycle_id', cycleId)
      .eq('mentee_profile_id', menteeProfileId)
      .eq('skill_id', priority.skill_id)
      .eq('status', 'active')
      .limit(1);
    const row = data?.[0];
    setPair(row ? {
      id: row.id,
      mentor_profile_id: row.mentor_profile_id,
      mentor_name: row.mentor?.full_name || 'Người kèm cặp',
    } : null);
  }, [cycleId, menteeProfileId, priority.skill_id]);

  useEffect(() => { loadPair(); }, [loadPair]);

  const fetchMentors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('suggest_skill_mentors', {
        _skill_id: priority.skill_id,
        _cycle_id: cycleId,
      });
      if (error) throw error;
      const rows = ((data || []) as MentorRow[])
        .filter((m) => m.profile_id !== menteeProfileId)
        // Ưu tiên người cùng phòng, sau đó level cao, sau đó còn nhiều chỗ trống
        .sort((a, b) => {
          const aSame = a.department_id && a.department_id === menteeDepartmentId ? 0 : 1;
          const bSame = b.department_id && b.department_id === menteeDepartmentId ? 0 : 1;
          return aSame - bSame || b.skill_level - a.skill_level || a.active_mentees - b.active_mentees;
        });
      setMentors(rows);
      if (!rows.length) toast.info('Chưa có cán bộ nào đạt L3+ ở kỹ năng này trong kỳ.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lấy được gợi ý người kèm cặp');
    } finally {
      setLoading(false);
    }
  };

  const chooseMentor = async (m: MentorRow) => {
    setChoosing(m.profile_id);
    try {
      const { error } = await supabase.from('mentorship_pairs').insert({
        cycle_id: cycleId,
        mentor_profile_id: m.profile_id,
        mentee_profile_id: menteeProfileId,
        skill_id: priority.skill_id,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      const pid = priority.id || priority.skill_id;
      onAddAction({
        skill_priority_id: pid,
        row_no: existingActionsCount + 1,
        action_type: '20',
        action_text: `Được kèm cặp bởi ${m.full_name}${m.department_name ? ` (${m.department_name})` : ''} về kỹ năng ${priority.skill_name || ''}`.trim(),
        expected_result: priority.target_level != null ? `Đạt L${priority.target_level} với xác nhận của người kèm cặp` : 'Tiến bộ rõ rệt qua nhận xét của người kèm cặp',
        deadline: '',
        requested_support: 'Lãnh đạo phòng bố trí thời gian trao đổi/kèm cặp định kỳ',
        evidence_expected: 'Nhận xét của người kèm cặp / sản phẩm công việc thực tế',
        status: 'planned',
        actual_result: '',
        manager_review: '',
      });
      toast.success(`Đã ghép kèm cặp với ${m.full_name} và thêm hành động 20%`);
      setMentors(null);
      await loadPair();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg.includes('đã nhận đủ') ? msg : `Không ghép được: ${msg}`);
    } finally {
      setChoosing(null);
    }
  };

  const cancelPair = async () => {
    if (!pair) return;
    const { error } = await supabase.from('mentorship_pairs').update({ status: 'cancelled' }).eq('id', pair.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Đã hủy ghép kèm cặp');
    setPair(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <HeartHandshake className="w-3.5 h-3.5" />
        Người kèm cặp nội bộ (hành động 20%)
      </div>

      {pair ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <UserCheck className="w-4 h-4 text-sky-700 shrink-0" />
            <span className="text-xs text-sky-900">
              Đang được <b>{pair.mentor_name}</b> kèm cặp kỹ năng này trong kỳ.
            </span>
          </div>
          {!readOnly && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={cancelPair}>
              <X className="w-3 h-3 mr-1" />Hủy ghép
            </Button>
          )}
        </div>
      ) : (
        <>
          {mentors === null ? (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={fetchMentors} disabled={loading || readOnly}>
              {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <HeartHandshake className="w-3.5 h-3.5 mr-1.5" />}
              Tìm người kèm cặp trong chi nhánh
            </Button>
          ) : mentors.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              Chưa có cán bộ nào đạt L3+ ở kỹ năng này — hãy dùng kênh 70% (học qua việc) hoặc 10% (khoá học) trước.
            </p>
          ) : (
            <div className="space-y-1.5">
              {mentors.map((m) => {
                const slots = Math.max(0, MENTOR_CAPACITY - m.active_mentees);
                const sameDept = !!m.department_id && m.department_id === menteeDepartmentId;
                return (
                  <div key={m.profile_id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2.5 py-1.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-medium">{m.full_name}</span>
                        <Badge variant="secondary" className="text-[9px]">L{m.skill_level}</Badge>
                        {sameDept && <Badge variant="outline" className="text-[9px] border-emerald-300 text-emerald-700">Cùng phòng</Badge>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {m.department_name || 'Chưa gán phòng'} · {slots > 0 ? `còn ${slots}/${MENTOR_CAPACITY} chỗ kèm cặp kỳ này` : 'đã kín lịch kèm cặp kỳ này'}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] shrink-0"
                      disabled={slots <= 0 || choosing !== null || readOnly}
                      onClick={() => chooseMentor(m)}
                    >
                      {choosing === m.profile_id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Chọn kèm cặp'}
                    </Button>
                  </div>
                );
              })}
              <button type="button" className="text-[10px] text-muted-foreground underline" onClick={() => setMentors(null)}>
                Ẩn danh sách
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
