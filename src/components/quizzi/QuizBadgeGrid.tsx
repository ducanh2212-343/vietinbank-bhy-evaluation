import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Lock } from 'lucide-react';
import { getBadgeVisual } from '@/lib/quizziBadges';

interface CatalogBadge {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
}

/**
 * Bộ sưu tập huy hiệu Quizzi — huy hiệu chưa đạt hiện silhouette + khoá
 * (cùng ngôn ngữ "scarcity" với SkillCollectionGrid).
 */
export function QuizBadgeGrid({ profileId }: { profileId: string }) {
  const [catalog, setCatalog] = useState<CatalogBadge[]>([]);
  const [earned, setEarned] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    (async () => {
      const [catRes, awardRes] = await Promise.all([
        supabase.from('quiz_badge_catalog').select('id, code, name, description, sort_order')
          .eq('is_active', true).order('sort_order'),
        supabase.from('quiz_badge_awards').select('badge_id').eq('profile_id', profileId),
      ]);
      if (cancelled) return;
      setCatalog((catRes.data || []) as CatalogBadge[]);
      setEarned(new Set((awardRes.data || []).map((a) => a.badge_id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  if (catalog.length === 0) return null;

  const earnedCount = catalog.filter((b) => earned.has(b.id)).length;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {earnedCount}/{catalog.length} huy hiệu đã mở khoá
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {catalog.map((b) => {
          const has = earned.has(b.id);
          const visual = getBadgeVisual(b.code);
          const Icon = visual.icon;
          return (
            <div key={b.id} className="flex flex-col items-center gap-1 text-center" title={b.description || b.name}>
              <span
                className={`relative inline-flex items-center justify-center w-12 h-12 rounded-full
                  ${has ? visual.bgClass : 'bg-muted'}`}
              >
                <Icon className={`w-6 h-6 ${has ? visual.colorClass : 'text-muted-foreground/25'}`} />
                {!has && (
                  <Lock className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-muted-foreground bg-background rounded-full p-0.5" />
                )}
              </span>
              <span className={`text-[10px] leading-tight line-clamp-2 ${has ? '' : 'text-muted-foreground'}`}>
                {b.name}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
