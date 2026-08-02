import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle2, XCircle, Loader2, Info, History } from 'lucide-react';
import { ReturnDialog } from './ReturnDialog';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  draft: { text: 'Bản nháp', cls: 'bg-muted text-muted-foreground' },
  submitted: { text: 'Cán bộ đã nộp · Chờ TP rà soát', cls: 'bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40' },
  reviewed: { text: 'TP đã rà soát · Chờ PGĐ duyệt', cls: 'bg-sky-100 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-500/40' },
  approved: { text: 'Đã phê duyệt', cls: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40' },
  returned: { text: 'Đã trả lại', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  closed: { text: 'Đã đóng', cls: 'bg-muted text-muted-foreground' },
};

interface Props {
  /** Giá trị CŨ đã nhập (admin_evaluations.remark / form_submissions.manager_comment) —
   *  từ 07/2026 chỉ hiển thị read-only; ô nhập mới là "Định hướng phát triển kỳ tới". */
  remark: string;
  managerConclusion: string;
  formStatus: string;
  evaluatorLevel: 'manager' | 'pgd' | 'director' | null;
  isAdmin: boolean;
  canConfirmReview: boolean;
  actionLoading?: boolean;
  /** Khi true, không render block 3 nút manager (sticky bar đã render) */
  hideManagerActions?: boolean;
  /** Luồng rút gọn: người đánh giá là cấp trên trực tiếp duy nhất (PGĐ/GĐ) → đánh giá + phê duyệt gộp */
  soleApprover?: boolean;
  onStatusChange: (v: string) => void;
  onConfirmReview?: () => void;
  onReturnToEmployee?: (reason: string) => void;
  onApprove?: () => void;
  onReturnToManager?: (reason: string) => void;
  onApproveDirect?: () => void;
  /** BGĐ/TCTH chuyển trả phiếu ĐÃ PHÊ DUYỆT về Trưởng phòng (bổ sung Sao / sửa nội dung) */
  onReturnApproved?: (reason: string) => void;
}

export function EvalSectionG({
  remark, managerConclusion, formStatus,
  evaluatorLevel, isAdmin, canConfirmReview, actionLoading,
  hideManagerActions, soleApprover,
  onStatusChange,
  onConfirmReview, onReturnToEmployee, onApprove, onReturnToManager, onApproveDirect,
  onReturnApproved,
}: Props) {

  const [returnEmpOpen, setReturnEmpOpen] = useState(false);
  const [returnMgrOpen, setReturnMgrOpen] = useState(false);
  const [returnApprovedOpen, setReturnApprovedOpen] = useState(false);
  const statusBadge = STATUS_LABEL[formStatus] || STATUS_LABEL.draft;

  // Nội dung nhập theo mẫu cũ — chỉ hiển thị để tham chiếu, không cho sửa
  // (114 kết luận + 18 nhận xét ngắn đã nhập ở các kỳ trước vẫn còn nguyên trong DB/BM01).
  const legacyItems: { label: string; text: string }[] = [
    managerConclusion.trim() ? { label: 'Kết luận / Khuyến nghị của lãnh đạo', text: managerConclusion } : null,
    remark.trim() ? { label: 'Nhận xét ngắn', text: remark } : null,
  ].filter(Boolean) as { label: string; text: string }[];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" /> G. Kết luận &amp; Phân nhóm của lãnh đạo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground">Trạng thái biểu mẫu</label>
          <div className="h-9 flex items-center">
            <Badge variant="outline" className={statusBadge.cls}>{statusBadge.text}</Badge>
          </div>
          {/* Ép trạng thái thủ công từng gây 2 sự cố (27/07: ép duyệt chốt level sai;
              ép "Trả lại" không lý do/đích trả) — thu gọn lại, chỉ dành xử lý sự cố dữ liệu. */}
          {isAdmin && (
            <details className="mt-1 rounded-md border border-dashed px-3 py-2">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Công cụ admin: ép trạng thái thủ công (không khuyến nghị)
              </summary>
              <div className="mt-2 space-y-2">
                <p className="text-xs text-destructive">
                  Ép trạng thái đi tắt quy trình: không ghi mốc rà soát/phê duyệt, không có lý do
                  trả lại cho cán bộ, và level có thể bị chốt theo mức tự đánh giá. Hãy dùng các
                  nút duyệt/trả phía dưới — chỉ ép khi xử lý sự cố dữ liệu. Cần chuyển trả phiếu
                  đã duyệt cho TP: dùng nút "Chuyển trả Trưởng phòng bổ sung" phía dưới, KHÔNG ép
                  trạng thái tại đây.
                </p>
                <Select value={formStatus} onValueChange={onStatusChange}>
                  <SelectTrigger className="h-9 sm:max-w-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Bản nháp</SelectItem>
                    <SelectItem value="submitted">Đã nộp</SelectItem>
                    <SelectItem value="reviewed">Đã rà soát</SelectItem>
                    <SelectItem value="approved">Phê duyệt</SelectItem>
                    <SelectItem value="returned">Trả lại</SelectItem>
                    <SelectItem value="closed">Đóng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </details>
          )}
        </div>

        {legacyItems.length > 0 && (
          <details className="rounded-md border bg-muted/30 px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Nhận xét đã nhập theo mẫu cũ ({legacyItems.length} mục — chỉ đọc)
            </summary>
            <div className="mt-2 space-y-2">
              {legacyItems.map((it) => (
                <div key={it.label} className="text-sm">
                  <span className="text-xs font-medium text-muted-foreground block">{it.label}</span>
                  <span className="whitespace-pre-wrap">{it.text}</span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Action buttons by role */}
        {evaluatorLevel === 'manager' && !hideManagerActions && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              size="sm"
              onClick={onConfirmReview}
              disabled={!canConfirmReview || formStatus !== 'submitted' || actionLoading}
              title={!canConfirmReview ? 'Cần đánh giá đủ skill lõi, 6 thái độ và đánh giá tổng thể trước khi rà soát.' : ''}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Xác nhận rà soát
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setReturnEmpOpen(true)}
              disabled={!['submitted', 'reviewed'].includes(formStatus) || actionLoading}
            >
              <XCircle className="w-4 h-4 mr-1" /> Trả lại cán bộ
            </Button>
            {!canConfirmReview && formStatus === 'submitted' && (
              <p className="w-full text-xs text-muted-foreground flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Cần đánh giá đủ skill lõi, 6 thái độ và viết đánh giá tổng thể trước khi rà soát.
              </p>
            )}
          </div>
        )}

        {soleApprover && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              size="sm"
              onClick={onApproveDirect}
              disabled={!canConfirmReview || !['submitted', 'reviewed'].includes(formStatus) || actionLoading}
              title={!canConfirmReview ? 'Cần đánh giá đủ skill lõi, 6 thái độ và nhận xét/kết luận trước khi phê duyệt.' : ''}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Đánh giá & phê duyệt
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setReturnEmpOpen(true)}
              disabled={!['submitted', 'reviewed'].includes(formStatus) || actionLoading}
            >
              <XCircle className="w-4 h-4 mr-1" /> Trả lại cán bộ
            </Button>
            <p className="w-full text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Bạn là cấp trên trực tiếp duy nhất — phiếu được rà soát và phê duyệt hoàn tất trong một bước.
            </p>
            {formStatus === 'returned' && (
              <p className="w-full text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                Phiếu đã trả lại cán bộ — hai nút tạm khoá cho tới khi cán bộ chỉnh sửa và nộp lại.
              </p>
            )}
          </div>
        )}

        {!soleApprover && evaluatorLevel === 'pgd' && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              size="sm"
              onClick={onApprove}
              disabled={formStatus !== 'reviewed' || actionLoading}
              title={formStatus !== 'reviewed' ? 'Cần TP rà soát trước khi PGĐ phê duyệt.' : ''}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
              Phê duyệt
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setReturnMgrOpen(true)}
              disabled={formStatus !== 'reviewed' || actionLoading}
            >
              <XCircle className="w-4 h-4 mr-1" /> Trả lại trưởng phòng
            </Button>
          </div>
        )}

        {!soleApprover && evaluatorLevel === 'director' && (
          <div className="pt-2 border-t text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Bạn là Giám đốc giám sát — phần duyệt phiếu do PGĐ/TP phụ trách. Bạn vẫn có thể điều chỉnh nhóm sao bên dưới.
          </div>
        )}

        {/* BGĐ/TCTH chuyển trả phiếu ĐÃ PHÊ DUYỆT về TP — đường quay lại đúng quy trình,
            thay cho ép trạng thái thủ công (từng gây sự cố phải sửa dữ liệu bằng migration). */}
        {isAdmin && evaluatorLevel !== null && formStatus === 'approved' && onReturnApproved && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setReturnApprovedOpen(true)}
              disabled={actionLoading}
            >
              <XCircle className="w-4 h-4 mr-1" /> Chuyển trả Trưởng phòng bổ sung
            </Button>
            <p className="w-full text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Phiếu quay về Trưởng phòng để bổ sung phân nhóm Sao / sửa nội dung, sau đó PGĐ phê duyệt lại.
            </p>
          </div>
        )}
      </CardContent>

      <ReturnDialog
        open={returnEmpOpen}
        onOpenChange={setReturnEmpOpen}
        loading={actionLoading}
        title="Trả lại cán bộ chỉnh sửa"
        description="Cán bộ sẽ nhận được phiếu kèm lý do trả lại để chỉnh sửa và nộp lại."
        onConfirm={(r) => { setReturnEmpOpen(false); onReturnToEmployee?.(r); }}
      />
      <ReturnDialog
        open={returnMgrOpen}
        onOpenChange={setReturnMgrOpen}
        loading={actionLoading}
        title="Trả lại trưởng phòng"
        description="Phiếu sẽ quay lại trưởng phòng để rà soát lại."
        onConfirm={(r) => { setReturnMgrOpen(false); onReturnToManager?.(r); }}
      />
      <ReturnDialog
        open={returnApprovedOpen}
        onOpenChange={setReturnApprovedOpen}
        loading={actionLoading}
        title="Chuyển trả phiếu đã phê duyệt cho Trưởng phòng"
        description="Phiếu quay lại Trưởng phòng để bổ sung phân nhóm Sao cho cán bộ và chỉnh sửa nội dung. Phân nhóm sao đã duyệt (nếu có) sẽ được mở khóa để đề xuất lại; phiếu phải được PGĐ phê duyệt lại sau khi Trưởng phòng cập nhật."
        onConfirm={(r) => { setReturnApprovedOpen(false); onReturnApproved?.(r); }}
      />
    </Card>
  );
}
