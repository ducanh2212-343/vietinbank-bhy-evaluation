import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck } from 'lucide-react';

interface Props {
  name?: string;
  role?: string;
  status: string; // draft | submitted | approved | reviewed | returned
  reviewedAt?: string | null;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  draft: { text: 'Chưa nộp', cls: 'bg-muted text-muted-foreground' },
  submitted: { text: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  approved: { text: 'Đã duyệt', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  reviewed: { text: 'Đã duyệt', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  returned: { text: 'Đã trả lại', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function EvalSectionReviewer({ name, role, status, reviewedAt }: Props) {
  const s = STATUS_LABEL[status] || STATUS_LABEL.draft;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <UserCheck className="w-4 h-4" /> Người đánh giá phiếu
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div>
            <span className="text-muted-foreground text-xs">Họ và tên: </span>
            <span className="font-medium">{name || <span className="italic text-muted-foreground">Chưa chọn (sẽ chọn khi nộp)</span>}</span>
          </div>
          {role && <div className="text-xs text-muted-foreground">— {role}</div>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={s.cls}>{s.text}</Badge>
          {reviewedAt && (
            <span className="text-xs text-muted-foreground">
              vào lúc {new Date(reviewedAt).toLocaleString('vi-VN')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
