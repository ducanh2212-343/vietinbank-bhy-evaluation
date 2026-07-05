import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Trophy } from 'lucide-react';
import { SkillCollectionCard } from '@/components/profile/SkillCollectionStrip';
import { fetchCollectionItems, type CollectionItem } from '@/lib/skillCollection';

/**
 * Lưới bộ sưu tập đầy đủ trong Hồ sơ cá nhân: toàn bộ skill của phiếu gần nhất
 * (lõi + bổ trợ), nhóm theo bộ skill với tiến trình từng nhóm — "album" để
 * cán bộ ngắm thành quả và thấy còn thiếu gì.
 */
export function SkillCollectionGrid({ formId, cycleName }: { formId: string; cycleName?: string }) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchCollectionItems(formId).then((all) => {
      if (cancelled) return;
      setItems(all);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  if (loading || items.length === 0) return null;
  return <SkillCollectionGridView items={items} cycleName={cycleName} />;
}

export function SkillCollectionGridView({ items, cycleName }: { items: CollectionItem[]; cycleName?: string }) {
  // Nhóm skill lõi theo skill_group (giữ thứ tự xuất hiện); skill bổ trợ dồn nhóm riêng cuối cùng
  const groups: { label: string; items: CollectionItem[] }[] = [];
  const byLabel = new Map<string, CollectionItem[]>();
  items.filter((i) => i.isCore).forEach((i) => {
    const label = i.group || 'Khác';
    if (!byLabel.has(label)) {
      const bucket: CollectionItem[] = [];
      byLabel.set(label, bucket);
      groups.push({ label, items: bucket });
    }
    byLabel.get(label)!.push(i);
  });
  const supp = items.filter((i) => !i.isCore);
  if (supp.length > 0) groups.push({ label: 'Skill bổ trợ (tự chọn thêm)', items: supp });

  const total = items.length;
  const formed = items.filter((i) => i.level >= 1).length;
  const metStandard = items.filter((i) => i.metStandard).length;
  const withStandard = items.filter((i) => i.required > 0).length;
  const pct = Math.round((formed / total) * 100);

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Bộ sưu tập skill
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formed}/{total} skill đã hình thành ({pct}%){cycleName ? ` · theo kỳ ${cycleName}` : ''}
            </p>
          </div>
          {withStandard > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <Trophy className="w-3.5 h-3.5" /> Đạt chuẩn {metStandard}/{withStandard}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {groups.map((g) => {
          const gFormed = g.items.filter((i) => i.level >= 1).length;
          const gPct = Math.round((gFormed / g.items.length) * 100);
          return (
            <div key={g.label}>
              <div className="flex items-center gap-3 mb-2">
                <p className="text-xs font-semibold text-foreground/90">{g.label}</p>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[160px]">
                  <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-primary" style={{ width: `${gPct}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{gFormed}/{g.items.length}</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {g.items.map((it) => (
                  <SkillCollectionCard key={it.skillId} item={it} />
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
