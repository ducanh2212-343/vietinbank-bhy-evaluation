// Modal giới thiệu tính năng — hiện MỘT LẦN cho tip display_mode='modal'
// (đóng là ghi seen_at, như LevelUpReveal). Mở trễ ~800ms để nếu trùng
// LevelUpReveal thì hai dialog xếp chồng dự đoán được.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { FeatureTip } from '@/hooks/useFeatureTips';

export function FeatureTipModal({ tip, onSeen }: { tip: FeatureTip; onSeen: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(timer);
  }, [tip.id]);

  const handleClose = () => {
    setOpen(false);
    onSeen();
  };

  const handleCta = () => {
    handleClose();
    if (tip.cta_url) navigate(tip.cta_url);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm p-6 flex flex-col items-center gap-4 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Lightbulb className="w-5 h-5 text-primary" />
          </span>
          <h2 className="text-lg font-bold brand-gradient-text">Mẹo tính năng hay</h2>
          <p className="text-sm font-semibold mt-1">{tip.title}</p>
        </div>
        <div className="text-sm text-muted-foreground text-left [&_p]:mb-2">
          <ReactMarkdown>{tip.content}</ReactMarkdown>
        </div>
        <div className="w-full flex flex-col gap-2">
          {tip.cta_url && (
            <Button className="w-full" onClick={handleCta}>
              {tip.cta_label || 'Dùng thử ngay'}
            </Button>
          )}
          <Button variant={tip.cta_url ? 'ghost' : 'default'} className="w-full" onClick={handleClose}>
            Để sau
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
