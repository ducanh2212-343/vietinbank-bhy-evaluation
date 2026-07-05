import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, Trophy, Lock, Check } from 'lucide-react';
import { SkillLevelArt } from '@/components/SkillLevelArt';
import { useSkillLevelImages } from '@/hooks/useSkillLevelImages';
import { LEVEL_LABELS, GROWTH_STAGE_LABELS } from '@/lib/skillLevels';
import { fetchCollectionItems, type CollectionItem } from '@/lib/skillCollection';

function shortName(name: string, max = 22) {
  if (!name) return '';
  return name.length <= max ? name : name.slice(0, max - 1) + '…';
}

/** Một thẻ skill trong bộ sưu tập: ảnh khung theo level + dialog xem lớn kèm teaser cấp kế tiếp. */
export function SkillCollectionCard({ item }: { item: CollectionItem }) {
  const { getImageUrl, getIconUrl, getStageImageUrl } = useSkillLevelImages();
  const locked = item.level === 0;
  // Level 0 → hé lộ khung nấc đầu tiên dưới dạng khoá, mồi tò mò
  const artLevel = locked ? 1 : item.level;
  const nextLevel = !locked && item.level < 4 ? item.level + 1 : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group flex flex-col items-center gap-1.5 rounded-lg p-2 hover:bg-muted/60 transition-colors text-center"
        >
          <span className="relative">
            <SkillLevelArt
              level={artLevel}
              imageUrl={locked ? null : getImageUrl(item.skillId, item.level)}
              iconUrl={getIconUrl(item.skillId)}
              stageImageUrl={getStageImageUrl(artLevel)}
              size="lg"
              locked={locked}
            />
            {item.metStandard && (
              <span className="absolute -top-1 -right-1 rounded-full bg-emerald-500 text-white p-0.5 shadow">
                <Check className="w-3 h-3" />
              </span>
            )}
          </span>
          <span className="text-[10px] leading-tight text-foreground/80 line-clamp-2 min-h-[24px]">
            {item.code ? `${item.code}. ` : ''}{shortName(item.name)}
          </span>
          <span className={`text-[9px] font-semibold ${locked ? 'text-muted-foreground' : 'text-primary'}`}>
            {locked ? 'Chưa hình thành' : `L${item.level}`}
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-xs p-6 flex flex-col items-center gap-4">
        <SkillLevelArt
          level={artLevel}
          imageUrl={locked ? null : getImageUrl(item.skillId, item.level)}
          iconUrl={getIconUrl(item.skillId)}
          stageImageUrl={getStageImageUrl(artLevel)}
          size="xl"
          locked={locked}
        />
        <div className="text-center">
          <p className="text-sm font-medium">{item.code ? `${item.code}. ` : ''}{item.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {locked ? 'Chưa hình thành — hãy chinh phục bậc đầu tiên' : `Level ${item.level} — ${LEVEL_LABELS[item.level]} · ${GROWTH_STAGE_LABELS[item.level]}`}
          </p>
        </div>
        {nextLevel && (
          <div className="w-full flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 p-3">
            <SkillLevelArt
              level={nextLevel}
              imageUrl={getImageUrl(item.skillId, nextLevel)}
              iconUrl={getIconUrl(item.skillId)}
              stageImageUrl={getStageImageUrl(nextLevel)}
              size="md"
              locked
            />
            <div className="text-left">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" /> Cấp tiếp theo
              </p>
              <p className="text-xs">L{nextLevel} — {LEVEL_LABELS[nextLevel]} · {GROWTH_STAGE_LABELS[nextLevel]}</p>
            </div>
          </div>
        )}
        {item.required > 0 && (
          <p className={`text-[11px] ${item.metStandard ? 'text-emerald-600' : 'text-orange-500'}`}>
            {item.metStandard
              ? `✓ Đã đạt chuẩn vị trí (tối thiểu L${item.required})`
              : `Chuẩn vị trí: tối thiểu L${item.required} — còn thiếu ${item.required - item.level} bậc`}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Dải rút gọn trên trang Tổng quan — chỉ skill lõi. */
export function SkillCollectionStrip({ formId, cycleName }: { formId: string; cycleName?: string }) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCollectionItems(formId).then((all) => {
      if (cancelled) return;
      setItems(all.filter((i) => i.isCore));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  if (loading || items.length === 0) return null;
  return <SkillCollectionStripView items={items} cycleName={cycleName} />;
}

export function SkillCollectionStripView({ items, cycleName }: { items: CollectionItem[]; cycleName?: string }) {
  const total = items.length;
  const formed = items.filter((i) => i.level >= 1).length;
  const metStandard = items.filter((i) => i.metStandard).length;
  const withStandard = items.filter((i) => i.required > 0).length;
  const pct = Math.round((formed / total) * 100);

  const headline =
    formed === 0
      ? 'Hoàn thiện đánh giá để mở khoá những skill đầu tiên của bạn.'
      : formed === total
      ? '🎉 Bạn đã hình thành trọn bộ skill lõi — tiếp tục nâng cấp lên bậc cao hơn!'
      : `Còn ${total - formed} skill nữa để hình thành trọn bộ. Cố lên!`;

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Bộ sưu tập skill của tôi
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{headline}</p>
          </div>
          {withStandard > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <Trophy className="w-3.5 h-3.5" /> Đạt chuẩn {metStandard}/{withStandard}
            </span>
          )}
        </div>

        {/* Thanh tiến trình hình thành */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span>{formed}/{total} skill đã hình thành</span>
            <span className="font-semibold text-primary">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {items.map((it) => (
            <SkillCollectionCard key={it.skillId} item={it} />
          ))}
        </div>
        {cycleName && (
          <p className="text-[10px] text-muted-foreground mt-3 text-right">Theo kỳ: {cycleName}</p>
        )}
      </CardContent>
    </Card>
  );
}
