import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquareQuote, History } from 'lucide-react';

export interface OverallReviewValue {
  strengths?: string;
  improvements?: string;
  next_focus?: string;
  upskill_note?: string;
  attitude_note?: string;
  support_note?: string;
  conclusion?: string;
}

interface Props {
  title?: string;
  value: OverallReviewValue;
  onChange: (next: OverallReviewValue) => void;
  disabled?: boolean;
}

// Khối nhập RÚT GỌN (điều chỉnh 07/2026 theo yêu cầu BGĐ): chỉ còn MỘT ô định hướng.
// 6 field cũ vẫn nằm trong JSON *_overall_review (32 phiếu Quý II đã điền đủ 7 mục) —
// hiển thị read-only bên dưới để không mất tham chiếu; BM01/hồ sơ cá nhân in như cũ.
const FIELDS: { key: keyof OverallReviewValue; label: string; placeholder: string; rows?: number }[] = [
  { key: 'next_focus', label: 'Định hướng phát triển kỳ tới', placeholder: 'Kết luận ngắn và định hướng phát triển cán bộ trong kỳ tới…', rows: 3 },
];

// Nhãn các field cũ — chỉ dùng để hiển thị lại nội dung đã nhập (không cho sửa).
const LEGACY_LABELS: Record<string, string> = {
  strengths: 'Điểm mạnh cần phát huy',
  improvements: 'Điểm cần cải thiện',
  upskill_note: 'Ý kiến về lộ trình upskill',
  attitude_note: 'Nhận xét thái độ / tinh thần phối hợp',
  support_note: 'Hỗ trợ / định hướng từ lãnh đạo',
  conclusion: 'Kết luận / định hướng phát triển',
};

export function OverallReviewBlock({ title = 'Kết luận & định hướng phát triển', value, onChange, disabled }: Props) {
  const set = (k: keyof OverallReviewValue, v: string) => onChange({ ...value, [k]: v });
  const activeKeys = new Set(FIELDS.map(f => f.key as string));
  const legacyEntries = Object.entries(value || {}).filter(
    ([k, v]) => !activeKeys.has(k) && typeof v === 'string' && v.trim() !== '',
  );
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><MessageSquareQuote className="w-4 h-4" /> {title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {FIELDS.map(f => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs">{f.label}</Label>
            <Textarea
              value={value[f.key] || ''}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={f.rows || 2}
              disabled={disabled}
              className="text-sm"
            />
          </div>
        ))}

        {legacyEntries.length > 0 && (
          <details className="rounded-md border bg-muted/30 px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Nội dung đã nhập theo mẫu cũ ({legacyEntries.length} mục — chỉ đọc)
            </summary>
            <div className="mt-2 space-y-2">
              {legacyEntries.map(([k, v]) => (
                <div key={k} className="text-sm">
                  <span className="text-xs font-medium text-muted-foreground block">{LEGACY_LABELS[k] || k}</span>
                  <span className="whitespace-pre-wrap">{v as string}</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
