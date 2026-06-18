import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquareQuote } from 'lucide-react';

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

const FIELDS: { key: keyof OverallReviewValue; label: string; placeholder: string; rows?: number }[] = [
  { key: 'strengths', label: 'Điểm mạnh cần phát huy', placeholder: 'Cán bộ có thế mạnh gì cần phát huy…', rows: 2 },
  { key: 'improvements', label: 'Điểm cần cải thiện', placeholder: 'Những điểm cần cải thiện…', rows: 2 },
  { key: 'next_focus', label: 'Trọng tâm phát triển kỳ tới', placeholder: 'Định hướng phát triển kỳ tới…', rows: 2 },
  { key: 'upskill_note', label: 'Ý kiến về lộ trình upskill', placeholder: 'Nhận xét về lộ trình upskill cán bộ đã chọn…', rows: 2 },
  { key: 'attitude_note', label: 'Nhận xét thái độ / tinh thần phối hợp', placeholder: 'Nhận xét về thái độ làm việc…', rows: 2 },
  { key: 'support_note', label: 'Hỗ trợ / định hướng từ lãnh đạo', placeholder: 'Lãnh đạo sẽ hỗ trợ gì…', rows: 2 },
  { key: 'conclusion', label: 'Kết luận / định hướng phát triển', placeholder: 'Kết luận tổng thể…', rows: 2 },
];

export function OverallReviewBlock({ title = 'Đánh giá tổng thể & định hướng phát triển', value, onChange, disabled }: Props) {
  const set = (k: keyof OverallReviewValue, v: string) => onChange({ ...value, [k]: v });
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
      </CardContent>
    </Card>
  );
}
