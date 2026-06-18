import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  rpcUpdateProgress, QUICK_STATUS_OPTIONS, QUICK_SUGGESTIONS,
  type KanbanCard, type QuickStatus,
} from '@/lib/kanban';
import { toast } from 'sonner';

interface Props {
  card: KanbanCard;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const PERCENTS = [0, 25, 50, 75, 100] as const;

export function UpdateProgressDialog({ card, open, onClose, onSaved }: Props) {
  const [note, setNote] = useState('');
  const [percent, setPercent] = useState<number>(card.progress_percent || 0);
  const [quick, setQuick] = useState<Set<QuickStatus>>(new Set());
  const [evidence, setEvidence] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleQuick = (q: QuickStatus) => {
    setQuick(prev => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q); else next.add(q);
      // "Bình thường" is exclusive with vướng mắc / cần hỗ trợ
      if (q === 'Bình thường' && next.has('Bình thường')) {
        next.delete('Có vướng mắc'); next.delete('Cần hỗ trợ');
      }
      return next;
    });
  };

  const appendSuggestion = (s: string) => {
    setNote(prev => (prev ? prev.trimEnd() + ' ' + s : s));
  };

  const submit = async () => {
    if (note.trim().length < 10) {
      toast.error('Vui lòng nhập cập nhật tối thiểu 10 ký tự.');
      return;
    }
    setSaving(true);
    try {
      await rpcUpdateProgress(card.id, {
        progress_percent: percent,
        progress_note: note.trim(),
        blocker_note: quick.has('Có vướng mắc') ? 'Có vướng mắc' : null,
        support_needed: quick.has('Cần hỗ trợ') ? 'Cần hỗ trợ' : null,
        evidence_text: evidence.trim() ? evidence.trim() : (quick.has('Có bằng chứng') ? 'Có bằng chứng' : null),
        current_result: quick.has('Sẵn sàng hoàn thành') ? 'Sẵn sàng hoàn thành' : null,
      });
      toast.success('Đã lưu cập nhật');
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Lỗi khi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cập nhật tiến độ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="kanban-note">Cập nhật tiến độ *</Label>
            <Textarea
              id="kanban-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Hôm nay/tuần này tôi đã làm gì, kết quả ra sao, còn vướng gì hoặc bước tiếp theo là gì?"
            />
            <p className="text-xs text-muted-foreground">
              Gợi ý: đã làm gì, kết quả hiện tại, vướng mắc, việc tiếp theo, cần hỗ trợ nếu có.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => appendSuggestion(s)}
                  className="text-[11px] px-2 py-1 rounded-full border border-dashed text-muted-foreground hover:bg-muted"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Mức tiến độ</Label>
            <div className="flex flex-wrap gap-1.5">
              {PERCENTS.map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPercent(v)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    percent === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
                  }`}
                >
                  {v}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Trạng thái nhanh (tùy chọn)</Label>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_STATUS_OPTIONS.map(q => {
                const active = quick.has(q);
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => toggleQuick(q)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      active ? 'bg-secondary text-secondary-foreground border-secondary' : 'hover:bg-muted'
                    }`}
                  >
                    {q}
                  </button>
                );
              })}
            </div>
            {quick.size > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {[...quick].map(q => <Badge key={q} variant="secondary" className="text-[10px]">{q}</Badge>)}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kanban-evidence">Link hoặc mô tả bằng chứng nếu có</Label>
            <Input
              id="kanban-evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="https://... hoặc mô tả ngắn"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu cập nhật'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
