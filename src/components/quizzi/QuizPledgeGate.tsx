import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, BookOpenCheck, Loader2 } from 'lucide-react';

interface PledgeItem {
  id: string;
  code: string;
  label: string;
}

/**
 * Checklist EQ trước khi làm bài — cam kết danh dự "không dùng phao".
 * Không phải giám sát kỹ thuật: tự tick cam kết là kỹ thuật tâm lý
 * (consistency principle) — đã chủ động cam kết thì tự giác giữ lời,
 * và TỰ LÀM THÌ NHỚ LÂU HƠN. Server vẫn ép cờ _pledge_accepted ở RPC start.
 */
export function QuizPledgeGate({
  quizTitle,
  onConfirm,
  onBack,
}: {
  quizTitle: string;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const [items, setItems] = useState<PledgeItem[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('quiz_pledge_items')
        .select('id, code, label')
        .eq('is_active', true)
        .order('sort_order');
      if (!cancelled) setItems((data || []) as PledgeItem[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải…</div>;
  }

  // Danh mục trống (chưa seed) → không chặn người làm bài
  if (items.length === 0) {
    onConfirm();
    return null;
  }

  const allChecked = items.every((it) => checked.has(it.id));

  return (
    <div className="p-4 md:p-6 max-w-md mx-auto">
      <Card>
        <CardContent className="py-6 space-y-4">
          <div className="flex flex-col items-center text-center gap-2">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <BookOpenCheck className="w-6 h-6 text-primary" />
            </span>
            <h2 className="text-lg font-bold brand-gradient-text">Cam kết tự làm</h2>
            <p className="text-xs text-muted-foreground">
              {quizTitle} · Tự làm bằng trí nhớ của mình thì kiến thức mới ở lại lâu —
              tick từng dòng để bắt đầu 🧠
            </p>
          </div>

          <div className="space-y-2.5">
            {items.map((it) => {
              const isChecked = checked.has(it.id);
              return (
                <label
                  key={it.id}
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors
                    ${isChecked ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/30'}`}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={(v) => {
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (v === true) next.add(it.id); else next.delete(it.id);
                        return next;
                      });
                    }}
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-snug">{it.label}</span>
                </label>
              );
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
            </Button>
            <Button className="flex-1" disabled={!allChecked} onClick={onConfirm}>
              {allChecked ? 'Tôi cam kết — Bắt đầu làm bài 🚀' : `Tick đủ ${items.length} cam kết để bắt đầu`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
