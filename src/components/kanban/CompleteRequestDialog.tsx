import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { rpcRequestCompletion } from '@/lib/kanban';
import { toast } from 'sonner';

interface Props {
  cardId: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CompleteRequestDialog({ cardId, open, onClose, onSaved }: Props) {
  const [result, setResult] = useState('');
  const [evidence, setEvidence] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!result.trim() || !evidence.trim()) {
      toast.error('Vui lòng nhập kết quả và bằng chứng.');
      return;
    }
    setSaving(true);
    try {
      await rpcRequestCompletion(cardId, result, evidence, url || undefined);
      toast.success('Đã gửi xác nhận hoàn thành');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Gửi xác nhận hoàn thành</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <Label>Kết quả đã đạt được *</Label>
            <Textarea value={result} onChange={(e) => setResult(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Bằng chứng hoàn thành *</Label>
            <Textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Link bằng chứng (tùy chọn)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Đang gửi...' : 'Gửi'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
