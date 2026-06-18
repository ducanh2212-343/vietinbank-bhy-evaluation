import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { rpcReturn } from '@/lib/kanban';
import { toast } from 'sonner';

interface Props { cardId: string; open: boolean; onClose: () => void; onSaved: () => void; }

export function ReturnCardDialog({ cardId, open, onClose, onSaved }: Props) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason.trim()) { toast.error('Vui lòng nhập lý do.'); return; }
    setSaving(true);
    try {
      await rpcReturn(cardId, reason);
      toast.success('Đã trả lại card');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Yêu cầu làm tiếp</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <Label>Lý do *</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Đang gửi...' : 'Gửi'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
