import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  loading?: boolean;
  onConfirm: (reason: string) => void;
}

const MIN_REASON_LEN = 10;

export function ReturnDialog({ open, onOpenChange, title, description, loading, onConfirm }: Props) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_REASON_LEN;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">
            Lý do trả lại <span className="text-destructive">*</span>
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Nêu rõ cán bộ cần chỉnh sửa/bổ sung nội dung nào…"
          />
          <p className={`text-xs ${tooShort ? 'text-destructive' : 'text-muted-foreground'}`}>
            Nêu rõ cán bộ cần chỉnh sửa/bổ sung nội dung nào. Tối thiểu {MIN_REASON_LEN} ký tự ({trimmed.length}/{MIN_REASON_LEN}).
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>Huỷ</Button>
          <Button variant="destructive" onClick={() => onConfirm(trimmed)} disabled={loading || tooShort}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Trả lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
