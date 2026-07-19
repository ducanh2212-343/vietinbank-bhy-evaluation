import { useEffect, useMemo, useState } from 'react';
import { Sprout, ThumbsUp, Wrench } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { ATTITUDE_DIMENSIONS } from '@/components/bm/AttitudeConstants';
import { BEHAVIOR_TYPE_LABELS, type BehaviorType } from '@/lib/nepTot';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type BehaviorNote = Tables<'behavior_notes'>;
type SkillOption = { id: string; code: string; name: string };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Nếp Tốt của tôi — cán bộ xem các bản ghi hành vi lãnh đạo đã chia sẻ.
 * (RLS chỉ trả về bản đã xác nhận + được chia sẻ; bản phân tích phát hành
 * sẽ xuất hiện tại đây ở Bước 3.)
 */
export default function MyNepTotPage() {
  const { profileId, loading: authLoading } = useAuth();
  const [notes, setNotes] = useState<BehaviorNote[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !profileId) return;
    (async () => {
      setLoading(true);
      try {
        const [notesRes, skillsRes] = await Promise.all([
          supabase.from('behavior_notes').select('*')
            .eq('employee_id', profileId)
            .order('occurred_at', { ascending: false }),
          supabase.from('skill_catalog').select('id, code, name').eq('is_active', true),
        ]);
        setNotes(notesRes.data ?? []);
        setSkills((skillsRes.data ?? []) as SkillOption[]);
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, profileId]);

  const positive = useMemo(() => notes.filter((n) => n.behavior_type === 'tich_cuc'), [notes]);
  const improve = useMemo(() => notes.filter((n) => n.behavior_type === 'can_cai_thien'), [notes]);

  const renderNote = (n: BehaviorNote) => (
    <Card key={n.id}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          <Badge
            variant="outline"
            className={n.behavior_type === 'tich_cuc'
              ? 'border-emerald-400 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-400 text-amber-700 dark:text-amber-300'}
          >
            {n.behavior_type === 'tich_cuc' ? <ThumbsUp className="w-3 h-3 mr-1" /> : <Wrench className="w-3 h-3 mr-1" />}
            {BEHAVIOR_TYPE_LABELS[n.behavior_type as BehaviorType]}
          </Badge>
          <span className="text-xs text-muted-foreground">{fmtDate(n.occurred_at)}</span>
        </div>
        {n.situation && <p className="text-xs text-muted-foreground mb-1">Tình huống: {n.situation}</p>}
        <p className="text-sm whitespace-pre-wrap">{n.behavior || n.raw_text}</p>
        {n.impact && <p className="text-xs text-muted-foreground mt-1">Tác động: {n.impact}</p>}
        {(n.skill_ids.length > 0 || n.attitude_dimension_ids.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {n.skill_ids.map((id) => {
              const s = skills.find((x) => x.id === id);
              return s ? <Badge key={id} variant="secondary" className="text-[10px]">{s.code} · {s.name}</Badge> : null;
            })}
            {n.attitude_dimension_ids.map((id) => {
              const a = ATTITUDE_DIMENSIONS.find((x) => x.id === id);
              return a ? <Badge key={id} variant="secondary" className="text-[10px]">{a.name}</Badge> : null;
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Sprout className="w-5 h-5 text-primary" /> Nếp Tốt của tôi
        </h1>
        <p className="text-sm text-muted-foreground">
          Các ghi nhận hành vi lãnh đạo đã chia sẻ với bạn. Dữ liệu này hỗ trợ trao đổi và phát triển,
          không tự thay đổi kết quả đánh giá.
        </p>
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-10">Đang tải...</div>
      ) : notes.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          Chưa có ghi nhận nào được chia sẻ với bạn.
        </div>
      ) : (
        <>
          {positive.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                Hành vi tích cực — nên duy trì, phát huy ({positive.length})
              </h2>
              {positive.map(renderNote)}
            </div>
          )}
          {improve.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Hành vi cần cải thiện — cùng trao đổi, điều chỉnh ({improve.length})
              </h2>
              {improve.map(renderNote)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
