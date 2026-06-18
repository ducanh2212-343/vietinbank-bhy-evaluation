import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquareQuote } from 'lucide-react';

export interface OverallReview {
  strengths?: string;
  improvements?: string;
  next_focus?: string;
  attitude_note?: string;
  upskill_note?: string;
  support_note?: string;
  conclusion?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
}

interface Props {
  manager?: OverallReview | null;
  pgd?: OverallReview | null;
  director?: OverallReview | null;
  managerCommentFallback?: string | null;
  pgdCommentFallback?: string | null;
}

const Field = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="text-sm whitespace-pre-wrap mt-0.5">{value}</p>
    </div>
  );
};

function ReviewBody({ review, fallback }: { review?: OverallReview | null; fallback?: string | null }) {
  const hasStructured = review && Object.values(review).some(v => typeof v === 'string' && v.trim());
  if (!hasStructured && !fallback) {
    return <p className="text-sm text-muted-foreground">Chưa có nhận xét.</p>;
  }
  if (!hasStructured && fallback) {
    return <p className="text-sm whitespace-pre-wrap">{fallback}</p>;
  }
  return (
    <div className="space-y-3">
      <Field label="Điểm mạnh cần phát huy" value={review?.strengths} />
      <Field label="Điểm cần cải thiện" value={review?.improvements} />
      <Field label="Trọng tâm phát triển kỳ tới" value={review?.next_focus} />
      <Field label="Ý kiến về lộ trình upskill" value={review?.upskill_note} />
      <Field label="Nhận xét thái độ / phối hợp" value={review?.attitude_note} />
      <Field label="Hỗ trợ / định hướng từ lãnh đạo" value={review?.support_note} />
      <Field label="Kết luận" value={review?.conclusion} />
      {(review?.reviewed_by_name || review?.reviewed_at) && (
        <p className="text-[11px] text-muted-foreground pt-1 border-t">
          {review?.reviewed_by_name || ''}{review?.reviewed_at ? ` • ${new Date(review.reviewed_at).toLocaleDateString('vi-VN')}` : ''}
        </p>
      )}
    </div>
  );
}

export function OverallReviewCard({ manager, pgd, director, managerCommentFallback, pgdCommentFallback }: Props) {
  const hasManager = manager || managerCommentFallback;
  const hasPgd = pgd || pgdCommentFallback;
  const hasDirector = director;

  const tabs: { value: string; label: string; node: React.ReactNode }[] = [];
  if (hasManager) tabs.push({ value: 'manager', label: 'Trưởng phòng / Phụ trách', node: <ReviewBody review={manager} fallback={managerCommentFallback} /> });
  if (hasPgd) tabs.push({ value: 'pgd', label: 'Phó giám đốc', node: <ReviewBody review={pgd} fallback={pgdCommentFallback} /> });
  if (hasDirector) tabs.push({ value: 'director', label: 'Giám đốc', node: <ReviewBody review={director} /> });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><MessageSquareQuote className="w-4 h-4" /> Đánh giá tổng thể & định hướng phát triển</CardTitle>
      </CardHeader>
      <CardContent>
        {tabs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có đánh giá tổng thể của lãnh đạo.</p>
        ) : tabs.length === 1 ? (
          tabs[0].node
        ) : (
          <Tabs defaultValue={tabs[0].value}>
            <TabsList className="flex-wrap h-auto gap-1">
              {tabs.map(t => <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm whitespace-normal text-left h-auto py-1.5">{t.label}</TabsTrigger>)}
            </TabsList>
            {tabs.map(t => <TabsContent key={t.value} value={t.value} className="mt-3">{t.node}</TabsContent>)}
          </Tabs>

        )}
      </CardContent>
    </Card>
  );
}
