import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { computeBadges, rpcConfirm, getSourceLabel, type KanbanCard } from '@/lib/kanban';
import { ReturnCardDialog } from './ReturnCardDialog';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Ct2DongThoiGian, type NguoiTraoDoi } from '@/components/one/move2/Ct2DongThoiGian';
import { safeHref } from '@/lib/safeUrl';

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

  // Trao đổi trên thẻ 38 skill / thẻ Dấu ấn. Trước đây thẻ chỉ có timeline một
  // chiều: cán bộ ghi tiến độ, quản lý nhận push, nhưng không ai trả lời được
  // vào đúng chỗ — góp ý quay về Zalo và mất khỏi hồ sơ phát triển.
  const { data: lienQuan } = useQuery({
    queryKey: ['kanban', 'nguoi-lien-quan', card.profile_id],
    enabled: open && !!card.profile_id,
    staleTime: 300_000,
    queryFn: async () => {
      const { data: chu } = await supabase.from('profiles')
        .select('id, full_name, manager_id, pgd_id').eq('id', card.profile_id).maybeSingle();
      if (!chu) return [] as NguoiTraoDoi[];
      const capTren = [chu.manager_id, chu.pgd_id].filter(Boolean) as string[];
      const { data: ds } = capTren.length
        ? await supabase.from('profiles').select('id, full_name').in('id', capTren)
        : { data: [] as { id: string; full_name: string }[] };
      const ket: NguoiTraoDoi[] = [{ id: chu.id, ten: chu.full_name, vaiTro: 'chủ thẻ' }];
      for (const p of ds ?? []) {
        if (!ket.some((x) => x.id === p.id)) {
          ket.push({ id: p.id, ten: p.full_name, vaiTro: p.id === chu.manager_id ? 'quản lý trực tiếp' : 'lãnh đạo phụ trách' });
        }
      }
      return ket;
    },
  });
  const tenNguoi = useMemo(
    () => new Map((lienQuan ?? []).map((n) => [n.id, n.ten])),
    [lienQuan],
  );

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
            <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30">
              <Button size="sm" onClick={confirm}>Xác nhận hoàn thành</Button>
              <Button size="sm" variant="outline" onClick={() => setReturnOpen(true)}>Yêu cầu làm tiếp</Button>
            </div>
          )}

          {/*
            Dòng thời gian: log tiến độ và trao đổi chung MỘT mạch — cùng thành
            phần với bàn Chiêu thức 2 và PDTD, để cả ba bàn kể chuyện một kiểu.
            Cập nhật tiến độ là dòng «Báo cáo» đóng khung; tạo thẻ / đổi trạng
            thái / đổi deadline là dòng hệ thống hiện mảnh.
          */}
          {loading ? <p className="text-muted-foreground">Đang tải...</p> : (
            <Ct2DongThoiGian
              phamVi="THE_KANBAN"
              doiTuongId={card.id}
              baoCao={logs.map((l) => {
                const heThong = l.log_type !== 'progress_update' && l.log_type !== 'evidence_added'
                  && l.log_type !== 'completion_requested';
                return {
                  id: l.id,
                  luc: l.created_at,
                  nguoi: l.created_by,
                  tieu_de: (LOG_LABEL[l.log_type] || l.log_type)
                    + (l.old_status ? ` (${l.old_status} → ${l.new_status})` : ''),
                  phan_tram: l.progress_percent,
                  noi_dung: l.progress_note,
                  chi_tiet: [
                    ...(l.current_result ? [{ nhan: 'Kết quả', gia: l.current_result, mau: 'XANH' as const }] : []),
                    ...(l.next_step ? [{ nhan: 'Tiếp theo', gia: l.next_step }] : []),
                    ...(l.blocker_note ? [{ nhan: 'Vướng/Lý do', gia: l.blocker_note, mau: 'DO' as const }] : []),
                    ...(l.support_needed ? [{ nhan: 'Cần hỗ trợ', gia: l.support_needed, mau: 'DO' as const }] : []),
                    ...(l.evidence_text ? [{ nhan: 'Bằng chứng', gia: l.evidence_text }] : []),
                  ],
                  url: l.evidence_url ? (safeHref(l.evidence_url) ?? l.evidence_url) : null,
                  he_thong: heThong,
                };
              })}
              nguoiLienQuan={lienQuan ?? []}
              tenNguoi={tenNguoi}
              goiY="Góp ý, hỏi thêm, hoặc ghi nhận. VD «Phần này em làm tốt, thử áp dụng vào KH nào cụ thể chưa?»"
            />
          )}
        </div>
        <ReturnCardDialog cardId={card.id} open={returnOpen} onClose={() => setReturnOpen(false)} onSaved={onChanged} />
      </DialogContent>
    </Dialog>
  );
}
