// Trang "Mẹo hay" — xem lại mọi tip tính năng dành cho vai trò của mình,
// kể cả tip đã đóng trên Tổng quan.
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useFeatureTips } from '@/hooks/useFeatureTips';

const NEW_BADGE_DAYS = 14;

export default function FeatureTipsPage() {
  const navigate = useNavigate();
  const { tips, loading } = useFeatureTips();

  if (loading) return <div className="p-6 text-muted-foreground">Đang tải...</div>;

  const isNew = (createdAt: string) =>
    Date.now() - new Date(createdAt).getTime() < NEW_BADGE_DAYS * 86400000;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Mẹo hay</h1>
        <p className="page-subtitle">Những tính năng hữu ích dành cho bạn — ghé lại đây bất cứ lúc nào</p>
      </div>

      {tips.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Chưa có mẹo nào dành cho bạn. Quay lại sau nhé!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip) => (
            <Card key={tip.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="flex-1">{tip.title}</span>
                  {isNew(tip.created_at) && (
                    <Badge className="text-[10px] shrink-0">Mới</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                <div className="text-xs text-muted-foreground flex-1 [&_p]:mb-1.5">
                  <ReactMarkdown>{tip.content}</ReactMarkdown>
                </div>
                {tip.cta_url && (
                  <Button size="sm" variant="outline" className="self-start" onClick={() => navigate(tip.cta_url!)}>
                    {tip.cta_label || 'Dùng thử'}
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
