import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle2, XCircle, Loader2, Info } from 'lucide-react';
import { ReturnDialog } from './ReturnDialog';

const CLASS_OPTIONS = [
  { value: 'sao_mai', label: 'Sao Mai ⭐' },
  { value: 'sao_khue', label: 'Sao Khuê 🌟' },
  { value: 'sao_bang', label: 'Sao Băng 💫' },
  { value: 'sao_hom', label: 'Sao Hôm 🌙' },
];

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  draft: { text: 'Bản nháp', cls: 'bg-muted text-muted-foreground' },
  submitted: { text: 'Cán bộ đã nộp · Chờ TP rà soát', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  reviewed: { text: 'TP đã rà soát · Chờ PGĐ duyệt', cls: 'bg-sky-100 text-sky-800 border-sky-300' },
  approved: { text: 'Đã phê duyệt', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  returned: { text: 'Đã trả lại', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
  closed: { text: 'Đã đóng', cls: 'bg-muted text-muted-foreground' },
};

interface Props {
  classification: string;
  remark: string;
  managerConclusion: string;
  formStatus: string;
  evaluatorLevel: 'manager' | 'pgd' | 'director' | null;
  isManager: boolean;
  isAdmin: boolean;
  canConfirmReview: boolean;
  actionLoading?: boolean;
  /** Khi true, không render block 3 nút manager (sticky bar đã render) */
  hideManagerActions?: boolean;
  onClassificationChange: (v: string) => void;
  onRemarkChange: (v: string) => void;
  onConclusionChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onConfirmReview?: () => void;
  onReturnToEmployee?: (reason: string) => void;
  onApprove?: () => void;
  onReturnToManager?: (reason: string) => void;
}

export function EvalSectionG({
  classification, remark, managerConclusion, formStatus,
  evaluatorLevel, isManager, isAdmin, canConfirmReview, actionLoading,
  hideManagerActions,
  onClassificationChange, onRemarkChange, onConclusionChange, onStatusChange,
  onConfirmReview, onReturnToEmployee, onApprove, onReturnToManager,
}: Props) {

  const [returnEmpOpen, setReturnEmpOpen] = useState(false);
  const [returnMgrOpen, setReturnMgrOpen] = useState(false);
  const statusBadge = STATUS_LABEL[formStatus] || STATUS_LABEL.draft;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" /> G. Kết luận của lãnh đạo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Nhóm hiện tại</label>
            <Select value={classification} onValueChange={onClassificationChange} disabled={!isManager}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Chọn nhóm" /></SelectTrigger>
              <SelectContent>
                {CLASS_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Trạng thái biểu mẫu</label>
            {isAdmin ? (
              <Select value={formStatus} onValueChange={onStatusChange}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Bản nháp</SelectItem>
                  <SelectItem value="submitted">Đã nộp</SelectItem>
                  <SelectItem value="reviewed">Đã rà soát</SelectItem>
                  <SelectItem value="approved">Phê duyệt</SelectItem>
                  <SelectItem value="returned">Trả lại</SelectItem>
                  <SelectItem value="closed">Đóng</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="h-9 flex items-center">
                <Badge variant="outline" className={statusBadge.cls}>{statusBadge.text}</Badge>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Nhận xét ngắn</label>
          <Textarea value={remark} onChange={e => onRemarkChange(e.target.value)} className="min-h-[50px] text-sm" placeholder="Nhận xét tổng quan..." />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Kết luận / Khuyến nghị của lãnh đạo</label>
          <Textarea value={managerConclusion} onChange={e => onConclusionChange(e.target.value)} className="min-h-[60px] text-sm" placeholder="Kết luận và khuyến nghị..." disabled={!isManager} />
        </div>

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

        {evaluatorLevel === 'pgd' && (
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

        {evaluatorLevel === 'director' && (
          <div className="pt-2 border-t text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Bạn là Giám đốc giám sát — phần duyệt phiếu do PGĐ/TP phụ trách. Bạn vẫn có thể điều chỉnh nhóm sao bên dưới.
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
    </Card>
  );
}
