import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PartyPopper } from 'lucide-react';
import { getBadgeVisual } from '@/lib/quizziBadges';

interface BadgeRevealItem {
  awardId: string;
  code: string;
  name: string;
  description: string | null;
}

/**
 * Khoảnh khắc nhận huy hiệu Quizzi — cùng hợp đồng với LevelUpReveal:
 * đọc quiz_badge_awards có celebrated_at NULL, hiện modal mở khoá một lần,
 * đóng modal là ghi celebrated_at.
 */
export function QuizBadgeReveal({ profileId }: { profileId: string }) {
  const [items, setItems] = useState<BadgeRevealItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const load = async () => {
      const { data: rows } = await supabase
        .from('quiz_badge_awards')
        .select('id, badge_id, quiz_badge_catalog(code, name, description)')
        .eq('profile_id', profileId)
        .is('celebrated_at', null)
        .order('awarded_at', { ascending: true });
      if (cancelled || !rows || rows.length === 0) return;
      setItems(
        rows.map((r: any) => ({
          awardId: r.id,
          code: r.quiz_badge_catalog?.code || '',
          name: r.quiz_badge_catalog?.name || '',
          description: r.quiz_badge_catalog?.description || null,
        })),
      );
      setOpen(true);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const handleClose = async () => {
    setOpen(false);
    const ids = items.map((i) => i.awardId);
    if (ids.length > 0) {
      await supabase
        .from('quiz_badge_awards')
        .update({ celebrated_at: new Date().toISOString() })
        .in('id', ids);
    }
  };

  if (items.length === 0) return null;
  return <QuizBadgeRevealView items={items} open={open} onClose={handleClose} />;
}

export function QuizBadgeRevealView({
  items,
  open,
  onClose,
}: {
  items: BadgeRevealItem[];
  open: boolean;
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    const timers = items.map((_, i) =>
      setTimeout(() => setRevealed((prev) => new Set(prev).add(i)), 500 + i * 350),
    );
    return () => timers.forEach(clearTimeout);
  }, [open, items]);

  const single = items.length === 1;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm p-6 flex flex-col items-center gap-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <PartyPopper className="w-5 h-5 text-primary" />
          </span>
          <h2 className="text-lg font-bold brand-gradient-text">Huy hiệu Quizzi mới!</h2>
          <p className="text-xs text-muted-foreground">
            {single
              ? 'Bạn vừa mở khoá một huy hiệu học tập mới.'
              : `Bạn vừa mở khoá ${items.length} huy hiệu học tập mới.`}
          </p>
        </div>

        <div className={`w-full ${single ? 'flex justify-center' : 'grid grid-cols-3 gap-3 justify-items-center'}`}>
          {items.map((it, i) => {
            const isRevealed = revealed.has(i);
            const visual = getBadgeVisual(it.code);
            const Icon = visual.icon;
            return (
              <div key={it.awardId} className="flex flex-col items-center gap-1.5">
                <span
                  className={`inline-flex items-center justify-center rounded-full transition-all duration-300
                    ${single ? 'w-20 h-20' : 'w-14 h-14'}
                    ${isRevealed ? `${visual.bgClass} skill-art-pop` : 'bg-muted'}`}
                >
                  <Icon
                    className={`${single ? 'w-10 h-10' : 'w-7 h-7'} ${isRevealed ? visual.colorClass : 'text-muted-foreground/30'}`}
                  />
                </span>
                <span className={`font-semibold ${single ? 'text-sm' : 'text-[10px] leading-tight line-clamp-2 max-w-[90px]'}`}>
                  {it.name}
                </span>
                {single && it.description && (
                  <span className="text-xs text-muted-foreground">{it.description}</span>
                )}
              </div>
            );
          })}
        </div>

        <Button className="w-full" onClick={onClose}>
          Tuyệt vời! Tiếp tục hành trình 🚀
        </Button>
      </DialogContent>
    </Dialog>
  );
}
