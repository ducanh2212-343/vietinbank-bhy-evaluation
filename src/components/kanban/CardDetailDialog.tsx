import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { computeBadges, rpcConfirm, getSourceLabel, type KanbanCard } from '@/lib/kanban';
import { ReturnCardDialog } from './ReturnCardDialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  card: KanbanCard;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
  /** Tên chủ thẻ — hiển thị cho quản lý khi xem thẻ của cán bộ khác. */
  ownerName?: string;
}

interface LogRow {
  id: string;
  log_type: string;
  old_status: string | null;
  new_status: string | null;
  progress_percent: number | null;
  progress_note: string | null;
  current_result: string | null;
  blocker_note: string | null;
  next_step: string | null;
  support_needed: string | null;
  evidence_text: string | null;
  evidence_url: string | null;
  created_at: string;
  created_by: string | null;
}

const LOG_LABEL: Record<string, string> = {
  created: 'Tạo card',
  progress_update: 'Cập nhật tiến độ',
  status_change: 'Đổi trạng thái',
  evidence_added: 'Thêm bằng chứng',
  completion_requested: 'Gửi xác nhận hoàn thành',
  manager_confirmed: 'Quản lý xác nhận',
  manager_returned: 'Quản lý yêu cầu làm tiếp',
  deadline_changed: 'Đổi deadline',
  carry_over: 'Chuyển kỳ',
};

export function CardDetailDialog({ card, open, onClose, onChanged, ownerName }: Props) {
  const { profileId } = useAuth();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [returnOpen, setReturnOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isOwner = profileId === card.profile_id;
  const b = computeBadges(card);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from('kanban_card_logs').select('*').eq('card_id', card.id).order('created_at', { ascending: false })
      .then(({ data }) => { setLogs((data as LogRow[]) || []); setLoading(false); });
  }, [open, card.id]);

  const confirm = async () => {
    try {
      await rpcConfirm(card.id);
      toast.success('Đã xác nhận hoàn thành');
      onChanged();
      onClose();
    } catch (e: any) { toast.error(e.message || 'Lỗi'); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{card.title}</DialogTitle>
          {ownerName && !isOwner && <p className="text-xs text-muted-foreground">Cán bộ: {ownerName}</p>}
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{getSourceLabel(card)}</Badge>
            {card.learning_mode && <Badge variant="outline">Hình thức: {card.learning_mode}%</Badge>}
            {card.deadline && <Badge variant="outline">Deadline: {card.deadline}</Badge>}
            <Badge variant="outline">Tiến độ: {card.progress_percent}%</Badge>
            {b.waitingConfirm && <Badge className="bg-blue-500">Chờ QL xác nhận</Badge>}
            {b.confirmed && <Badge className="bg-emerald-600">Đã xác nhận</Badge>}
            {b.returned && <Badge variant="destructive">Cần làm tiếp</Badge>}
          </div>

          {!isOwner && card.completion_status === 'waiting_manager_confirmation' && (
            <div className="flex gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <Button size="sm" onClick={confirm}>Xác nhận hoàn thành</Button>
              <Button size="sm" variant="outline" onClick={() => setReturnOpen(true)}>Yêu cầu làm tiếp</Button>
            </div>
          )}

          <div>
            <h4 className="font-semibold mb-2">Timeline</h4>
            {loading ? <p className="text-muted-foreground">Đang tải...</p> : (
              <div className="space-y-2">
                {logs.length === 0 && <p className="text-muted-foreground">Chưa có lịch sử.</p>}
                {logs.map(l => (
                  <div key={l.id} className="border-l-2 border-primary/30 pl-3 py-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium">{LOG_LABEL[l.log_type] || l.log_type}</span>
                      <span className="text-muted-foreground">{new Date(l.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    {l.progress_percent != null && <div className="text-xs mt-0.5">Tiến độ: {l.progress_percent}%</div>}
                    {l.old_status && <div className="text-xs">{l.old_status} → {l.new_status}</div>}
                    {l.progress_note && <div className="mt-1">{l.progress_note}</div>}
                    {l.current_result && <div className="text-xs mt-0.5"><b>Kết quả:</b> {l.current_result}</div>}
                    {l.next_step && <div className="text-xs mt-0.5"><b>Tiếp theo:</b> {l.next_step}</div>}
                    {l.blocker_note && <div className="text-xs mt-0.5"><b>Vướng/Lý do:</b> {l.blocker_note}</div>}
                    {l.support_needed && <div className="text-xs mt-0.5"><b>Cần hỗ trợ:</b> {l.support_needed}</div>}
                    {l.evidence_text && <div className="text-xs mt-0.5"><b>Bằng chứng:</b> {l.evidence_text}</div>}
                    {l.evidence_url && <a href={l.evidence_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">{l.evidence_url}</a>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <ReturnCardDialog cardId={card.id} open={returnOpen} onClose={() => setReturnOpen(false)} onSaved={onChanged} />
      </DialogContent>
    </Dialog>
  );
}
