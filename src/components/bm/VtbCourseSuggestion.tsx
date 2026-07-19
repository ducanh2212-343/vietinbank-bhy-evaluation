import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Loader2, CheckCircle2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAiFeatures } from '@/hooks/useAiFeatures';
import { useAuth } from '@/hooks/useAuth';
import { BrandMascotAI } from '@/components/branding/BrandAssets';
import type { SkillPriority } from './SkillPriorityPicker';
import type { SkillAction } from './SkillActionsBlock';

interface VtbCourse {
  id: string;
  code: string;
  name: string;
  objective: string | null;
  duration_days: number | null;
  format: string | null;
  relevance_score: number;
  reason: string;
}

interface Props {
  priority: SkillPriority;
  positionId: string | null | undefined;
  onAddAction: (action: SkillAction) => void;
  existingActionsCount: number;
}

export function VtbCourseSuggestion({ priority, positionId, onAddAction, existingActionsCount }: Props) {
  const { isEnabled } = useAiFeatures();
  const { profileId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<VtbCourse[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Khóa Trường ĐT: cán bộ KHÔNG tự tổ chức được → chỉ ĐĂNG KÝ NHU CẦU, TCTH tổng hợp
  // và quyết cách tổ chức (tự tổ chức / đề nghị Trường / ghi danh lớp Trường sắp mở).
  const [registeredCourseIds, setRegisteredCourseIds] = useState<Set<string>>(new Set());
  const [registering, setRegistering] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) return;
    (supabase as any).from('vtb_course_registrations')
      .select('course_id').eq('profile_id', profileId)
      .then(({ data }: any) => setRegisteredCourseIds(new Set((data || []).map((r: any) => r.course_id))));
  }, [profileId]);

  const registerNeed = async (c: VtbCourse) => {
    if (!profileId) return;
    setRegistering(c.id);
    const { error } = await (supabase as any).from('vtb_course_registrations').upsert({
      course_id: c.id, profile_id: profileId, skill_id: priority.skill_id || null,
    }, { onConflict: 'course_id,profile_id' });
    setRegistering(null);
    if (error) { toast.error('Lỗi đăng ký: ' + error.message); return; }
    setRegisteredCourseIds(prev => new Set(prev).add(c.id));
    toast.success(`Đã đăng ký nhu cầu học "${c.name}" — Phòng TCTH sẽ tổng hợp và thông báo cách tổ chức`);
  };

  const cancelNeed = async (c: VtbCourse) => {
    if (!profileId) return;
    const { error } = await (supabase as any).from('vtb_course_registrations')
      .delete().eq('course_id', c.id).eq('profile_id', profileId);
    if (error) { toast.error(error.message); return; }
    setRegisteredCourseIds(prev => { const n = new Set(prev); n.delete(c.id); return n; });
    toast.success('Đã hủy đăng ký');
  };

  const fetchSuggestions = async () => {
    if (!positionId) {
      toast.error('Chưa xác định được vị trí công tác của cán bộ');
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          mode: 'suggest_vtb_courses',
          skill_id: priority.skill_id,
          skill_name: priority.skill_name,
          skill_group: priority.skill_group,
          current_level: priority.current_level,
          target_level: priority.target_level,
          position_id: positionId,
        },
      });
      if (error) throw error;
      if (data?.message) setMessage(data.message);
      setCourses(data?.courses || []);
    } catch (e: any) {
      toast.error(e?.message || 'Không lấy được gợi ý khóa học');
    } finally {
      setLoading(false);
    }
  };

  // Admin tắt tác vụ "suggest_vtb_courses" trong Quản trị AI → ẩn hẳn khối gợi ý
  if (!isEnabled('suggest_vtb_courses')) return null;

  return (
    <div className="border-t pt-3 mt-2 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <GraduationCap className="w-3.5 h-3.5" />
          Khóa học Trường ĐT VietinBank
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchSuggestions}
          disabled={loading}
          className="h-8 text-xs"
        >
          {loading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <BrandMascotAI className="w-4 h-4 mr-1.5" />}
          {courses === null ? 'Gợi ý khóa học' : 'Gợi ý lại'}
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-muted/40 animate-pulse rounded" />
          ))}
        </div>
      )}

      {!loading && message && (
        <p className="text-xs text-muted-foreground italic">{message}</p>
      )}

      {!loading && courses && courses.length === 0 && !message && (
        <p className="text-xs text-muted-foreground italic">Chưa tìm thấy khóa học phù hợp với kỹ năng này.</p>
      )}

      {!loading && courses && courses.length > 0 && (
        <div className="space-y-2">
          {courses.map(c => (
            <div key={c.id} className="bg-primary/5 border border-primary/20 rounded p-2 space-y-1.5">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="font-medium text-sm leading-tight">
                  <span className="text-muted-foreground text-xs mr-1">#{c.code}</span>
                  {c.name}
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  Phù hợp: {'★'.repeat(c.relevance_score)}{'☆'.repeat(5 - c.relevance_score)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.duration_days != null && (
                  <Badge variant="outline" className="text-[10px]">{c.duration_days} ngày</Badge>
                )}
                {c.format && (
                  <Badge variant="outline" className="text-[10px]">{c.format}</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground italic">{c.reason}</p>
              {registeredCourseIds.has(c.id) ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã đăng ký nhu cầu — TCTH đang tổng hợp
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => cancelNeed(c)} className="h-7 text-xs text-muted-foreground">
                    Hủy đăng ký
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => registerNeed(c)}
                  disabled={registering === c.id}
                  className="h-7 text-xs w-full sm:w-auto"
                >
                  <Send className="w-3 h-3 mr-1" />
                  {registering === c.id ? 'Đang gửi…' : 'Đăng ký nhu cầu học'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
