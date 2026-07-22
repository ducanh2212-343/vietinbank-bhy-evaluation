// Thẻ "Mẹo tính năng hay" trên Tổng quan — hiện 1 tip khớp vai trò, đóng là
// ghi dismissed_at nên không hiện lại (xem lại mọi tip tại /meo-hay).
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { FeatureTip } from '@/hooks/useFeatureTips';

export function FeatureTipBanner({ tip, onDismiss }: { tip: FeatureTip; onDismiss: () => void }) {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <Lightbulb className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1 text-sm min-w-0">
          <p className="font-medium">💡 Mẹo hay: {tip.title}</p>
          <div className="text-muted-foreground text-xs mt-0.5 [&_p]:m-0">
            <ReactMarkdown>{tip.content}</ReactMarkdown>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {tip.cta_url && (
            <Button size="sm" onClick={() => navigate(tip.cta_url!)}>
              {tip.cta_label || 'Dùng thử'}
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onDismiss} title="Đóng, không hiện lại">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
