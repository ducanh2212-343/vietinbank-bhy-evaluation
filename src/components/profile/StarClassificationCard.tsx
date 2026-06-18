import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

export const STAR_LABELS: Record<string, string> = {
  sao_mai: 'Sao Mai',
  sao_khue: 'Sao Khuê',
  sao_bang: 'Sao Băng',
  sao_hom: 'Sao Hôm',
};
export const STAR_CSS: Record<string, string> = {
  sao_mai: 'star-mai',
  sao_khue: 'star-khue',
  sao_bang: 'star-bang',
  sao_hom: 'star-hom',
};

export interface StarRecord {
  star_group: string | null;
  reason_text: string | null;
  direction_text: string | null;
  approval_status: string;
  visible_to_employee: boolean;
  approved_at: string | null;
  evaluator_name?: string;
  approver_name?: string;
}

interface Props {
  /** if true, viewer is the evaluated person — only render when allowed */
  viewerIsEmployee: boolean;
  record: StarRecord | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
};

export function StarClassificationCard({ viewerIsEmployee, record }: Props) {
  // Employee view: only show if approved + visible
  if (viewerIsEmployee) {
    if (!record || record.approval_status !== 'approved' || !record.visible_to_employee || !record.star_group) {
      return null;
    }
  }
  if (!record) return null;

  const groupKey = record.star_group || '';
  const label = STAR_LABELS[groupKey];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Star className="w-4 h-4" /> Phân nhóm cán bộ theo ma trận hiệu quả – kỹ năng/thái độ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center flex-wrap gap-2">
          {label ? (
            <span className={`level-badge ${STAR_CSS[groupKey]}`}>{label}</span>
          ) : (
            <Badge variant="outline">Chưa đánh giá</Badge>
          )}
          {!viewerIsEmployee && (
            <>
              <Badge variant="outline" className="text-[10px]">{STATUS_LABEL[record.approval_status] || record.approval_status}</Badge>
              {record.approval_status === 'approved' && (
                <Badge variant={record.visible_to_employee ? 'default' : 'secondary'} className="text-[10px]">
                  {record.visible_to_employee ? 'Đã cho cán bộ xem' : 'Không hiển thị cho cán bộ'}
                </Badge>
              )}
            </>
          )}
        </div>
        {record.reason_text && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Lý do phân nhóm</p>
            <p className="text-sm whitespace-pre-wrap mt-0.5">{record.reason_text}</p>
          </div>
        )}
        {record.direction_text && (
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Định hướng quản trị / phát triển</p>
            <p className="text-sm whitespace-pre-wrap mt-0.5">{record.direction_text}</p>
          </div>
        )}
        {!viewerIsEmployee && (record.evaluator_name || record.approver_name) && (
          <p className="text-[11px] text-muted-foreground pt-2 border-t">
            {record.evaluator_name && <>Người chấm: <strong>{record.evaluator_name}</strong></>}
            {record.evaluator_name && record.approver_name && ' • '}
            {record.approver_name && <>Người duyệt: <strong>{record.approver_name}</strong></>}
            {record.approved_at && ` • ${new Date(record.approved_at).toLocaleDateString('vi-VN')}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
