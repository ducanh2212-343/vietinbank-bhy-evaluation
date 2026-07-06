import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PartyPopper } from 'lucide-react';
import { SkillLevelArt } from '@/components/SkillLevelArt';
import { useSkillLevelImages } from '@/hooks/useSkillLevelImages';
import { LEVEL_LABELS, GROWTH_STAGE_LABELS } from '@/lib/skillLevels';

export interface RevealItem {
  /** id các dòng achievement sẽ được đánh dấu đã xem (1 skill có thể gộp nhiều bậc) */
  achievementIds: string[];
  skillId: string;
  code: string;
  name: string;
  level: number;
}

/**
 * Khoảnh khắc thăng cấp: khi phiếu được duyệt với level cao hơn kỳ trước,
 * trigger DB ghi vào skill_level_achievements; lần đăng nhập kế tiếp modal này
 * "mở khoá" huy hiệu mới (silhouette → pop màu). Chỉ hiện một lần —
 * đóng modal là celebrated_at được ghi.
 */
export function LevelUpReveal({ profileId }: { profileId: string }) {
  const [items, setItems] = useState<RevealItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    const load = async () => {
      const { data: rows } = await supabase
        .from('skill_level_achievements')
        .select('id, skill_id, level_no')
        .eq('profile_id', profileId)
        .is('celebrated_at', null)
        .order('achieved_at', { ascending: true });
      if (cancelled || !rows || rows.length === 0) return;

      const skillIds = [...new Set(rows.map((r) => r.skill_id))];
      const { data: skills } = await supabase
        .from('skill_catalog')
        .select('id, code, name')
        .in('id', skillIds);
      if (cancelled) return;
      const skillMap = new Map((skills || []).map((s) => [s.id, s]));

      // Gộp theo skill — hiển thị bậc cao nhất, nhưng đánh dấu đã xem mọi dòng
      const bySkill = new Map<string, RevealItem>();
      rows.forEach((r) => {
        const existing = bySkill.get(r.skill_id);
        if (existing) {
          existing.achievementIds.push(r.id);
          existing.level = Math.max(existing.level, r.level_no);
        } else {
          const s = skillMap.get(r.skill_id);
          bySkill.set(r.skill_id, {
            achievementIds: [r.id],
            skillId: r.skill_id,
            code: s?.code || '',
            name: s?.name || '',
            level: r.level_no,
          });
        }
      });
      setItems([...bySkill.values()]);
      setOpen(true);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const handleClose = async () => {
    setOpen(false);
    const ids = items.flatMap((i) => i.achievementIds);
    if (ids.length > 0) {
      await supabase
        .from('skill_level_achievements')
        .update({ celebrated_at: new Date().toISOString() })
        .in('id', ids);
    }
  };

  if (items.length === 0) return null;
  return <LevelUpRevealView items={items} open={open} onClose={handleClose} />;
}

export function LevelUpRevealView({
  items,
  open,
  onClose,
}: {
  items: RevealItem[];
  open: boolean;
  onClose: () => void;
}) {
  const { getImageUrl, getIconUrl, getStageImageUrl } = useSkillLevelImages();
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  // Mở khoá lần lượt từng huy hiệu (stagger) sau khi modal hiện
  useEffect(() => {
    if (!open) return;
    const timers = items.map((_, i) =>
      setTimeout(() => {
        setRevealed((prev) => new Set(prev).add(i));
      }, 500 + i * 350),
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
          <h2 className="text-lg font-bold brand-gradient-text">Chúc mừng thăng cấp!</h2>
          <p className="text-xs text-muted-foreground">
            {single
              ? 'Kết quả kỳ đánh giá đã được phê duyệt — bạn vừa mở khoá huy hiệu mới.'
              : `Kết quả kỳ đánh giá đã được phê duyệt — ${items.length} huy hiệu mới được mở khoá.`}
          </p>
        </div>

        <div className={`w-full ${single ? 'flex justify-center' : 'grid grid-cols-3 gap-3 justify-items-center'}`}>
          {items.map((it, i) => {
            const isRevealed = revealed.has(i);
            return (
              <div key={it.skillId} className="flex flex-col items-center gap-1.5">
                <SkillLevelArt
                  level={it.level}
                  imageUrl={isRevealed ? getImageUrl(it.skillId, it.level) : null}
                  iconUrl={getIconUrl(it.skillId)}
                  stageImageUrl={getStageImageUrl(it.level)}
                  size={single ? 'xl' : 'lg'}
                  locked={!isRevealed}
                  className={isRevealed ? 'skill-art-pop' : ''}
                />
                {single ? (
                  <div className="mt-1">
                    <p className="text-sm font-semibold">{it.code ? `${it.code}. ` : ''}{it.name}</p>
                    <p className="text-xs text-primary font-medium mt-0.5">
                      L{it.level} — {LEVEL_LABELS[it.level]} · {GROWTH_STAGE_LABELS[it.level]}
                    </p>
                  </div>
                ) : (
                  <>
                    <span className="text-[10px] leading-tight line-clamp-2 max-w-[90px]">{it.name}</span>
                    <span className="text-[9px] font-semibold text-primary">L{it.level} · {LEVEL_LABELS[it.level]}</span>
                  </>
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
