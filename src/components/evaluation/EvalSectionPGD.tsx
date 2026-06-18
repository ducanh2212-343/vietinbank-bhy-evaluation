import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Shield } from 'lucide-react';

interface Props {
  pgdName?: string;
  comment?: string | null;
  status?: string | null; // pending | approved | returned
  reviewedAt?: string | null;
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: 'Chưa nhận xét', cls: 'bg-muted text-muted-foreground' },
  approved: { text: 'Đã duyệt', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  returned: { text: 'Trả lại', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function EvalSectionPGD({ pgdName, comment, status, reviewedAt }: Props) {
  if (!pgdName) return null;
  const s = STATUS_LABEL[status || 'pending'] || STATUS_LABEL.pending;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" /> Ban giám đốc phụ trách nhận xét
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <div>
            <span className="text-muted-foreground text-xs">PGĐ phụ trách: </span>
            <span className="font-medium">{pgdName}</span>
          </div>
          <Badge variant="outline" className={s.cls}>{s.text}</Badge>
          {reviewedAt && (
            <span className="text-xs text-muted-foreground">
              vào lúc {new Date(reviewedAt).toLocaleString('vi-VN')}
            </span>
          )}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Nhận xét của PGĐ</label>
          <Textarea
            value={comment || ''}
            readOnly
            placeholder="PGĐ chưa nhập nhận xét."
            className="min-h-[72px] bg-muted/40"
          />
        </div>
      </CardContent>
    </Card>
  );
}
