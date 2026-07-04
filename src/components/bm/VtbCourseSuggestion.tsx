import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<VtbCourse[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  const addAsAction = (c: VtbCourse) => {
    const pid = priority.id || priority.skill_id;
    onAddAction({
      skill_priority_id: pid,
      row_no: existingActionsCount + 1,
      action_type: '10',
      action_text: `[VTB-${c.code}] ${c.name}`,
      expected_result: c.objective?.split('\n')[0]?.slice(0, 200) || '',
      deadline: '',
      requested_support: 'Đăng ký qua Trường ĐT VietinBank',
      evidence_expected: 'Chứng nhận hoàn thành khóa học',
      status: 'planned',
      actual_result: '',
      manager_review: '',
    });
    toast.success(`Đã thêm "${c.name}" vào hành động`);
  };

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
              <Button
                size="sm"
                variant="ghost"
                onClick={() => addAsAction(c)}
                className="h-7 text-xs w-full sm:w-auto"
              >
                <Plus className="w-3 h-3 mr-1" />Thêm vào hành động (10%)
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
